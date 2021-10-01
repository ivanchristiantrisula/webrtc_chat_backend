import express from "express";
const bcrypt = require("bcrypt");
let decodeToken = require("../library/decodeToken");
import _ from "underscore";
let Report = require("../models/report/chatReportModel");
let User = require("../models/userModel");
import dotenv from "dotenv";
import { ObjectID } from "mongodb";

let app = express.Router();
dotenv.config();

app.post("/create", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);

    if (user) {
      let newReport = new Report({
        reporter: req.body.reporter,
        reportee: req.body.reportee,
        type: req.body.proof ? "Chat" : "Profile",
        category: req.body.category,
        proof: req.body.proof || null,
        description: req.body.description,
        status: "Open",
        timestamp: new Date(),
      });

      newReport.save(function (err, u) {
        if (err) return res.status(500).send({ errors: [err.message] });
        return res.status(200).send("OK");
      });
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.get("/getAllReports", async (req, res) => {
  let reports = await Report.find({});

  res.status(200).send(reports);
});

app.post("/closeReport", (req, res) => {
  if (req.body.banReportee) {
    User.updateOne(
      { _id: req.body.reporteeID },
      {
        $set: {
          isBanned: true,
          bannedDate: new Date(),
          banReportID: new ObjectID(req.body.reportID),
        },
      },
      (err, docs) => {
        if (err) res.status(500).send({ errors: [err] });
        return;
      }
    );
  }
  Report.updateOne(
    { _id: req.body.reportID },
    {
      $set: {
        status: "Closed",
        closedDate: new Date(),
        isReporteeBanned: req.body.banReportee,
      },
    },
    (err, docs) => {
      console.log(docs);
      if (err) res.status(500).send({ errors: [err] });
      return;
    }
  );

  res.status(200).send("Success");
});

module.exports = app;
