// models/Tag.js
import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Tag name must be at least 2 characters"],
      maxlength: [30, "Tag name must be at most 30 characters"],
    },
    color: {
      type: String,
      default: "#3B82F6",
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #3B82F6)"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Tag || mongoose.model("Tag", tagSchema);