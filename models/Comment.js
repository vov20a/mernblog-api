const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      unique: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    likes: {
      count: {
        type: Number,
        default: 0,
      },
      usersArray: [{ type: String }],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Comment', commentSchema);
