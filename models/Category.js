const { Schema, model } = require('mongoose');

const CategorySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = model('Category', CategorySchema);
