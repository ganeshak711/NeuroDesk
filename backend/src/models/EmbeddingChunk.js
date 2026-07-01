import mongoose from "mongoose";

/**
 * Each row is one retrievable "chunk" of team knowledge -- a document section,
 * a task description, or a comment -- with its embedding vector attached.
 *
 * This collection is what MongoDB Atlas Vector Search indexes against.
 * Create the search index (once, in Atlas UI or via mongosh) as:
 *
 *  {
 *    "fields": [
 *      { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
 *      { "type": "filter", "path": "workspace" }
 *    ]
 *  }
 *  Name it: "vector_index"  (see services/ragService.js)
 */
const embeddingChunkSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    sourceType: { type: String, enum: ["Document", "Task", "Comment"], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true }, // 384-dim vector (all-MiniLM-L6-v2)
  },
  { timestamps: true }
);

embeddingChunkSchema.index({ sourceType: 1, sourceId: 1 });

export default mongoose.model("EmbeddingChunk", embeddingChunkSchema);
