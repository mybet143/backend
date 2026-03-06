const mongoose = require("mongoose");

const marketControlSchema = new mongoose.Schema({
  marketName: { type: String, required: true, unique: true },
  isVisible: { type: Boolean, default: true }
});

module.exports = mongoose.model("MarketControl", marketControlSchema);