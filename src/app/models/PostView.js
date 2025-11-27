// models/PostView.js
import mongoose from "mongoose";

const PostViewSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost',
    required: true
  },
  userId: {
    type: String, // يمكن أن يكون ID المستخدم أو IP العنوان
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// لمنع المشاهدات المكررة من نفس المستخدم لنفس المقال
PostViewSchema.index({ postId: 1, userId: 1 }, { unique: true });

export default mongoose.models.PostView || mongoose.model("PostView", PostViewSchema);