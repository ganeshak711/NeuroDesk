import { pipeline } from "@xenova/transformers";

/**
 * Lazily-loaded, cached embedding pipeline. Uses a small open embedding
 * model (all-MiniLM-L6-v2, 384-dim) that runs locally -- no API key,
 * no external embedding API call needed.
 */
let embedderPromise = null;

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedderPromise;
}

/**
 * Embeds a single string of text into a 384-dim vector (mean-pooled, normalized).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/**
 * Embeds many strings in one batch (sequentially under the hood, but one call site).
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts) {
  const results = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}

/**
 * Splits long text into ~chunkSize-word chunks with a small overlap, so long
 * documents get multiple retrievable, embeddable pieces instead of one blob.
 */
export function chunkText(text, chunkSize = 180, overlap = 30) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }
  return chunks;
}
