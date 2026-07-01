import Workspace from "../models/Workspace.js";

const RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };

/**
 * Loads the workspace from :workspaceId (or body.workspace) and checks the
 * requesting user's role meets `minRole`. Attaches req.workspace + req.role.
 */
export function requireWorkspaceRole(minRole = "viewer") {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspace || req.query.workspace;
      if (!workspaceId) {
        return res.status(400).json({ error: "workspaceId is required" });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      const role = workspace.roleOf(req.user._id);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this workspace" });
      }

      if (RANK[role] < RANK[minRole]) {
        return res.status(403).json({ error: `Requires role '${minRole}' or higher` });
      }

      req.workspace = workspace;
      req.role = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
