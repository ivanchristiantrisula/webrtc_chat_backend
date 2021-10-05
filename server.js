"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var express = require("express");
var bson_1 = require("bson");
var dotenv = require("dotenv").config();
var mongoose = require("mongoose");
var cors = require("cors");
var cookieParser = require("cookie-parser");
var http = require("http");
var socket = require("socket.io");
var randomstring = require("randomstring");
var bcrypt = require("bcrypt");
var decodeToken = require("./library/decodeToken");
var _ = require("underscore");
var MBTIComp = require("./library/compability.json");
var multer = require("multer");
var User = require("./models/userModel.ts");
var Report = require("./models/report/chatReportModel");
var app = express();
app.use(express.static(__dirname + "/uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", function (req, res) {
    res.status(200).send("Server is OK");
});
var corsConfig = {
    credentials: true,
    origin: process.env.FRONTEND_URI,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE"
};
app.use(cors(corsConfig));
app.use(cookieParser());
//app.use("/api/user/", userRouter);
//app.use("/api/report/", reportRouter);
mongoose.connect(process.env.DATABASE_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
    console.log("DB successfully connected!");
});
app.post("/api/user/register", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var email, password, confirm, name, username, newUser, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                email = req.body.email;
                password = req.body.password;
                confirm = req.body.confirm;
                name = req.body.name;
                username = req.body.username;
                if (!(password === confirm)) return [3 /*break*/, 2];
                _a = User.bind;
                _b = {
                    name: name
                };
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 1:
                newUser = new (_a.apply(User, [void 0, (_b.password = _c.sent(),
                        _b.email = email,
                        _b.username = username,
                        _b.profilepicture = "default",
                        _b.isBanned = true,
                        _b.bannedDate = null,
                        _b)]))();
                newUser.save(function (err, u) {
                    if (err)
                        return res.status(400).send({ errors: [err.message] });
                    return res.status(200).send("OK");
                });
                return [3 /*break*/, 3];
            case 2:
                res.status(400).send({
                    errors: ["Confirm Password doesn't match Password"]
                });
                _c.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post("/api/user/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var email, password;
    return __generator(this, function (_a) {
        email = req.body.email;
        password = req.body.password;
        User.findOne({ email: new RegExp(email, "i") }, function (err, doc) {
            if (err)
                return res.status(400).send({ errors: err });
            if (doc != null) {
                bcrypt.compare(password, doc.password, function (err, result) {
                    if (err)
                        return console.log(err);
                    if (result) {
                        var userData = {};
                        userData["_id"] = doc._id;
                        userData["name"] = doc.name;
                        userData["email"] = doc.email;
                        userData["username"] = doc.username;
                        userData["MBTI"] = doc.MBTI;
                        userData["bio"] = doc.bio;
                        userData["profilepicture"] = doc.profilepicture;
                        var token = require("./library/generateToken.ts")(userData);
                        res.cookie("token", token, {
                            secure: true,
                            sameSite: false,
                            httpOnly: false,
                            domain: process.env.FRONTEND_URI
                        });
                        res.status(200).send({
                            user: userData,
                            token: token
                        });
                    }
                    else {
                        res.status(401).send({ errors: ["Wrong email or password"] });
                    }
                });
            }
            else {
                res.status(401).send({ errors: ["User not found!"] });
            }
        });
        return [2 /*return*/];
    });
}); });
app.get("/api/user/findUser", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var keyword;
    return __generator(this, function (_a) {
        keyword = req.query.keyword;
        User.findOne({ username: new RegExp("^" + keyword + "$", "i") }, function (err, doc) {
            if (!err) {
                res.status(200).send(new Array(doc));
            }
            else {
                res.status(401).send(err);
            }
        });
        return [2 /*return*/];
    });
}); });
app.post("/api/user/addFriend", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user_1, target_1;
    return __generator(this, function (_a) {
        if (req.body.token) {
            user_1 = decodeToken(req.body.token);
            target_1 = req.body.user;
            if (user_1) {
                User.find([
                    { _id: target_1._id },
                    {
                        $nor: [{ "friends._id": user_1._id }, { "pendings._id": user_1._id }]
                    },
                ], function (err, doc) {
                    if (_.isEmpty(doc)) {
                        var userData = {
                            _id: user_1._id,
                            name: user_1.name,
                            email: user_1.email,
                            username: user_1.username,
                            profilepicture: user_1.profilepicture
                        };
                        User.updateOne({ _id: target_1._id }, { $addToSet: { pendings: userData } }, function (err, result) {
                            console.log(result);
                        });
                        res.status(200).send("Success");
                    }
                    else {
                        res.status(401).send({ errors: "Already in friendlist" });
                    }
                });
            }
            else {
                res.status(401).send({ errors: "Invalide Token" });
            }
        }
        else {
            res.status(401).send({ errors: "No Cookie :(" });
        }
        return [2 /*return*/];
    });
}); });
app.get("/api/user/getPendingFriends", function (req, res) {
    if (req.query.token) {
        var user = decodeToken(req.query.token);
        if (user) {
            User.findOne({ _id: user._id }, "pendings", function (err, docs) {
                if (err) {
                    console.log(err);
                    res.status(500).send({ errors: err });
                }
                res.status(200).send(docs);
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.get("/api/user/getFriends", function (req, res) {
    if (req.query.token) {
        var user = decodeToken(req.query.token);
        if (user) {
            User.findOne({ _id: user._id }, "friends", function (err, docs) {
                if (err) {
                    console.log(err);
                    res.status(500).send({ errors: err });
                }
                res.status(200).send(docs);
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.get("/api/user/getBlocks", function (req, res) {
    if (req.query.token) {
        var user = decodeToken(req.query.token);
        if (user) {
            User.findOne({ _id: user._id }, "blocks", function (err, docs) {
                if (err) {
                    console.log(err);
                    res.status(500).send({ errors: err });
                }
                res.status(200).send(docs);
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.post("/api/user/acceptFriendRequest", function (req, res) {
    if (req.query.token) {
        var user = decodeToken(req.body.token);
        var target = req.body.target;
        if (user) {
            var userData = {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profilepicture: user.profilepicture
            };
            User.updateOne({ _id: user._id }, { $pull: { pendings: { _id: target._id } } }, function (err, docs) {
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
            User.updateOne({ _id: target._id }, { $addToSet: { friends: userData } }, function (err, result) {
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
            User.updateOne({ _id: user._id }, { $addToSet: { friends: target } }, function (err, result) {
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
            res.status(200).send("Success");
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.post("/api/user/rejectFriendRequest", function (req, res) {
    if (req.body.token) {
        var user = decodeToken(req.body.token);
        var target = req.body.target;
        if (user) {
            var userData = {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            };
            User.updateOne({ _id: user._id }, { $pull: { pendings: { _id: target._id } } }, function (err, docs) {
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
            res.status(200).send("Success");
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.post("/api/user/updateMBTI", function (req, res) {
    if (req.body.token) {
        var user = decodeToken(req.body.token);
        if (user) {
            var userData = {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            };
            User.updateOne({ _id: user._id }, { $set: { MBTI: req.body.type } }, function (err, docs) {
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
            res.status(200).send("Success");
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.post("/api/user/updateProfile", function (req, res) {
    if (req.body.token) {
        var user = decodeToken(req.body.token);
        if (user) {
            console.log(req.body);
            var userData = {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            };
            User.updateOne({ _id: user._id }, { $set: { name: req.body.name, bio: req.body.bio } }, function (err, docs) {
                console.log(docs);
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
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
                user: userData
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.post("/api/user/changePassword", function (req, res) {
    if (req.body.token) {
        var user_2 = decodeToken(req.body.token);
        if (user_2) {
            var userData = {
                _id: user_2._id,
                name: user_2.name,
                email: user_2.email,
                username: user_2.username
            };
            if (req.body["new"] != req.body.confirm) {
                res.status(400).send("Confirm password doesnt match");
                return;
            }
            User.findOne({ _id: user_2._id }, function (err, doc) {
                var _this = this;
                if (!err) {
                    bcrypt.compare(req.body.old, doc.password, function (err, result) { return __awaiter(_this, void 0, void 0, function () {
                        var hashedPass;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (err)
                                        return [2 /*return*/, console.log(err)];
                                    if (!result) return [3 /*break*/, 2];
                                    return [4 /*yield*/, bcrypt.hash(req.body["new"], 10)];
                                case 1:
                                    hashedPass = _a.sent();
                                    User.updateOne({ _id: user_2._id }, { $set: { password: hashedPass } }, function (err, docs) {
                                        if (err) {
                                            res.status(500).send({ errors: [err] });
                                            return;
                                        }
                                        else {
                                            res.status(200).send("Success");
                                            return;
                                        }
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    res.status(401).send("Old password doesn't match");
                                    return [2 /*return*/];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                }
                else {
                    res.status(401).send(err);
                    return;
                }
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.get("/api/user/getFriendsRecommendation", function (req, res) {
    if (req.query.token) {
        var user = decodeToken(req.query.token);
        if (user) {
            var x_1;
            User.findById(user._id, function (err, docs) {
                x_1 = docs;
            });
            User.find({
                $and: [
                    { MBTI: { $in: MBTIComp[user.MBTI] } },
                    { _id: { $nin: [new bson_1.ObjectId(user._id)] } },
                ]
            }, function (err, docs) {
                var result = docs.map(function (user) {
                    var found = user.friends.find(function (element) { return element._id == x_1._id; });
                    //console.log(user);
                    if (user.friends.find(function (element) { return element._id == x_1._id; }) ===
                        undefined &&
                        user.pendings.find(function (element) { return element._id == x_1._id; }) ===
                            undefined &&
                        user.blocks.find(function (element) { return element._id == x_1._id; }) === undefined) {
                        return user;
                    }
                });
                res.status(200).send(result);
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads/profilepictures");
    },
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, file.originalname);
    }
});
var upload = multer({
    storage: storage
});
app.post("/api/user/uploadProfilePicture", upload.single("file" /* name attribute of <file> element in your form */), function (req, res, next) {
    if (req.body.token) {
        var user = decodeToken(req.body.token);
        if (user) {
            var userData = {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            };
            User.updateOne({ _id: user._id }, { $set: { profilepicture: user._id } }, function (err, docs) {
                console.log(docs);
                if (err)
                    res.status(500).send({ errors: [err] });
                return;
            });
            res.status(200).send({
                user: userData
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.get("/api/user/getBannedUsers", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, User.aggregate([
                    {
                        $lookup: {
                            from: "reports",
                            localField: "banReportID",
                            foreignField: "_id",
                            as: "report"
                        }
                    },
                    { $match: { isBanned: true } },
                ])];
            case 1:
                users = _a.sent();
                res.status(200).send(users);
                return [2 /*return*/];
        }
    });
}); });
app.post("/api/user/unbanUser", function (req, res) {
    User.updateOne({ _id: req.body.userID }, {
        $set: {
            bannedDate: null,
            banReportID: null,
            isBanned: false
        }
    }, function (err, docs) {
        console.log(docs);
        if (err)
            res.status(500).send({ errors: [err] });
    });
    res.status(200).send("User unbanned!");
});
app.get("/testCookie", function (req, res) {
    console.log(req.body.token);
    console.log(decodeToken(req.body.token));
});
app.post("/api/report/create", function (req, res) {
    if (req.body.token) {
        var user = decodeToken(req.body.token);
        if (user) {
            var newReport = new Report({
                reporter: req.body.reporter,
                reportee: req.body.reportee,
                type: req.body.proof ? "Chat" : "Profile",
                category: req.body.category,
                proof: req.body.proof || null,
                description: req.body.description,
                status: "Open",
                timestamp: new Date()
            });
            newReport.save(function (err, u) {
                if (err)
                    return res.status(500).send({ errors: [err.message] });
                return res.status(200).send("OK");
            });
        }
        else {
            res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
    }
    else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
    }
});
app.get("/api/report/getAllReports", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var reports;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Report.find({})];
            case 1:
                reports = _a.sent();
                res.status(200).send(reports);
                return [2 /*return*/];
        }
    });
}); });
app.post("/api/report/closeReport", function (req, res) {
    if (req.body.banReportee) {
        User.updateOne({ _id: req.body.reporteeID }, {
            $set: {
                isBanned: true,
                bannedDate: new Date(),
                banReportID: new bson_1.ObjectID(req.body.reportID)
            }
        }, function (err, docs) {
            if (err)
                res.status(500).send({ errors: [err] });
            return;
        });
    }
    Report.updateOne({ _id: req.body.reportID }, {
        $set: {
            status: "Closed",
            closedDate: new Date(),
            isReporteeBanned: req.body.banReportee
        }
    }, function (err, docs) {
        console.log(docs);
        if (err)
            res.status(500).send({ errors: [err] });
        return;
    });
    res.status(200).send("Success");
});
var server = http.createServer(app);
var users = {};
var filteredUsers = {};
var meetingRooms = {};
var io = socket(server, {
    cors: {
        origin: process.env.FRONTEND_URI,
        methods: ["GET", "POST"],
        credentials: true
    }
});
io.on("connection", function (socket) {
    var _a;
    var userData = require("./library/decodeToken")((_a = socket === null || socket === void 0 ? void 0 : socket.handshake) === null || _a === void 0 ? void 0 : _a.query.token);
    if (userData) {
        if (!users[socket.id]) {
            users[socket.id] = userData;
            console.log(userData.email + " connected!");
        }
    }
    socket.emit("yourID", socket.id);
    io.sockets.emit("allUsers", users);
    socket.on("disconnect", function () {
        console.log(userData.email + " disconnected!");
        delete users[socket.id];
        io.sockets.emit("allUsers", users);
    });
    socket.on("transferSDP", function (data) {
        //console.log(data);
        var x = data;
        x.from = socket.id;
        io.to(data.to).emit("sdpTransfer", x);
    });
    socket.on("startVideoCall", function (data) {
        io.to(data.to).emit("startVideoCall");
    });
    socket.on("endVideoCall", function (data) {
        io.to(data.to).emit("endVideoCall");
    });
    //MEETING SOCKET
    socket.on("inviteUserToMeeting", function (data) {
        io.to(data.to).emit("meetingInvitation", {
            meetingID: data.meetingID,
            from: socket.id
        });
    });
    socket.on("respondMeetingInvitation", function (data) {
        io.to(data.to).emit("meetingInvitationResponse", data.response);
        if (data.response) {
            meetingRooms[data.meetingID].push(socket.id);
            meetingRooms[data.meetingID].forEach(function (socketID) {
                if (socket.id !== socketID)
                    io.to(socketID).emit("newMeetingMember", socket.id);
            });
        }
    });
    socket.on("requestNewRoom", function () {
        var meetingID = randomstring.generate(5);
        meetingRooms[meetingID] = new Array(socket.id);
        socket.emit("meetingID", meetingID);
    });
    socket.on("requestMeetingMembers", function (data) {
        console.log(data);
        socket.emit("meetingMembers", meetingRooms[data]);
    });
    socket.on("transferSDPMeeting", function (data) {
        var x = data;
        x.from = socket.id;
        console.log(x);
        io.to(data.to).emit("meetingSDPTransfer", x);
    });
    socket.on("leaveMeeting", function (_a) {
        var meetingID = _a.meetingID;
        meetingRooms[meetingID].forEach(function (sid) {
            io.to(sid).emit("removeMeetingPeer", { socketID: sid });
        });
    });
    socket.on("notifyScreenSharing", function (data) {
        meetingRooms[data.roomID].forEach(function (sid) {
            io.to(sid).emit("screenshareMode", {
                sid: socket.id,
                status: data.status
            });
        });
    });
});
server.listen(process.env.PORT, function () {
    console.log("Backend running at port 3001");
});
module.exports = app;
