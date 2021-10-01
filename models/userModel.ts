import { ObjectID } from "mongodb";
import { arrayify } from "tslint/lib/utils";

const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: false,
  },
  friends: {
    type: Array,
    required: false,
  },
  blocks: {
    type: Array,
    required: false,
  },
  pendings: {
    type: Array,
    required: false,
  },
  MBTI: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    required: false,
  },
  profilepicture: {
    type: String,
    required: true,
  },
  isBanned: {
    type: Boolean,
    required: false,
  },
  bannedDate: {
    type: Date,
    required: false,
  },
  banReportID: {
    type: ObjectID,
    required: false,
  },
});

userSchema.plugin(uniqueValidator, {
  message: "This email has already been registered",
});

module.exports = mongoose.model("User", userSchema);
