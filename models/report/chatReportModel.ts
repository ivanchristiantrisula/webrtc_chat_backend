import { ObjectID } from "bson";
import { Timestamp } from "mongodb";
import { arrayify } from "tslint/lib/utils";

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: {
    type: ObjectID,
    required: true,
  },
  reportee: {
    type: ObjectID,
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
