import mongoose from "mongoose";

const ROLES = ["owner", "admin", "member", "viewer"];

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ROLES, default: "member" },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

workspaceSchema.methods.roleOf = function roleOf(userId) {
  if (this.owner.equals(userId)) return "owner";
  const m = this.members.find((m) => m.user.equals(userId));
  return m ? m.role : null;
};

export const WORKSPACE_ROLES = ROLES;
export default mongoose.model("Workspace", workspaceSchema);
