import express from "express";
import Document from "../models/Document.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/roleCheck.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { indexSource, removeSourceIndex } from "../services/ragService.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

router.get(
  "/",
  requireWorkspaceRole("viewer"),
  asyncHandler(async (req, res) => {
    const docs = await Document.find({ workspace: req.workspace._id }).sort({ updatedAt: -1 });
    res.json({ documents: docs });
  })
);

router.get(
  "/:id",
  requireWorkspaceRole("viewer"),
  asyncHandler(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, workspace: req.workspace._id });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json({ document: doc });
  })
);

router.post(
  "/",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    const doc = await Document.create({
      workspace: req.workspace._id,
      title: title || "Untitled",
      content: content || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Fire-and-forget indexing so RAG stays fresh; don't block the response on it.
    indexSource({
      workspaceId: req.workspace._id,
      sourceType: "Document",
      sourceId: doc._id,
      text: `${doc.title}\n${doc.content}`,
    }).catch((err) => console.error("[rag] index error (document create):", err));

    res.status(201).json({ document: doc });
  })
);

router.patch(
  "/:id",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, workspace: req.workspace._id });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { title, content } = req.body;
    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    doc.updatedBy = req.user._id;
    await doc.save();

    indexSource({
      workspaceId: req.workspace._id,
      sourceType: "Document",
      sourceId: doc._id,
      text: `${doc.title}\n${doc.content}`,
    }).catch((err) => console.error("[rag] index error (document update):", err));

    res.json({ document: doc });
  })
);

router.delete(
  "/:id",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, workspace: req.workspace._id });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    await removeSourceIndex({ sourceType: "Document", sourceId: doc._id });
    res.status(204).send();
  })
);

export default router;
