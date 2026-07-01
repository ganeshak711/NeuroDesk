import express from "express";
import Task from "../models/Task.js";
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
    const { status, assignee } = req.query;
    const filter = { workspace: req.workspace._id };
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).populate("assignee", "name email avatarColor");
    res.json({ tasks });
  })
);

router.post(
  "/",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const { title, description, status, priority, assignee, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const task = await Task.create({
      workspace: req.workspace._id,
      title,
      description: description || "",
      status,
      priority,
      assignee: assignee || null,
      dueDate: dueDate || null,
      createdBy: req.user._id,
    });

    indexSource({
      workspaceId: req.workspace._id,
      sourceType: "Task",
      sourceId: task._id,
      text: `${task.title}\n${task.description}`,
    }).catch((err) => console.error("[rag] index error (task create):", err));

    res.status(201).json({ task });
  })
);

router.patch(
  "/:id",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, workspace: req.workspace._id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const fields = ["title", "description", "status", "priority", "assignee", "dueDate"];
    for (const f of fields) {
      if (req.body[f] !== undefined) task[f] = req.body[f];
    }
    await task.save();

    indexSource({
      workspaceId: req.workspace._id,
      sourceType: "Task",
      sourceId: task._id,
      text: `${task.title}\n${task.description}`,
    }).catch((err) => console.error("[rag] index error (task update):", err));

    res.json({ task });
  })
);

router.delete(
  "/:id",
  requireWorkspaceRole("member"),
  asyncHandler(async (req, res) => {
    const task = await Task.findOneAndDelete({ _id: req.params.id, workspace: req.workspace._id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    await removeSourceIndex({ sourceType: "Task", sourceId: task._id });
    res.status(204).send();
  })
);

export default router;
