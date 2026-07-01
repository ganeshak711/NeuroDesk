import express from "express";
import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/roleCheck.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// List workspaces the current user belongs to (as owner or member)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    }).sort({ updatedAt: -1 });
    res.json({ workspaces });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const workspace = await Workspace.create({
      name,
      description: description || "",
      owner: req.user._id,
      members: [{ user: req.user._id, role: "owner" }],
    });

    res.status(201).json({ workspace });
  })
);

router.get(
  "/:workspaceId",
  requireWorkspaceRole("viewer"),
  asyncHandler(async (req, res) => {
    const workspace = await Workspace.findById(req.params.workspaceId).populate(
      "members.user",
      "name email avatarColor"
    );
    res.json({ workspace, role: req.role });
  })
);

router.patch(
  "/:workspaceId",
  requireWorkspaceRole("admin"),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (name !== undefined) req.workspace.name = name;
    if (description !== undefined) req.workspace.description = description;
    await req.workspace.save();
    res.json({ workspace: req.workspace });
  })
);

router.delete(
  "/:workspaceId",
  requireWorkspaceRole("owner"),
  asyncHandler(async (req, res) => {
    await req.workspace.deleteOne();
    res.status(204).send();
  })
);

// Invite/add a member by email
router.post(
  "/:workspaceId/members",
  requireWorkspaceRole("admin"),
  asyncHandler(async (req, res) => {
    const { email, role = "member" } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ error: "No user found with that email" });

    const alreadyMember = req.workspace.members.some((m) => m.user.equals(user._id));
    if (alreadyMember) return res.status(409).json({ error: "User is already a member" });

    req.workspace.members.push({ user: user._id, role });
    await req.workspace.save();
    res.status(201).json({ workspace: req.workspace });
  })
);

router.patch(
  "/:workspaceId/members/:userId",
  requireWorkspaceRole("admin"),
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    const member = req.workspace.members.find((m) => m.user.equals(req.params.userId));
    if (!member) return res.status(404).json({ error: "Member not found" });

    member.role = role;
    await req.workspace.save();
    res.json({ workspace: req.workspace });
  })
);

router.delete(
  "/:workspaceId/members/:userId",
  requireWorkspaceRole("admin"),
  asyncHandler(async (req, res) => {
    req.workspace.members = req.workspace.members.filter(
      (m) => !m.user.equals(req.params.userId)
    );
    await req.workspace.save();
    res.status(204).send();
  })
);

export default router;
