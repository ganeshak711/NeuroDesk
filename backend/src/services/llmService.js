import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Builds a grounded system prompt from retrieved RAG context chunks.
 */
function buildSystemPrompt(contextChunks) {
  if (!contextChunks || contextChunks.length === 0) {
    return "You are a helpful workspace assistant. No relevant context was found for this question. Answer briefly and say you don't have enough context from the workspace.";
  }

  const context = contextChunks
    .map((c, i) => `[${i + 1}] (${c.sourceType}) ${c.text}`)
    .join("\n\n");

  return [
    "You are an AI assistant embedded in a team collaboration workspace.",
    "Answer the user's question using ONLY the context below.",
    "If the context doesn't contain the answer, say so honestly.",
    "Cite sources inline like [1], [2].",
    "",
    "=== CONTEXT ===",
    context,
    "=== END CONTEXT ===",
  ].join("\n");
}

export async function streamAnswer({ question, contextChunks, onToken }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt =
    buildSystemPrompt(contextChunks) + "\n\nUser Question:\n" + question;

  const stream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
  });

  let fullText = "";

  for await (const chunk of stream) {
    const text = chunk.text || "";
    fullText += text;
    onToken(text);
  }

  return fullText;
}
