import express from "express";
import { Socket } from "socket.io";
const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const userRouter = require("./routes/user");
const reportRouter = require("./routes/report");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socket = require("socket.io");
const randomstring = require("randomstring");

let userModel = require("./models/userModel");

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

app.use("/api/user/", userRouter);
app.use("/api/report/", reportRouter);

mongoose.connect(process.env.DATABASE_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("DB successfully connected!");
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
    socket?.handshake?.headers?.cookie?.replace("token=", "")
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
    });
  });

  socket.on("respondMeetingInvitation", (data) => {
    io.to(data.to).emit("meetingInvitationResponse", data.response);

    if (data.response) {
      meetingRooms[data.meetingID].push(socket.id);

      meetingRooms[data.meetingID].forEach((socketID) => {
        if (socket.id !== socketID)
          io.to(socketID).emit("newMeetingMember", socket.id);
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

server.listen(3001, () => {
  console.log("Backend running at port 3001");
});

module.exports = app;
