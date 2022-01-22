import "reflect-metadata";
const express = require("express");
import { Socket } from "socket.io";
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socket = require("socket.io");
const randomstring = require("randomstring");
const bcrypt = require("bcrypt");
const decodeToken = require("./library/decodeToken");
const _ = require("underscore");
import MBTIComp from "./library/compability.json";
const multer = require("multer");
const mailer = require("nodemailer");
const cloudinary = require("cloudinary");
import formidable from "formidable";

import SQLConfig from "./db/ormconfig";
import UserSQL from "./models/SQL/entity/User.entity";
import FriendshipSQL from "./models/SQL/entity/Friendship.entity";
import ReportSQL from "./models/SQL/entity/Report.entity";
import {
  createConnection,
  createQueryBuilder,
  getConnection,
  getRepository,
} from "typeorm";
import FriendFinderProfile from "./models/SQL/entity/FriendFinderProfile.entity";

const app = express();
app.use(express.static("./uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsConfig = {
  credentials: true,
  origin: process.env.FRONTEND_URI,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};
app.use(cors(corsConfig));
app.use(cookieParser());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

createConnection(SQLConfig)
  .then((connection) => {
    console.log("SQL DB Connected");
    app.get("/", (req, res) => {
      res.status(200).send("Server is OK");
    });
    app.post("/user/register", async (req, res) => {
      let email = req.body.email;
      let password = req.body.password;
      let confirm = req.body.confirm;
      let name = req.body.name;
      let username = req.body.username;

      if (password === confirm) {
        let User = new UserSQL();
        User.name = name;
        User.password = await bcrypt.hash(password, 10);
        User.email = email;
        User.username = username;

        try {
          let userResult = await connection.manager.save(User);

          let ffp = new FriendFinderProfile();
          ffp.user = userResult;
          await connection.manager.save(ffp);

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

        if (user) {
          let code = Math.floor(100000 + Math.random() * 900000);
          console.log(code);
          let transporter = mailer.createTransport({
            host: "smtp.zoho.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });

          let mailOptions = {
            from: process.env.EMAIL,
            to: user.email,
            subject: "Email verification code",
            text: `You have registered this email address to WebRTC Chat service. Here is your verification code : ${code}`,
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw err;
          });

          res.status(200).send({ code: code });
        } else {
          res.status(400).send("Token not valid");
        }
      }
    });

    app.post("/user/verifyAccount", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          try {
            await getConnection()
              .createQueryBuilder()
              .update(UserSQL)
              .set({ isVerified: true })
              .where("id = :id", { id: user.id })
              .execute();
            res.status(200).send("OK");
          } catch (error) {
            res.status(500).send("DB error");
          }
        }
      }
    });

    app.post("/user/login", async (req, res) => {
      let email = req.body.email;
      let password = req.body.password;

      let user = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(UserSQL, "user")
        .leftJoinAndSelect("user.friendFinderProfile", "ffp")
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

          let token = require("./library/generateToken")(user);
          console.log(user);

          res.status(200).send({
            user,
            token: token,
          });
        });
      } else {
        res.status(401).send({ errors: ["User not found!"] });
      }
    });

    app.get("/user/findUser", async (req, res) => {
      let keyword = req.query.keyword;

      if (req.query.token) {
        let userData = decodeToken(req.query.token);

        if (userData) {
          try {
            let users = await getConnection()
              .createQueryBuilder()
              .select("user")
              .from(UserSQL, "user")
              .leftJoinAndSelect("user.friendFinderProfile", "ffp")
              .where(
                "LOWER(user.username) like LOWER('%' || :username || '%')",
                {
                  username: keyword,
                }
              )
              .andWhere((qb) => {
                const blocks = qb
                  .subQuery()
                  .select("friendship.user2")
                  .from(FriendshipSQL, "friendship")
                  .where(
                    `friendship.user1 = :uid AND friendship.status = 'BLOCKED'`,
                    { uid: userData.id }
                  )
                  .andWhere(
                    "user.isVerified IS TRUE AND user.isBanned IS FALSE"
                  )
                  .getQuery();

                return "user.id NOT IN " + blocks;
              })
              .getMany();

            res.status(200).send(users);
          } catch (error) {
            console.error(error);
            res.status(500).send();
          }
        }
      }
    });

    app.post("/user/addFriend", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        let target = req.body.user;
        if (user && target) {
          let findExistingRelationship = await getConnection()
            .createQueryBuilder()
            .select("friendship")
            .from(FriendshipSQL, "friendship")
            .where(
              "(friendship.user1 = :user AND friendship.user2 = :target) OR (friendship.user1 = :target AND friendship.user2 = :user)",
              { user: user.id, target: target.id }
            )
            .getOne();

          if (findExistingRelationship === undefined) {
            const newFriend1 = new FriendshipSQL();
            newFriend1.user1 = user.id;
            newFriend1.user2 = target.id;
            newFriend1.status = "PENDING";

            const newFriend2 = new FriendshipSQL();
            newFriend2.user1 = target.id;
            newFriend2.user2 = user.id;
            newFriend2.status = "PENDING";

            try {
              await connection.manager.save(newFriend1);
              await connection.manager.save(newFriend2);
              res.status(200).send("Success");
            } catch (error) {
              console.error(error);
              res.status(500).send("DB error");
            }
          } else {
            res.status(400).send("Friendship exists");
          }
        } else {
          res.status(401).send({ errors: "Invalide Token" });
        }
      } else {
        res.status(401).send({ errors: "No Cookie :(" });
      }
    });

    app.post("/user/unfriend", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        if (user) {
          if (req.body.targetID) {
            const target = req.body.targetID;
            try {
              await getConnection()
                .createQueryBuilder()
                .delete()
                .from(FriendshipSQL)
                .where("user1 = :id AND user2 = :target", {
                  id: user.id,
                  target: target,
                })
                .orWhere("user2 = :id AND user1 = :target", {
                  id: user.id,
                  target: target,
                })
                .execute();

              res.status(200).send("OK");
            } catch (error) {
              console.error(error);
              res.status(500).send("DB Error");
            }
          } else {
            res.status(400).send("No target user ID");
          }
        } else {
          res.status(400).send({ errors: ["Invalid token"] });
        }
      } else {
        res.status(400).send({ errors: ["No Token"] });
      }
    });

    app.get("/user/getPendingFriends", async (req, res) => {
      if (req.query.token) {
        let user = decodeToken(req.query.token);
        if (user) {
          let pendings = await connection
            .getRepository(FriendshipSQL)
            .createQueryBuilder("friendship")
            .leftJoinAndSelect("friendship.user2", "user")
            .leftJoinAndSelect("user.friendFinderProfile", "ffp")
            .where("status = :status AND friendship.user1 = :user", {
              status: "PENDING",
              user: user.id,
            })
            .getMany();

          res.status(200).send(pendings);
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.get("/user/getFriends", async (req, res) => {
      if (req.query.token) {
        let user = decodeToken(req.query.token);
        if (user) {
          let friends = await getConnection()
            .createQueryBuilder()
            .select("friendship")
            .from(FriendshipSQL, "friendship")
            .leftJoinAndSelect("friendship.user2", "user2")
            .leftJoinAndSelect("user2.friendFinderProfile", "ffp")
            .where("friendship.user1 = :id", { id: user.id })
            .andWhere("friendship.status = :status", { status: "FRIEND" })
            .getMany();

          res.status(200).send(friends.map((friend) => friend.user2));
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.post("/user/blockUser", async (req, res) => {
      if (!req.body.token) {
        res.status(400).send("no token");
        return;
      }

      const userData = decodeToken(req.body.token);
      const target = req.body.target;

      let friendshipExist = await connection
        .getRepository(FriendshipSQL)
        .createQueryBuilder("friendship")
        .where("friendship.user1 = :user1 and friendship.user2 = :user2", {
          user1: userData.id,
          user2: target,
        })
        .getOne();

      if (friendshipExist) {
        try {
          await getConnection()
            .createQueryBuilder()
            .update(FriendshipSQL)
            .set({ status: "BLOCK" })
            .where(
              "(friendship.user1 = :user1 and friendship.user2 = :user2) OR (friendship.user2 = :user1 and friendship.user1 = :user2)",
              {
                user1: userData.id,
                user2: target,
              }
            )
            .execute();

          res.status(200).send("OK");
        } catch (error) {
          console.log(error);
          res.status(500).send("DB Error");
        }
      } else {
        const newFriend1 = new FriendshipSQL();
        newFriend1.user1 = userData.id;
        newFriend1.user2 = target;
        newFriend1.status = "BLOCK";

        const newFriend2 = new FriendshipSQL();
        newFriend2.user1 = target;
        newFriend2.user2 = userData.id;
        newFriend2.status = "BLOCK";

        try {
          await connection.manager.save(newFriend1);
          await connection.manager.save(newFriend2);
          res.status(200).send("Success");
        } catch (error) {
          console.error(error);
          res.status(500).send("DB error");
        }
      }
    });

    app.get("/user/getBlocks", async (req, res) => {
      if (req.query.token) {
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.post("/user/acceptFriendRequest", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        let target = req.body.target;

        if (user) {
          try {
            await getConnection()
              .createQueryBuilder()
              .update(FriendshipSQL)
              .set({ status: "FRIEND" })
              .where(
                "(user1 = :user1 AND user2 = :user2) OR (user1 = :user2 AND user2 = :user1)",
                { user1: user.id, user2: target }
              )
              .execute();

            res.status(200).send("Success");
          } catch (error) {
            console.error(error);
            res.status(500).send("DB error");
          }
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.post("/user/rejectFriendRequest", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);
        let target = req.body.target;

        if (user) {
          try {
            await getConnection()
              .createQueryBuilder()
              .delete()
              .from(FriendshipSQL)
              .where(
                "(user1 = :user1 AND user2 = :user2) OR (user1 = :user2 AND user2 = :user1)",
                { user1: user.id, user2: target }
              )
              .execute();

            res.status(200).send("Success");
          } catch (error) {
            console.error(error);
            res.status(500).send("DB error");
          }
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.put("/user/updateMBTI", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          let result = await getConnection()
            .createQueryBuilder()
            .update(FriendFinderProfile)
            .set({ MBTI: req.body.type, answers: req.body.answers })
            .where("id = :id", { id: user.friendFinderProfile.id })
            .execute();
          if (result.affected?.valueOf) {
            console.log(result.affected?.valueOf);
            res.status(200).send("Success");
          } else {
            res.status(500).send("Internal Error");
          }
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.post("/user/updateProfile", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          let userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
          };

          let result = await getConnection()
            .createQueryBuilder()
            .update(UserSQL)
            .set({ name: req.body.name, bio: req.body.bio })
            .where("id = :id", { id: user.id })
            .execute();

          if (result.affected?.toString) {
            res.status(200).send({
              user: userData,
            });
          } else {
            res.status(500).send("Internal DB Error");
          }
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.put("/user/changePassword", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

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

          let oldUser = await getConnection()
            .createQueryBuilder()
            .select(["user.password"])
            .from(UserSQL, "user")
            .where("id = :d", { id: user.id })
            .getOne();

          bcrypt.compare(
            req.body.old,
            oldUser?.password,
            async (err, passCompareResult) => {
              if (err) {
                console.error(err);
                return;
              }

              if (passCompareResult) {
                let newHashedPassword = await bcrypt.hash(req.body.new, 10);

                try {
                  await getConnection()
                    .createQueryBuilder()
                    .update(UserSQL)
                    .set({ password: newHashedPassword })
                    .where("id = :id", { id: user.id })
                    .execute();

                  res.status(200).send("Success");
                } catch (error) {
                  console.error(error);
                  res.status(500).send({ errors: error });
                  return;
                }
              } else {
                res.status(401).send("Old password doesn't match");
                return;
              }
            }
          );
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.get("/user/getFriendsRecommendation", async (req, res) => {
      if (req.query.token) {
        let userData = decodeToken(req.query.token);

        if (!userData.friendFinderProfile.MBTI) {
          res.status(401).send("User doesnt have MBTI type yet!");
          return;
        }

        try {
          const subquery = createQueryBuilder()
            .subQuery()
            .select("friendship.user2")
            .distinct(true)
            .from(FriendshipSQL, "friendship")
            .where("friendship.user1 = :id", { id: userData.id })
            .getQuery();

          let users = await getRepository(UserSQL)
            .createQueryBuilder()
            .select("f")
            .distinct(true)
            .from(FriendshipSQL, "f")
            .leftJoin(UserSQL, "u", "u.id = f.user2")
            .leftJoinAndSelect("f.user2", "fJoin")
            .leftJoinAndSelect("fJoin.friendFinderProfile", "ffp")
            .where("f.user1 IN " + subquery)
            .andWhere("f.user2 NOT IN " + subquery)
            .andWhere("f.user2 <> :id", { id: userData.id })
            .getMany();

          let mutuals: any = users.map((user) => user.user2);

          //count the duplicates.
          const mutualsCount = mutuals.reduce((acc, curr) => {
            const key = curr.id;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});

          //remove duplicate user in mutuals array
          mutuals = [...new Map(mutuals.map((u) => [u.id, u])).values()];

          mutuals.forEach((mutualUser, index) => {
            mutuals[index].mutualsCount = mutualsCount[mutualUser.id];
            if (
              !mutualUser.friendFinderProfile.MBTI ||
              !mutualUser.friendFinderProfile.answers
            ) {
              mutuals[index].isMBTICompatible = false;
              mutuals[index].sameAnswerCount = null;
              return;
            }

            mutuals[index].isMBTICompatible = MBTIComp[
              userData.friendFinderProfile.MBTI
            ].includes(mutualUser.friendFinderProfile.MBTI);

            mutuals[index].hasMutualFriend = true;

            //count same answer
            let count = 0;
            userData.friendFinderProfile.answers.forEach((usersAnswer, num) => {
              if (usersAnswer === mutualUser.friendFinderProfile.answers[num]) {
                count++;
              }
              return;
            });

            mutuals[index].sameAnswerCount = count;

            //below are the codes for calculating the score
            const tmf = mutualsCount[mutualUser.id]; //TOTAL MUTUAL FRIEND
            const cp = mutuals[index] ? 1 : 0; //Compatible Personality. Is MBTI compatible or not
            const sa = mutuals[index].sameAnswerCount; //Same Answers. Total MBTI questions with same answers
            const tq = 10; //Total Questions. Total MBTI Test questions

            const score =
              tmf * 2 + (cp * 100 * 50) / 100 + ((sa / tq) * 100 * 50) / 100;
            mutuals[index].score = score;
          });
          //sort users by their compability score
          mutuals = mutuals.sort((a, b) => b.score - a.score);
          res.status(200).send(mutuals);
        } catch (error) {
          console.error(error);
          res.status(500).send("DB error");
        }

        //res.status(200).send(users?.friends);
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.post("/user/uploadProfilePicture", async (req, res, next) => {
      if (req.query.token) {
        let user = decodeToken(req.query.token);

        if (user) {
          const form = formidable({});
          form.parse(req, (err, fields, files) => {
            cloudinary.v2.uploader.upload(
              files.file.filepath,
              async (err, result) => {
                if (err) {
                  res.status(500).send("CDN Error");
                }
                try {
                  await getConnection()
                    .createQueryBuilder()
                    .update(UserSQL)
                    .set({ profilepicture: result.secure_url })
                    .where("id = :id", { id: user.id })
                    .execute();

                  res.status(200).send("OK");
                } catch (error) {
                  res.status(500).send("DB error");
                }
              }
            );
          });
        } else {
          res.status(400).send({ errors: ["Token not valid"] });
        }
      } else {
        res.status(400).send("No Token");
      }
    });

    app.get("/user/getBannedUsers", async (req, res) => {
      try {
        let users = await getConnection()
          .createQueryBuilder()
          .select("user")
          .from(UserSQL, "user")
          .leftJoinAndSelect("user.friendFinderProfile", "ffp")
          .where("user.isBanned = true")
          .getMany();

        res.status(200).send(users);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal DB Error");
      }
    });

    app.post("/user/unbanUser", async (req, res) => {
      try {
        await getConnection()
          .createQueryBuilder()
          .update(UserSQL)
          .set({ isBanned: false })
          .where("user.id = :id", { id: req.body.userID })
          .execute();

        res.status(200).send("User unbanned!");
      } catch (error) {
        res.status(500).send("DB Error");
      }
    });

    app.post("/user/sendResetPasswordCode", async (req, res) => {
      let email = req.body.email;

      let user = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(UserSQL, "user")
        .where("user.email = :email", { email: email })
        .getOne();

      if (user !== undefined) {
        let code = Math.floor(100000 + Math.random() * 900000);
        let transporter = mailer.createTransport({
          host: "mail.ivanchristian.me",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        let mailOptions = {
          from: process.env.EMAIL,
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

    app.post("/user/resetPassword", async (req, res) => {
      let password = req.body.password;
      let email = req.body.email;

      let user = await getConnection()
        .createQueryBuilder()
        .select("user")
        .from(UserSQL, "user")
        .where("user.email = :email", { email: email })
        .getOne();

      if (user !== undefined) {
        let hashedPass = await bcrypt.hash(password, 10);
        try {
          await getConnection()
            .createQueryBuilder()
            .update(UserSQL)
            .set({ password: hashedPass })
            .where("email = :email", { email: email })
            .execute();

          res.status(200).send("Success");
        } catch (error) {
          console.error(error);
          res.status(500).send("DB error");
        }
      }
    });

    app.post("/report/create", async (req, res) => {
      if (req.body.token) {
        let user = decodeToken(req.body.token);

        if (user) {
          try {
            const report = new ReportSQL();
            report.reporter = req.body.reporter;
            report.reportee = req.body.reportee;
            report.type = req.body.proof ? "Chat" : "Profile";
            report.category = req.body.category;
            report.proof = JSON.stringify(req.body.proof) || "";
            report.description = req.body.description;
            report.status = "Open";
            report.timestamp = new Date();

            await connection.manager.save(report);
            res.status(200).send("OK");
          } catch (error) {
            console.error(error);
            res.status(500).send("DB error");
          }
        } else {
          res.status(400).send({ errors: ["Invalid token. Try re-login?"] });
        }
      } else {
        res.status(400).send({ errors: ["No Cookie??? :("] });
      }
    });

    app.get("/report/getAllReports", async (req, res) => {
      try {
        let reports = await getConnection()
          .createQueryBuilder()
          .select("report")
          .from(ReportSQL, "report")
          .getMany();

        res.status(200).send(reports);
      } catch (error) {
        console.error(error);
        res.status(500).send("DB error");
      }
    });

    app.post("/report/closeReport", async (req, res) => {
      if (req.body.banReportee) {
        try {
          await getConnection()
            .createQueryBuilder()
            .update(UserSQL)
            .set({
              isBanned: true,
              banDate: new Date(),
              banReportID: req.body.reportID,
            })
            .where("id = :id", { id: req.body.reporteeID })
            .execute();
        } catch (error) {
          res.send(500).send("DB error");
          return;
        }
      }

      try {
        await getConnection()
          .createQueryBuilder()
          .update(ReportSQL)
          .set({
            status: "Closed",
            closedDate: new Date(),
            isReporteeBanned: req.body.banReportee,
          })
          .where("id = :id", { id: req.body.reportID })
          .execute();

        res.status(200).send("Success");
      } catch (error) {
        res.status(500).send("DB error");
      }
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
        // const duplicateUser = Object.keys(users).find((key) => {
        //   let user = users[key];
        //   if (user != null) {
        //     if (user.id == userData.id) {
        //       console.log(
        //         `Found duplicate online user. Disconnecting the newer one. ${JSON.stringify(
        //           userData
        //         )}`
        //       );
        //       socket.emit("duplicateLogin", { duplicate: true });
        //       socket.disconnect();
        //       //io.sockets.sockets[key].disconnect(true);
        //       users[key] = null;
        //       delete users[key];
        //     }
        //   } else {
        //     socket.disconnect();
        //   }
        // });
        const duplicateUser = false;

        if (!duplicateUser) {
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
