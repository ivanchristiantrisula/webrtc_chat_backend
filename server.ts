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
const mailer = require('nodemailer');

let User = require("./models/userModel.ts");
let Report = require("./models/report/chatReportModel");

const app = express();
app.use(express.static(__dirname + "/uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

//app.use("/api/user/", userRouter);
//app.use("/api/report/", reportRouter);

mongoose.connect(process.env.DATABASE_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("DB successfully connected!");
});

app.post("/api/user/register", async (req, res) => {
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

app.post("/api/user/login", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.findOne({ email: new RegExp(email, "i") }, function (err, doc) {
    if (err) return res.status(400).send({ errors: err });
    if (doc != null) {
      bcrypt.compare(password, doc.password, (err, result) => {
        if (err) return console.log(err);
        if (result) {
          let userData = {};
          userData["_id"] = doc._id;
          userData["name"] = doc.name;
          userData["email"] = doc.email;
          userData["username"] = doc.username;
          userData["MBTI"] = doc.MBTI;
          userData["bio"] = doc.bio;
          userData["profilepicture"] = doc.profilepicture;
          let token = require("./library/generateToken.ts")(userData);

          if (doc.isBanned) {
            res.status(403).send({
              errors: ["You are banned from this site"],
            });
            return;
          }
          res.status(200).send({
            user: userData,
            token: token,
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

app.get("/api/user/findUser", async (req, res) => {
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

app.post("/api/user/addFriend", async (req, res) => {
  if (req.body.token) {
    let user = decodeToken(req.body.token);
    let target = req.body.user;
    if (user) {
      User.find(
        [
          { _id: target._id },
          {
            $nor: [{ "friends._id": user._id }, { "pendings._id": user._id }],
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

app.get("/api/user/getPendingFriends", (req, res) => {
  if (req.query.token) {
    let user = decodeToken(req.query.token);
    if (user) {
      User.findOne({ _id: user._id }, "pendings", (err, docs) => {
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

app.get("/api/user/getFriends", (req, res) => {
  if (req.query.token) {
    let user = decodeToken(req.query.token);
    if (user) {
      User.findOne({ _id: user._id }, "friends", (err, docs) => {
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

app.get("/api/user/getBlocks", (req, res) => {
  if (req.query.token) {
    let user = decodeToken(req.query.token);
    if (user) {
      User.findOne({ _id: user._id }, "blocks", (err, docs) => {
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

app.post("/api/user/acceptFriendRequest", (req, res) => {
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

app.post("/api/user/rejectFriendRequest", (req, res) => {
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

app.post("/api/user/updateMBTI", (req, res) => {
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

app.post("/api/user/updateProfile", (req, res) => {
  if (req.body.token) {
    let user = decodeToken(req.body.token);

    if (user) {
      console.log(req.body);
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
          console.log(docs);
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

app.post("/api/user/changePassword", (req, res) => {
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
          bcrypt.compare(req.body.old, doc.password, async (err, result) => {
            if (err) return console.log(err);
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

app.get("/api/user/getFriendsRecommendation", (req, res) => {
  if (req.query.token) {
    let user = decodeToken(req.query.token);

    if (user) {
      let x;
      User.findById(user._id, function (err, docs) {
        x = docs;
      });
      User.find(
        {
          $and: [
            { MBTI: { $in: MBTIComp[user.MBTI] } },
            { _id: { $nin: [new ObjectId(user._id)] } },
          ],
        },
        function (err, docs) {
          let result = docs.map(function (user) {
            let found = user.friends.find((element) => element._id == x._id);
            //console.log(user);
            if (
              user.friends.find((element) => element._id == x._id) ===
                undefined &&
              user.pendings.find((element) => element._id == x._id) ===
                undefined &&
              user.blocks.find((element) => element._id == x._id) === undefined
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
  "/api/user/uploadProfilePicture",
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

app.get("/api/user/getBannedUsers", async (req, res) => {
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

app.post("/api/user/unbanUser", (req, res) => {
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
      console.log(docs);
      if (err) res.status(500).send({ errors: [err] });
    }
  );
  res.status(200).send("User unbanned!");
});

app.post("/api/user/sendResetPasswordCode", (req,res) => {
  let email = req.body.email;

  User.findOne({ email : email }, function (err, docs) {
    if(docs){
      let code = Math.floor(100000 + Math.random() * 900000);

      let transporter = mailer.createTransport({
        service : "gmail",
        auth : {
          user : process.env.EMAIL,
          pass : process.env.PASSWORD,
        }
      })

      let mailOptions = {
        from : "ivanchristian.webrtc@gmail.com",
        to : email,
        subject : "Reset password verification code",
        text : `You have requested to reset your password for your WebRTC Chat App account. Here is the verification code : ${code}`
      }

      transporter.sendMail(mailOptions, (err, info) => {
        if(err) throw err;
      })

      res.status(200).send({code : code})
    }else{
      res.status(400).send("User not found")
    }
  });
})

app.post("/api/user/resetPassword",  (req,res)=>{
  let password = req.body.password
  let email = req.body.email

  User.findOne({ email: email }, async function (err, doc) {
    if (!err) {
      let hashedPass = await bcrypt.hash(password, 10);
          User.updateOne(
            { email : email },
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
})

app.post("/api/report/create", (req, res) => {
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

app.get("/api/report/getAllReports", async (req, res) => {
  let reports = await Report.find({});

  res.status(200).send(reports);
});

app.post("/api/report/closeReport", (req, res) => {
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
      console.log(userData.email + " connected!");
    }
  }

  socket.emit("yourID", socket.id);

  io.sockets.emit("allUsers", users);

  socket.on("disconnect", () => {
    console.log(userData.email + " disconnected!");
    delete users[socket.id];
    io.sockets.emit("allUsers", users);
  });

  socket.on("transferSDP", (data) => {
    //console.log(data);
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
      senderInfo : userData
    });
  });

  socket.on("respondMeetingInvitation", (data) => {
    io.to(data.to).emit("meetingInvitationResponse", data.response);

    if (data.response) {
      meetingRooms[data.meetingID].push(socket.id);

      meetingRooms[data.meetingID].forEach((socketID) => {
        if (socket.id !== socketID)
          io.to(socketID).emit("newMeetingMember", {sid : socketID, userData : userData});
      });
    }
  });

  socket.on("requestNewRoom", () => {
    let meetingID = randomstring.generate(5);
    meetingRooms[meetingID] = new Array(socket.id);
    socket.emit("meetingID", meetingID);
  });

  socket.on("requestMeetingMembers", (data) => {
    console.log(data);
    socket.emit("meetingMembers", meetingRooms[data]);
  });

  socket.on("transferSDPMeeting", (data) => {
    let x = data;
    x.from = socket.id;
    console.log(x);
    io.to(data.to).emit("meetingSDPTransfer", x);
  });

  socket.on("leaveMeeting", ({ meetingID }) => {
    meetingRooms[meetingID].forEach((sid) => {
      io.to(sid).emit("removeMeetingPeer", { socketID: sid });
    });
  });

  socket.on("notifyScreenSharing", (data) => {
    meetingRooms[data.roomID].forEach((sid) => {
      io.to(sid).emit("screenshareMode", {
        sid: socket.id,
        status: data.status,
      });
    });
  });
});

server.listen(process.env.PORT, () => {
  console.log("Backend running at port 3001");
});

module.exports = app;
