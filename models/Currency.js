const { Schema, model } = require('mongoose');

const CurrencySchema = new Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    required: true,
  },
  base: {
    type: Boolean,
    default: false,
  },
});

module.exports = model('Currency', CurrencySchema);
