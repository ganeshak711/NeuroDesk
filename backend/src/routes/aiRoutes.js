import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/roleCheck.js";
import { retrieveContext, retrieveContextFallback } from "../services/ragService.js";
import { streamAnswer } from "../services/llmService.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

/**
 * GET /api/ai/:workspaceId/ask?q=...
 *
 * Server-Sent Events stream. Emits:
 *   event: sources   -> the retrieved context chunks used for grounding
 *   event: token      -> incremental text tokens from the LLM
 *   event: done        -> stream finished
 *   event: error        -> something went wrong
 *
 * Uses EventSource-compatible GET + query param (not POST) since browsers'
 * native EventSource API can't set headers/bodies on POST requests.
 */
router.get("/:workspaceId/ask", requireWorkspaceRole("viewer"), async (req, res) => {
  const question = (req.query.q || "").toString().trim();
  if (!question) {
    return res.status(400).json({ error: "Query param 'q' is required" });
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable proxy buffering (nginx etc.)
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);

  try {
    let chunks;
    try {
      chunks = await retrieveContext({ workspaceId: req.workspace._id, query: question, topK: 5 });
    } catch (err) {
      // Atlas Vector Search index missing/unavailable (e.g. local dev) -> fall back
      console.warn("[rag] $vectorSearch failed, using in-process fallback:", err.message);
      chunks = await retrieveContextFallback({ workspaceId: req.workspace._id, query: question, topK: 5 });
    }

    send("sources", {
      chunks: chunks.map((c) => ({
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        text: c.text,
        score: c.score,
      })),
    });

    await streamAnswer({
      question,
      contextChunks: chunks,
      onToken: (text) => send("token", { text }),
    });

    send("done", { ok: true });
  } catch (err) {
    console.error("[ai] streaming error:", err);
    send("error", { error: err.message || "Something went wrong generating the answer" });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }

  req.on("close", () => clearInterval(heartbeat));
});

export default router;
