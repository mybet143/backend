const mongoose = require("mongoose");

const buttonSchema = new mongoose.Schema({
  text: String,
  link: String,
  color: { type: String, default: "#16a34a" }
});

const imageSchema = new mongoose.Schema({
  url: String,
  focus: { type: String, default: "center center" }
});

const bannerSchema = new mongoose.Schema(
  {
    title: String,
    desktop: imageSchema,
    tablet: imageSchema,
    mobile: imageSchema,
    buttons: [buttonSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);