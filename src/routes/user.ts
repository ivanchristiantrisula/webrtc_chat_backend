import express from "express";
const { MongoClient } = require("mongodb");
let mongoose = require("mongoose");
import dotenv from "dotenv";
let User = require("../models/userModel");
let Report = require("../models/report/chatReportModel");
const bcrypt = require("bcrypt");
let decodeToken = require("../library/decodeToken");
import _ from "underscore";
import multer from "multer";
import path from "path";
import fs from "fs";
import MBTIComp from "../library/compability.json";
import { ObjectId } from "mongodb";

let app = express.Router();
dotenv.config();

app.post("/register", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let confirm = req.body.confirm;
  let name = req.body.name;
  let username = req.body.username;

  if (password === confirm) {
    let newUser = new User({
      name: name,
      password: await bcrypt.hash(password, 10),
      email: email,
      username: username,
      profilepicture: "default",
      isBanned: true,
      bannedDate: null,
    });
    newUser.save(function (err, u) {
      if (err) return res.status(400).send({ errors: [err.message] });
      return res.status(200).send("OK");
    });
  } else {
    res.status(400).send({
      errors: ["Confirm Password doesn't match Password"],
    });
  }
});

app.post("/login", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.findOne({ email: new RegExp(email, "i") }, function (err, doc) {
    if (err) return res.status(400).send({ errors: err });
    if (doc != null) {
      bcrypt.compare(password, doc.password, (err, result) => {
        if (err) return console.log(err);
        if (result) {
          let userData = {};
          userData["id"] = doc.id;
          userData["name"] = doc.name;
          userData["email"] = doc.email;
          userData["username"] = doc.username;
          userData["MBTI"] = doc.MBTI;
          userData["bio"] = doc.bio;
          userData["profilepicture"] = doc.profilepicture;
          let token = require("../library/generateToken")(userData);

          res.cookie("token", token, { httpOnly: false });
          res.status(200).send({
            user: userData,
          });
        } else {
          res.status(401).send({ errors: ["Wrong email or password"] });
        }
      });
    } else {
      res.status(401).send({ errors: ["User not found!"] });
    }
  });
});

app.get("/findUser", async (req, res) => {
  let keyword = req.query.keyword;

  User.findOne(
    { username: new RegExp("^" + keyword + "$", "i") },
    function (err, doc) {
      if (!err) {
        res.status(200).send(new Array(doc));
      } else {
        res.status(401).send(err);
      }
    }
  );
});

app.post("/addFriend", async (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);
    let target = req.body.user;
    if (user) {
      User.find(
        [
          { id: target.id },
          {
            $nor: [{ "friends.id": user.id }, { "pendings.id": user.id }],
          },
        ],
        (err, doc) => {
          if (_.isEmpty(doc)) {
            let userData = {
              id: user.id,
              name: user.name,
              email: user.email,
              username: user.username,
              profilepicture: user.profilepicture,
            };
            User.updateOne(
              { id: target.id },
              { $addToSet: { pendings: userData } },
              (err, result) => {
                console.log(result);
              }
            );
            res.status(200).send("Success");
          } else {
            res.status(401).send({ errors: "Already in friendlist" });
          }
        }
      );
    } else {
      res.status(401).send({ errors: "Invalide Token" });
    }
  } else {
    res.status(401).send({ errors: "No Cookie :(" });
  }
});

app.get("/getPendingFriends", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);
    if (user) {
      User.findOne({ id: user.id }, "pendings", (err, docs) => {
        if (err) {
          console.log(err);
          res.status(500).send({ errors: err });
        }

        res.status(200).send(docs);
      });
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.get("/getFriends", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);
    if (user) {
      User.findOne({ id: user.id }, "friends", (err, docs) => {
        if (err) {
          console.log(err);
          res.status(500).send({ errors: err });
        }

        res.status(200).send(docs);
      });
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.get("/getBlocks", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);
    if (user) {
      User.findOne({ id: user.id }, "blocks", (err, docs) => {
        if (err) {
          console.log(err);
          res.status(500).send({ errors: err });
        }

        res.status(200).send(docs);
      });
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.post("/acceptFriendRequest", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);
    let target = req.body.target;

    if (user) {
      let userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        profilepicture: user.profilepicture,
      };

      User.updateOne(
        { id: user.id },
        { $pull: { pendings: { id: target.id } } },
        (err, docs) => {
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );
      User.updateOne(
        { id: target.id },
        { $addToSet: { friends: userData } },
        (err, result) => {
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );

      User.updateOne(
        { id: user.id },
        { $addToSet: { friends: target } },
        (err, result) => {
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );

      res.status(200).send("Success");
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.post("/rejectFriendRequest", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);
    let target = req.body.target;

    if (user) {
      let userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      };

      User.updateOne(
        { id: user.id },
        { $pull: { pendings: { id: target.id } } },
        (err, docs) => {
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );

      res.status(200).send("Success");
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.post("/updateMBTI", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);

    if (user) {
      let userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      };

      User.updateOne(
        { id: user.id },
        { $set: { MBTI: req.body.type } },
        (err, docs) => {
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );

      res.status(200).send("Success");
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.post("/updateProfile", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);

    if (user) {
      console.log(req.body);
      let userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      };

      User.updateOne(
        { id: user.id },
        { $set: { name: req.body.name, bio: req.body.bio } },
        (err, docs) => {
          console.log(docs);
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );

      // let payload = {};
      // payload["id"] = doc.id;
      // payload["name"] = doc.name;
      // payload["email"] = doc.email;
      // payload["username"] = doc.username;
      // payload["MBTI"] = doc.MBTI;
      // payload["bio"] = doc.bio;
      // let token = require("../library/generateToken")(userData);

      //res.cookie("token", token, { httpOnly: false });

      res.status(200).send({
        user: userData,
      });
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.post("/changePassword", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);

    if (user) {
      let userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      };

      if (req.body.new != req.body.confirm) {
        res.status(400).send("Confirm password doesnt match");
        return;
      }

      User.findOne({ id: user.id }, function (err, doc) {
        if (!err) {
          bcrypt.compare(req.body.old, doc.password, async (err, result) => {
            if (err) return console.log(err);
            if (result) {
              let hashedPass = await bcrypt.hash(req.body.new, 10);
              User.updateOne(
                { id: user.id },
                { $set: { password: hashedPass } },
                (err, docs) => {
                  if (err) {
                    res.status(500).send({ errors: [err] });
                    return;
                  } else {
                    res.status(200).send("Success");
                    return;
                  }
                }
              );
            } else {
              res.status(401).send("Old password doesn't match");
              return;
            }
          });
        } else {
          res.status(401).send(err);
          return;
        }
      });
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

app.get("/getFriendsRecommendation", (req, res) => {
  if (req.cookies) {
    let user = decodeToken(req.cookies.token);

    if (user) {
      let x;
      User.findById(user.id, function (err, docs) {
        x = docs;
      });
      User.find(
        {
          $and: [
            { MBTI: { $in: MBTIComp[user.MBTI] } },
            { id: { $nin: [new ObjectId(user.id)] } },
          ],
        },
        function (err, docs) {
          let result = docs.map(function (user) {
            let found = user.friends.find((element) => element.id == x.id);
            //console.log(user);
            if (
              user.friends.find((element) => element.id == x.id) ===
                undefined &&
              user.pendings.find((element) => element.id == x.id) ===
                undefined &&
              user.blocks.find((element) => element.id == x.id) === undefined
            ) {
              return user;
            }
          });

          res.status(200).send(result);
        }
      );
    } else {
      res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
    }
  } else {
    res.status(400).send({ errors: ["No Cookie??? :("] });
  }
});

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/profilepictures");
  },
  filename: function (req, file, cb) {
    console.log(file);
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
});

app.post(
  "/uploadProfilePicture",
  upload.single("file" /* name attribute of <file> element in your form */),
  (req: express.Request, res, next) => {
    if (req.cookies) {
      let user = decodeToken(req.cookies.token);

      if (user) {
        let userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
        };

        User.updateOne(
          { id: user.id },
          { $set: { profilepicture: user.id } },
          (err, docs) => {
            console.log(docs);
            if (err) res.status(500).send({ errors: [err] });
            return;
          }
        );

        res.status(200).send({
          user: userData,
        });
      } else {
        res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
      }
    } else {
      res.status(400).send({ errors: ["No Cookie??? :("] });
    }
  }
);

app.get("/getBannedUsers", async (req, res) => {
  let users = await User.aggregate([
    {
      $lookup: {
        from: "reports",
        localField: "banReportID",
        foreignField: "id",
        as: "report",
      },
    },
    { $match: { isBanned: true } },
  ]);

  res.status(200).send(users);
});

app.post("/unbanUser", (req, res) => {
  User.updateOne(
    { id: req.body.userID },
    {
      $set: {
        bannedDate: null,
        banReportID: null,
        isBanned: false,
      },
    },
    (err, docs) => {
      console.log(docs);
      if (err) res.status(500).send({ errors: [err] });
    }
  );
  res.status(200).send("User unbanned!");
});

app.get("/testCookie", (req, res) => {
  console.log(req.cookies);
  console.log(decodeToken(req.cookies.token));
});

export default app;
