const { ObjectId } = require("mongodb");

//@ts-ignore
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: {
    type: ObjectId,
    required: true,
  },
  reportee: {
    type: ObjectId,
    required: true,
  },
  type: {
    //chat or profile
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  proof: {
    type: Object,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    require: true,
  },
  closedDate: {
    type: Date,
    required: false,
  },
  isReporteeBanned: {
    type: Boolean,
    required: false,
  },
});

module.exports = mongoose.model("Report", reportSchema);
