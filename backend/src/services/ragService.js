import mongoose from "mongoose";
import EmbeddingChunk from "../models/EmbeddingChunk.js";
import { embedText, embedBatch, chunkText } from "./embeddingService.js";

const VECTOR_INDEX_NAME = "vector_index";

/**
 * (Re)indexes a piece of source content (a Document, Task, or Comment) into
 * the EmbeddingChunk collection. Deletes any previous chunks for that source
 * first, so this is safe to call on both create AND update.
 */
export async function indexSource({ workspaceId, sourceType, sourceId, text }) {
  await EmbeddingChunk.deleteMany({ sourceType, sourceId });

  const cleanText = (text || "").trim();
  if (!cleanText) return;

  const pieces = chunkText(cleanText);
  if (pieces.length === 0) return;

  const vectors = await embedBatch(pieces);

  const docs = pieces.map((piece, i) => ({
    workspace: workspaceId,
    sourceType,
    sourceId,
    text: piece,
    embedding: vectors[i],
  }));

  await EmbeddingChunk.insertMany(docs);
}

/**
 * Removes all indexed chunks for a deleted source (Document/Task/Comment).
 */
export async function removeSourceIndex({ sourceType, sourceId }) {
  await EmbeddingChunk.deleteMany({ sourceType, sourceId });
}

/**
 * Retrieves the top-K most relevant chunks for a query within a workspace,
 * using MongoDB Atlas Vector Search ($vectorSearch aggregation stage).
 *
 * Requires an Atlas Search vector index named "vector_index" on the
 * EmbeddingChunk collection (see model file for the index definition).
 */
export async function retrieveContext({ workspaceId, query, topK = 5 }) {
  const queryVector = await embedText(query);

  const results = await EmbeddingChunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(topK * 20, 100),
        limit: topK,
        filter: { workspace: new mongoose.Types.ObjectId(workspaceId) },
      },
    },
    {
      $project: {
        text: 1,
        sourceType: 1,
        sourceId: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
}

/**
 * Fallback retrieval for local dev / clusters without Atlas Search enabled
 * (e.g. local mongod). Computes cosine similarity in-process. Not meant for
 * large collections -- it's a dev-only convenience, not a production path.
 */
export async function retrieveContextFallback({ workspaceId, query, topK = 5 }) {
  const queryVector = await embedText(query);
  const chunks = await EmbeddingChunk.find({ workspace: workspaceId }).lean();

  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  };

  return chunks
    .map((c) => ({ ...c, score: cosine(queryVector, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
