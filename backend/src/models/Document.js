import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "Untitled" },
    content: { type: String, default: "" }, // markdown/plain text body
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

documentSchema.index({ workspace: 1, title: 1 });

export default mongoose.model("Document", documentSchema);
