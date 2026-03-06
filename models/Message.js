const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    marketName: String,
    username: String,
    message: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);