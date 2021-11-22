const express = require("express");
import { ObjectId, ObjectID } from "bson";
import { Socket } from "socket.io";
const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socket = require("socket.io");
const randomstring = require("randomstring");
const bcrypt = require("bcrypt");
const decodeToken = require("./library/decodeToken");
const _ = require("underscore");
const MBTIComp = require("./library/compability.json");
const multer = require("multer");
const mailer = require("nodemailer");
import "reflect-metadata";
import SQLConfig from "./db/ormconfig";
import UserSQL from "./models/SQL/entity/User.entity";
import { createConnection, getConnection } from "typeorm";

let User = require("./models/userModel.ts");
let Report = require("./models/report/chatReportModel");

const app = express();
app.use(express.static(__dirname + "/uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

createConnection(SQLConfig)
  .then((connection) => {
    app.get("/", (req, res) => {
      res.status(200).send("Server is OK");
    });

    const corsConfig = {
      credentials: true,
      origin: process.env.FRONTEND_URI,
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    };
    app.use(cors(corsConfig));
    app.use(cookieParser());

    //app.use("/user/", userRouter);
    //app.use("/report/", reportRouter);

    // mongoose.connect(process.env.DATABASE_URI, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // });

    // const db = mongoose.connection;
    // db.on("error", console.error.bind(console, "connection error:"));
    // db.once("open", function () {
    //   console.info("DB successfully connected!");
    // });

    app.post("/user/register", async (req, res) => {
      let email = req.body.email;
      let password = req.body.password;
      let confirm = req.body.confirm;
      let name = req.body.name;
      let username = req.body.username;

      if (password === confirm) {
        //  let newUser = new User({
        //     name: name,
        //     password: await bcrypt.hash(password, 10),
        //     email: email,
        //     username: username,
        //     profilepicture: "default",
        //     isVerified: false,
        //   });
        //   newUser.save(function (err, u) {
        //     if (err) return res.status(400).send({ errors: [err.message] });
        //     return res.status(200).send("OK");
        //   });
        let User = new UserSQL();
        User.name = name;
        User.password = await bcrypt.hash(password, 10);
        User.email = email;
        User.username = username;

        try {
          await connection.manager.save(User);
          res.status(200).send("OK");
        } catch (error) {
          console.error(error);
          res.status(500).send({
            errors: ["User already exist"],
          });
        }
      } else {
        res.status(400).send({
          errors: ["Confirm Password doesn't match Password"],
        });
      }
    });

    app.post("/user/sendEmailVerificationCode", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        User.findOne({ _id: user._id }, function (err, docs) {
          if (docs) {
            let code = Math.floor(100000 + Math.random() * 900000);

            let transporter = mailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
              },
            });

            let mailOptions = {
              from: "ivanchristian.webrtc@gmail.com",
              to: docs.email,
              subject: "Email verification code",
              text: `You have registered this email address to WebRTC Chat service. Here is your verification code : ${code}`,
            };

            transporter.sendMail(mailOptions, (err, info) => {
              if (err) throw err;
            });

            res.status(200).send({ code: code });
          } else {
            res.status(400).send("User not found");
          }
        });
      }
    });

    app.post("/user/verifyAccount", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        User.updateOne(
          { _id: user._id },
          { $set: { isVerified: true } },
          (err, result) => {
            if (err) {
              res.status(500).send(err);
            }

            if (result) {
              res.status(200).send("OK");
            }
          }
        );
      }
    });

    app.post("/user/login", async (req, res) => {
      let email = req.body.email;
      let password = req.body.password;

      let user = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(UserSQL, "user")
        .where("user.email = :email", { email: email })
        .getOne();

      if (user !== undefined) {
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) console.error(err);
          if (!result) {
            res.status(401).send({ errors: ["Wrong password"] });
            return;
          }

          if (user?.isBanned) {
            res.status(403).send({
              errors: ["You are banned from this site"],
            });
            return;
          }

          let token = require("./library/generateToken.ts")(user);

          res.status(200).send({
            user,
            token: token,
          });
        });
      } else {
        res.status(401).send({ errors: ["User not found!"] });
      }

      //console.log(user);

      // User.findOne({ email: new RegExp(email, "i") }, function (err, doc) {
      //   if (err) return res.status(400).send({ errors: err });
      //   if (doc != null) {
      //     bcrypt.compare(password, doc.password, (err, result) => {
      //       if (err) return console.error(err);
      //       if (result) {
      //         let userData = {};
      //         userData["_id"] = doc._id;
      //         userData["name"] = doc.name;
      //         userData["email"] = doc.email;
      //         userData["username"] = doc.username;
      //         userData["MBTI"] = doc.MBTI;
      //         userData["bio"] = doc.bio;
      //         userData["profilepicture"] = doc.profilepicture;
      //         userData["isVerified"] = doc.isVerified;
      //         let token = require("./library/generateToken.ts")(userData);

      //         if (doc.isBanned) {
      //           res.status(403).send({
      //             errors: ["You are banned from this site"],
      //           });
      //           return;
      //         }
      //         res.status(200).send({
      //           user: userData,
      //           token: token,
      //         });
      //       } else {
      //         res.status(401).send({ errors: ["Wrong email or password"] });
      //       }
      //     });
      //   } else {
      //     res.status(401).send({ errors: ["User not found!"] });
      //   }
      // });
    });

    app.get("/user/findUser", async (req, res) => {
      let keyword = req.query.keyword;

      // User.find(
      //   { username: { $regex: keyword, $options: "i" } },
      //   function (err, doc) {
      //     if (!err) {
      //       res.status(200).send(doc);
      //     } else {
      //       res.status(401).send(err);
      //     }
      //   }
      // );
      let users = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(UserSQL, "user")
        .where("user.username like '%' || :username || '%'", {
          username: keyword,
        })
        .getMany();

      if (users !== undefined) {
        res.status(200).send(users);
      } else {
        res.status(500).send();
      }
    });

    app.post("/user/addFriend", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        let target = req.body.user;
        if (user) {
          User.find(
            [
              { _id: target._id },
              {
                $nor: [
                  { "friends._id": user._id },
                  { "pendings._id": user._id },
                ],
              },
            ],
            (err, doc) => {
              if (_.isEmpty(doc)) {
                let userData = {
                  _id: user._id,
                  name: user.name,
                  email: user.email,
                  username: user.username,
                  profilepicture: user.profilepicture,
                };
                User.updateOne(
                  { _id: target._id },
                  { $addToSet: { pendings: userData } },
                  (err, result) => {}
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

    app.get("/user/getPendingFriends", (req, res) => {
      if (req.query.token) {
        let user = decodeToken(req.query.token);
        if (user) {
          User.findOne({ _id: user._id }, "pendings", (err, docs) => {
            if (err) {
              console.error(err);
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

    app.get("/user/getFriends", (req, res) => {
      if (req.query.token) {
        let user = decodeToken(req.query.token);
        if (user) {
          User.findOne({ _id: user._id }, "friends", (err, docs) => {
            if (err) {
              console.error(err);
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

    app.get("/user/getBlocks", (req, res) => {
      if (req.query.token) {
        let user = decodeToken(req.query.token);
        if (user) {
          User.findOne({ _id: user._id }, "blocks", (err, docs) => {
            if (err) {
              console.error(err);
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

    app.post("/user/acceptFriendRequest", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        let target = req.body.target;

        if (user) {
          let userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            profilepicture: user.profilepicture,
          };

          User.updateOne(
            { _id: user._id },
            { $pull: { pendings: { _id: target._id } } },
            (err, docs) => {
              if (err) res.status(500).send({ errors: [err] });
              return;
            }
          );
          User.updateOne(
            { _id: target._id },
            { $addToSet: { friends: userData } },
            (err, result) => {
              if (err) res.status(500).send({ errors: [err] });
              return;
            }
          );

          User.updateOne(
            { _id: user._id },
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

    app.post("/user/rejectFriendRequest", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        let target = req.body.target;

        if (user) {
          let userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
          };

          User.updateOne(
            { _id: user._id },
            { $pull: { pendings: { _id: target._id } } },
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

    app.post("/user/updateMBTI", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          let userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
          };

          User.updateOne(
            { _id: user._id },
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

    app.post("/user/updateProfile", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          let userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
          };

          User.updateOne(
            { _id: user._id },
            { $set: { name: req.body.name, bio: req.body.bio } },
            (err, docs) => {
              if (err) res.status(500).send({ errors: [err] });
              return;
            }
          );

          // let payload = {};
          // payload["_id"] = doc._id;
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

    app.post("/user/changePassword", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          let userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
          };

          if (req.body.new != req.body.confirm) {
            res.status(400).send("Confirm password doesnt match");
            return;
          }

          User.findOne({ _id: user._id }, function (err, doc) {
            if (!err) {
              bcrypt.compare(
                req.body.old,
                doc.password,
                async (err, result) => {
                  if (err) return console.error(err);
                  if (result) {
                    let hashedPass = await bcrypt.hash(req.body.new, 10);
                    User.updateOne(
                      { _id: user._id },
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
                }
              );
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

    app.get("/user/getFriendsRecommendation", (req, res) => {
      if (req.query.token) {
        let x = decodeToken(req.query.token);

        if (x) {
          User.find(
            {
              $and: [
                { MBTI: { $in: MBTIComp[x.MBTI] } },
                { _id: { $nin: [new ObjectId(x._id)] } },
              ],
            },
            function (err, docs) {
              let result = docs.map(function (user) {
                let found = user.friends.find((element) => {
                  return element._id == x._id;
                });
                if (
                  !user.friends.find((element) => element._id == x._id) &&
                  !user.pendings.find((element) => element._id == x._id) &&
                  !user.blocks.find((element) => element._id == x._id)
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
        cb(null, file.originalname);
      },
    });
    const upload = multer({
      storage: storage,
    });

    app.post(
      "/user/uploadProfilePicture",
      upload.single("file" /* name attribute of <file> element in your form */),
      (req, res, next) => {
        if (req.body.token) {
          let user = decodeToken(req.body.token);

          if (user) {
            let userData = {
              _id: user._id,
              name: user.name,
              email: user.email,
              username: user.username,
            };

            User.updateOne(
              { _id: user._id },
              { $set: { profilepicture: user._id } },
              (err, docs) => {
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

    app.get("/user/getBannedUsers", async (req, res) => {
      let users = await User.aggregate([
        {
          $lookup: {
            from: "reports",
            localField: "banReportID",
            foreignField: "_id",
            as: "report",
          },
        },
        { $match: { isBanned: true } },
      ]);

      res.status(200).send(users);
    });

    app.post("/user/unbanUser", (req, res) => {
      User.updateOne(
        { _id: req.body.userID },
        {
          $set: {
            bannedDate: null,
            banReportID: null,
            isBanned: false,
          },
        },
        (err, docs) => {
          if (err) res.status(500).send({ errors: [err] });
        }
      );
      res.status(200).send("User unbanned!");
    });

    app.post("/user/sendResetPasswordCode", (req, res) => {
      let email = req.body.email;

      User.findOne({ email: email }, function (err, docs) {
        if (docs) {
          let code = Math.floor(100000 + Math.random() * 900000);

          let transporter = mailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD,
            },
          });

          let mailOptions = {
            from: "ivanchristian.webrtc@gmail.com",
            to: email,
            subject: "Reset password verification code",
            text: `You have requested to reset your password for your WebRTC Chat App account. Here is the verification code : ${code}`,
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw err;
          });

          res.status(200).send({ code: code });
        } else {
          res.status(400).send("User not found");
        }
      });
    });

    app.post("/user/resetPassword", (req, res) => {
      let password = req.body.password;
      let email = req.body.email;

      User.findOne({ email: email }, async function (err, doc) {
        if (!err) {
          let hashedPass = await bcrypt.hash(password, 10);
          User.updateOne(
            { email: email },
            { $set: { password: hashedPass } },
            (err, docs) => {
              if (err) {
                res.status(500).send(err);
                return;
              } else {
                res.status(200).send("Success");
                return;
              }
            }
          );
        } else {
          res.status(401).send(err);
          return;
        }
      });
    });

    app.post("/report/create", (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

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

    app.get("/report/getAllReports", async (req, res) => {
      let reports = await Report.find({});

      res.status(200).send(reports);
    });

    app.post("/report/closeReport", (req, res) => {
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
          if (err) res.status(500).send({ errors: [err] });
          return;
        }
      );

      res.status(200).send("Success");
    });

    const server = http.createServer(app);

    let users = {};
    let filteredUsers = {};
    let meetingRooms = {};

    const io = socket(server, {
      cors: {
        origin: process.env.FRONTEND_URI,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket: Socket) => {
      let userData = require("./library/decodeToken")(
        socket?.handshake?.query.token
      );

      if (userData) {
        if (!users[socket.id]) {
          users[socket.id] = userData;
          console.info(userData.email + " connected!");
        }
      }

      socket.emit("yourID", socket.id);

      io.sockets.emit("allUsers", users);

      socket.on("disconnect", () => {
        console.info(userData.email + " disconnected!");
        delete users[socket.id];
        io.sockets.emit("allUsers", users);
      });

      socket.on("transferSDP", (data) => {
        let x = data;
        x.from = socket.id;
        io.to(data.to).emit("sdpTransfer", x);
      });

      socket.on("startVideoCall", (data) => {
        io.to(data.to).emit("startVideoCall");
      });
      socket.on("endVideoCall", (data) => {
        io.to(data.to).emit("endVideoCall");
      });

      //MEETING SOCKET

      socket.on("inviteUserToMeeting", (data) => {
        io.to(data.to).emit("meetingInvitation", {
          meetingID: data.meetingID,
          from: socket.id,
          senderInfo: userData,
        });
      });

      socket.on("respondMeetingInvitation", (data) => {
        io.to(data.to).emit("meetingInvitationResponse", data.response);

        if (data.response) {
          meetingRooms[data.meetingID].push(socket.id);

          meetingRooms[data.meetingID].forEach((socketID) => {
            if (socket.id !== socketID)
              io.to(socketID).emit("newMeetingMember", {
                sid: socketID,
                userData: userData,
              });
          });
        }
      });

      socket.on("joinByMeetingID", ({ meetingID }) => {
        if (meetingRooms[meetingID] !== undefined) {
          meetingRooms[meetingID].push(socket.id);

          meetingRooms[meetingID].forEach((socketID) => {
            if (socket.id !== socketID)
              io.to(socketID).emit("newMeetingMember", {
                sid: socketID,
                userData: userData,
              });
          });
          io.to(socket.id).emit("joinMeetingByIDApproved", { code: meetingID });
        } else {
          io.to(socket.id).emit("joinMeetingByIDDenied");
        }
      });

      socket.on("requestNewRoom", () => {
        let meetingID = randomstring.generate(5);
        meetingRooms[meetingID] = new Array(socket.id);
        socket.emit("meetingID", meetingID);
      });

      socket.on("requestMeetingMembers", (data) => {
        socket.emit("meetingMembers", meetingRooms[data]);
      });

      socket.on("transferSDPMeeting", (data) => {
        let x = data;
        x.from = socket.id;
        io.to(data.to).emit("meetingSDPTransfer", x);
      });

      socket.on("leaveMeeting", ({ meetingID }) => {
        meetingRooms[meetingID].forEach((sid) => {
          io.to(sid).emit("removeMeetingPeer", { socketID: sid });
        });
      });

      socket.on("notifyScreenSharing", (data) => {
        // meetingRooms[data.roomID].forEach((sid) => {
        //   io.to(sid).emit("screenshareMode", {
        //     sid: socket.id,
        //     status: data.status,
        //   });
        // });
      });
    });

    server.listen(process.env.PORT, () => {
      console.info("Backend running at port 3001");
    });
  })
  .catch((e) => {
    console.log(e);
  });

module.exports = app;
