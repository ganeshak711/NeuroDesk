import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    // Polymorphic reference: a comment belongs to either a Document or a Task
    targetType: { type: String, enum: ["Document", "Task"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

commentSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("Comment", commentSchema);
