import express from "express";
import Comment from "../models/Comment.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/roleCheck.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { indexSource, removeSourceIndex } from "../services/ragService.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// List comments for a given target (Document or Task)
router.get(
  "/",
  requireWorkspaceRole("viewer"),
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({ error: "targetType and targetId query params are required" });
    }
    const comments = await Comment.find({
      workspace: req.workspace._id,
      targetType,
      targetId,
    })
      .sort({ createdAt: 1 })
      .populate("author", "name email avatarColor");
    res.json({ comments });
  })
);

router.post(
  "/",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const { targetType, targetId, body } = req.body;
    if (!targetType || !targetId || !body) {
      return res.status(400).json({ error: "targetType, targetId, and body are required" });
    }

    const comment = await Comment.create({
      workspace: req.workspace._id,
      targetType,
      targetId,
      author: req.user._id,
      body,
    });

    indexSource({
      workspaceId: req.workspace._id,
      sourceType: "Comment",
      sourceId: comment._id,
      text: comment.body,
    }).catch((err) => console.error("[rag] index error (comment create):", err));

    res.status(201).json({ comment });
  })
);

router.delete(
  "/:id",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const comment = await Comment.findOneAndDelete({ _id: req.params.id, workspace: req.workspace._id });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    await removeSourceIndex({ sourceType: "Comment", sourceId: comment._id });
    res.status(204).send();
  })
);

export default router;
