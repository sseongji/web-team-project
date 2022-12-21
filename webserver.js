const { group } = require("console");
const express = require("express");
const app = express();

//dotenv, 환경변수세팅
require("dotenv").config();
//MongoDB
const mongoClient = require("mongodb").MongoClient;

//ejs
app.set("view engine", "ejs");
//public folder
app.use("/public", express.static("public"));

//bodyParser(req.body 사용용도)
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

//(app == http) express Server
const handleListening = () => {
  console.log(`Server listening on port http://localhost:${process.env.PORT}`);
};

// multer 설정(사진 업로드)
let multer = require("multer");
const path = require("path");

// moment 설정(현재 날짜 설정하는 라이브러리)
const moment = require("moment");

//const { Server } = require("http");
let storage = multer.diskStorage({
  destination: function (req, res, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

let upload = multer({
  storage: storage,
  limits: { fieldSize: 1024 * 1024 * 3 },
});

//db
var db;
mongoClient.connect(process.env.DB_URL, function (err, client) {
  if (err) return console.log(err);
  //db연결
  db = client.db("main");
  app.db = db;

  app.listen(process.env.PORT, handleListening);
});
let ObjectId = require("mongodb").ObjectId;

//session
const session = require("express-session");
app.use(
  session({
    secret: "1111",
    resave: false,
    saveUninitialized: true,
  })
);

//cookie
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//passport
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
app.use(passport.initialize());
app.use(passport.session());

// method-override 사용
const methodOverride = require("method-override"); // 미들웨어
const { brotliDecompress } = require("zlib");
app.use(methodOverride("_method"));

//flash message
const flash = require("connect-flash");
app.use(flash());

//템플릿용 변수 설정
app.use(function (req, res, next) {
  res.locals.error = req.flash("error");
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

//암호화 bcrypt
const bcrypt = require("bcrypt");

//nodemailer
const nodemailer = require("nodemailer");

const ejs = require("ejs");
const { off } = require("process");
const { stringify } = require("querystring");
const appDir = path.dirname(require.main.filename);

//routes

//스터디 페이지
app.get("/study", (req, res) => {
  return res.render("study.ejs");
});

//비밀번호 찾기
app.get("/findpassword", (req, res) => {
  return res.render("findpassword.ejs");
});

app.post("/sendtemppw", (req, res) => {
  const emailaddress = req.body.email;

  db.collection("user").findOne({ email: emailaddress }, (err, user) => {
    if (user) {
      //비밀번호 랜덤 함수
      function createRandomPassword(variable, passwordLength) {
        var randomString = "";
        for (var j = 0; j < passwordLength; j++)
          randomString += variable[Math.floor(Math.random() * variable.length)];
        return randomString;
      }
      var variable =
        "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z".split(
          ","
        );
      var password = createRandomPassword(variable, 8);
      console.log(password);

      let emailTemplate;
      ejs.renderFile(
        appDir + "/views/pwMail.ejs",
        { tempCode: password },
        (err, data) => {
          emailTemplate = data;
        }
      );

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      });

      const mailOptions = {
        from: "공부밭",
        to: emailaddress,
        subject: "임시 비밀번호가 전송되었습니다.",
        html: emailTemplate,
      };

      transporter.sendMail(mailOptions, (err, res) => {
        if (err) {
          console.log("실패");
        } else {
          console.log("성공");
        }
      });
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        db.collection("user").updateOne(
          { email: emailaddress },
          { $set: { pw: hash } },
          function (err, result) {
            if (err) return console.log(err);
          }
        );
      });
      res.send("성공");
    } else {
      res.send("실패");
    }
  });
});

//로그아웃
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
  });
  res.redirect("/");
});

//마이페이지
app.get("/mypage", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("mypage.ejs", { userSession: req.user });
  } else {
    res.redirect("/login");
  }
});

//개인정보수정 페이지
app.get("/changeprivacy", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("changeprivacy.ejs", { userSession: req.user });
  } else {
    res.redirect("/login");
  }
});

app.post("/changeprivacy", (req, res) => {
  const userId = req.user.email;
  const password = req.body.pw;
  const saltRounds = 10;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    db.collection("user").updateOne(
      { email: userId },
      {
        $set: {
          pw: hash,
          nickname: req.body.nickname,
          region: req.body.region,
          tag: req.body.tag,
        },
      },
      function (err, result) {
        if (err) return console.log(err);
      }
    );
    res.redirect("/mypage");
  });
});

//닉네임 중복확인
app.post("/nameCheck", async (req, res) => {
  const nickname = req.body.nickname;
  const existname = await db.collection("user").findOne({ nickname: nickname });
  console.log(existname);
  try {
    if (!existname) {
      res.send("Y");
    } else if (existname) {
      res.send("N");
    }
  } catch (err) {
    console.log(err);
  }
});

//이메일 인증
app.post("/emailAuth", async (req, res) => {
  const emailaddress = req.body.email;
  const existemail = await db
    .collection("user")
    .findOne({ email: emailaddress });

  try {
    if (!existemail) {
      const authNum = Math.random().toString().substr(2, 6);
      const hashAuth = await bcrypt.hash(authNum, 12);

      res.cookie("hashAuth", hashAuth, { maxAge: 300000 });

      let emailTemplate;
      ejs.renderFile(
        appDir + "/views/authMail.ejs",
        { authCode: authNum },
        (err, data) => {
          emailTemplate = data;
        }
      );

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      });

      const mailOptions = {
        from: "공부밭",
        to: emailaddress,
        subject: "회원가입을 위한 인증번호를 입력해주세요.",
        html: emailTemplate,
      };

      await transporter.sendMail(mailOptions, (err, res) => {
        if (err) {
          console.log("실패");
        } else {
          console.log("성공");
        }
      });

      res.send("전송");
    } else {
      res.send("중복");
    }
  } catch (err) {
    console.log(err);
  }
});

//이메일 인증
app.post("/cert", (req, res) => {
  const code = req.body.code;
  const hashAuth = req.cookies.hashAuth;

  if (bcrypt.compareSync(code, hashAuth)) {
    res.send("성공");
  } else {
    res.send("실패");
  }
});

//회원가입
app.get("/signup", (req, res) => {
  return res.render("signup.ejs");
});

app.post("/signup", (req, res) => {
  const usermail = req.body.email;
  const password = req.body.pw;
  const saltRounds = 10;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    db.collection("user").findOne({ email: usermail }, (err, user) => {
      if (!user) {
        db.collection("user").insertOne(
          {
            email: usermail,
            nickname: req.body.nickname,
            pw: hash,
            birth: req.body.birth,
            region: req.body.region,
            tag: req.body.tag,
            regidate: getCurrentDate(),
          },
          function (err, result) {
            console.log("저장완료");

            //index 카운트
            // db.collection('counter').updateOne({name : 'usercnt'}, { $inc : {cnt : 1}}, function(err, result){
            //   //usercnt 1만큼 증가
            //   if(err) return console.log(err);
            //   })
          }
        );
        res.redirect("/login");
      }
    });
  });
});

//로그인
app.get("/login", (req, res) => {
  return res.render("login.ejs");
});

//passport를 이용한 인증 방식
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    res.redirect("/");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "pw",
      session: true,
      passReqToCallback: true,
    },
    function (req, inputmail, inputpw, done) {
      db.collection("user").findOne({ email: inputmail }, function (err, user) {
        if (err) return done(err);
        if (!user) {
          return done(
            null,
            false,
            req.flash("error", "아이디가 존재하지 않습니다.")
          );
        }
        bcrypt.compare(inputpw, user.pw, function (err, result) {
          if (result) {
            return done(null, user);
          } else {
            return done(
              null,
              false,
              req.flash("error", "비밀번호가 일치하지 않습니다.")
            );
          }
        });
      });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user.email);
  console.log(user);
});
passport.deserializeUser((userid, done) => {
  db.collection("user").findOne({ email: userid }, function (err, result) {
    done(null, result);
  });
});

// 마이페이지 내가 쓴 글
app.get("/mypage_postpage/:id", (req, res) => {
  console.log("마이페이지 게시물 조회 시작")
  console.log(req.user.nickname);
  if (req.isAuthenticated()) {
    db.collection("post")
      .find({ writer: new RegExp(req.user.nickname) })
      .sort({ _id: -1 })
      .toArray((err, postResult) => {
        console.log({ postResult });
        // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
        db.collection("comment")
          .find()
          .toArray((err, commentResult) => {
            // 게시물, 댓글을 post.ejs로 전달
            res.render("mypage_postpage.ejs", {
              posts: postResult,
              comments: commentResult,
              userSession: req.user,
            });
          });
      });
  } else {
    res.redirect("/login");
  }
});

// 마이페이지 내가 쓴 댓글
app.get("/mypage_commentpage/:id", (req, res) => {
  console.log("마이페이지 게시물 조회 시작")
  if (req.isAuthenticated()) {
    db.collection("post")
      .find()
      .sort({ _id: -1 })
      .toArray((err, postResult) => {
        console.log({ postResult });
        // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
        db.collection("comment")
          .find({ writer: new RegExp(req.user.nickname) })
          .toArray((err, commentResult) => {
            // 게시물, 댓글을 post.ejs로 전달
            res.render("mypage_commentpage.ejs", {
              posts: postResult,
              comments: commentResult,
              userSession: req.user,
            });
          });
      });
  } else {
    res.redirect("/login");
  }
});

// // post 게시판
// app.get("/group/:id/post", (req, res) => {
//   let groupId = req.params;
//   console.log(`groupId.id : ${groupId.id}`);
//   if (req.isAuthenticated()) {
//     db.collection("post")
//       .find({ group_id: new RegExp(groupId.id) })
//       .sort({ _id: -1 })
//       .toArray((err, postResult) => {
//         console.log({ postResult });
//         // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
//         db.collection("comment")
//           .find()
//           .toArray((err, commentResult) => {
//             // 게시물, 댓글을 post.ejs로 전달
//             res.render("post.ejs", {
//               posts: postResult,
//               comments: commentResult,
//               loginUser: req.user,
//               groupid: groupId,
//             });
//           });
//       });
//   } else {
//     res.redirect("/login");
//   }
// });

// post 게시판
app.get("/group/:id/group_postpage", (req, res) => {
  console.log(`group.id : ${req.params.id}`);
  if (req.isAuthenticated()) {
    db.collection("post")
      .find({ group_id: new RegExp(req.params.id) })
      .sort({ _id: -1 })
      .toArray((err, postResult) => {
        //console.log({ postResult });
        // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
        db.collection("comment")
          .find()
          .toArray((err, commentResult) => {
            db.collection("group").findOne(
              { _id: ObjectId(req.params.id) },
              (err, groupResult) => {
                if (err) return console.log(err);
                console.log({ groupResult });
                // 게시물, 댓글을 post.ejs로 전달
                res.render("group_postpage.ejs", {
                  posts: postResult,
                  comments: commentResult,
                  loginUser: req.user,
                  group: groupResult,
                });
              }
            );
          });
      });
  } else {
    res.redirect("/login");
  }
});

// 게시물 검색
app.get("/group/:id/post_search", (req, res) => {
  let group = req.params;
  console.log(`검색 group.id : ${group.id}`);
  console.log(`검색창에 입력한 value 값 : ${req.query.value}`);
  console.log(`선택한 오브젝트 : ${req.query.obj}`);
  let obj = req.query.obj;
  let searchResult = `'${req.query.value}'에 대한 검색 결과`;
  if (req.query.value != "") {
    if (req.isAuthenticated()) {
      // 바이너리 검색
      if (obj == "content") {
        db.collection("post")
          .find({
            group_id: new RegExp(group.id),
            content: new RegExp(req.query.value),
          })
          .sort({ _id: -1 })
          .toArray((err, postResult) => {
            //console.log(postResult);
            db.collection("comment")
              .find()
              .toArray((err, commentResult) => {
                // 게시물, 댓글을 post.ejs로 전달
                res.render("post_search.ejs", {
                  posts: postResult,
                  comments: commentResult,
                  searchtxt: searchResult,
                  loginUser: req.user,
                  groupid: group,
                });
              });
          });
      } else if (obj == "writer") {
        db.collection("post")
          .find({
            group_id: new RegExp(group.id),
            writer: new RegExp(req.query.value),
          })
          .sort({ _id: -1 })
          .toArray((err, postResult) => {
            console.log(postResult);
            db.collection("comment")
              .find()
              .toArray((err, commentResult) => {
                // 게시물, 댓글을 post.ejs로 전달
                res.render("post_search.ejs", {
                  posts: postResult,
                  comments: commentResult,
                  searchtxt: searchResult,
                  loginUser: req.user,
                  groupid: group,
                });
              });
          });
      } else if (obj == "createdate") {
        db.collection("post")
          .find({
            group_id: new RegExp(group.id),
            createdate: new RegExp(req.query.value),
          })
          .sort({ _id: -1 })
          .toArray((err, postResult) => {
            console.log(postResult);
            db.collection("comment")
              .find()
              .toArray((err, commentResult) => {
                // 게시물, 댓글을 post.ejs로 전달
                res.render("post_search.ejs", {
                  posts: postResult,
                  comments: commentResult,
                  searchtxt: searchResult,
                  loginUser: req.user,
                  groupid: group,
                });
              });
          });
      }
    } else {
      res.redirect("/login");
    }
  }
});

// 게시물 작성
app.post("/group/:id/add", (req, res) => {
  let group = req.params;
  if (req.isAuthenticated()) {
    console.log(`글 내용 : ${req.body.contents}`);

    db.collection("index").findOne({ name: "postcnt" }, (err, result) => {
      console.log(`result.cnt : ${result.cnt}`);

      var totalcount = result.cnt;

      db.collection("post").insertOne(
        {
          _id: totalcount + 1,
          content: req.body.contents,
          // createdate: getCurrentDate(),
          createdate: moment().format("YYYY-MM-DD"),
          createtime: moment().format("hh:mm:ss"),
          writer: req.user.nickname,
          count_id: totalcount + 1,
          group_id: group.id,
        },
        (err, result) => {
          console.log("저장완료");
          //counter라는 컬렉션에 있는 totalPost 1증가시켜주어야 함.
          db.collection("index").updateOne(
            { name: "postcnt" },
            { $inc: { cnt: 1 } },
            () => {
              if (err) return console.log(err);
            }
          );
        }
      );
      res.redirect("/group/" + group.id + "/group_postpage");
    });
  } else {
    res.redirect("/login");
  }
});

// 댓글 작성
app.post("/group/:id/addComment", (req, res) => {
  let group = req.params;
  console.log(group.id);
  if (req.isAuthenticated()) {
    console.log(`댓글 내용 : ${req.body.comment}`);

    db.collection("index").findOne({ name: "commentcnt" }, (err, result) => {
      console.log(`result.cnt : ${result.cnt}`);

      var totalcount = result.cnt;

      db.collection("comment").insertOne(
        {
          _id: totalcount + 1,
          content: req.body.comment,
          // createdate: getCurrentDate(),
          createdate: moment().format("YYYY-MM-DD"),
          createtime: moment().format("hh:mm:ss"),
          writer: req.user.nickname,
          post_id: req.body.post_id,
        },
        (err, result) => {
          console.log("저장완료");
          //counter라는 컬렉션에 있는 totalPost 1증가시켜주어야 함.
          db.collection("index").updateOne(
            { name: "commentcnt" },
            { $inc: { cnt: 1 } },
            () => {
              if (err) return console.log(err);
            }
          );
        }
      );
      res.redirect(`/group/${group.id}/group_postpage`);
    });
  } else {
    res.redirect("/login");
  }
});

// 게시물 수정 url 진입
app.get("/edit/:id", (req, res) => {
  console.log("게시물 수정 화면으로 진입");
  console.log(req.params);
  let groupinfo = req.params;
  console.log(req.params.id);

  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      if (err) return console.log(err);
      console.log(result);
      res.render("edit.ejs", {
        post: result,
        group: groupinfo,
      });
    }
  );
});

// 게시물 수정
app.put("/edit", (req, res) => {
  console.log(req.body);
  console.log(req.body.groupid);
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { content: req.body.contents } },
    (err, result) => {
      if (err) return console.log(err);
      console.log(result);
      console.log("수정 완료");
      // res.send("<script>history.go(-2);</script>"); => 새로고침이 안되서 못쓸듯
      res.redirect(`/group/${req.body.groupid}/group_postpage`);
    }
  );
});

// 게시물 삭제
app.delete("/delete", (req, res) => {
  console.log(`게시물 id : ${req.body._id}`);
  req.body._id = parseInt(req.body._id);
  // post에 저장된 _id, 로그인한 유저의 _id
  var deleteData = { _id: req.body._id, _id: req.body._id };
  console.log(`deleteData : `)
  console.log(deleteData);

  // post에 저장된 _id, 로그인한 유저의 _id의 값이 동일하면 db에서 삭제 요청
  db.collection("post").deleteOne(deleteData, (err, result) => {
    if (err) return console.log(err);
    // 성공하면 200이라는 코드를 보내줌
    console.log("result.deletedCount = " + result.deletedCount);
    if (result.deletedCount == 1) {
      console.log("삭제 성공");
      res.status(200).send({ message: "성공" });
    }
    // 실패하면 400이라는 코드를 보내줌
    else if (result.deletedCount == 0) {
      console.log("삭제 실패");
      res.status(400).send({ message: "실패" });
    }
    // 아이디까지 똑같을떄만 삭제했다는 메시지를 보낼거임
    // 그래야 진짜 삭제했을때만 list.ejs에서 삭제 처리를 할거임
  });
});

// 댓글 삭제
app.delete("/deleteComment", (req, res) => {
  console.log(`댓글 id : ${req.body._id}`);
  req.body._id = parseInt(req.body._id);
  // post에 저장된 _id, 로그인한 유저의 _id
  var deleteData = { _id: req.body._id, _id: req.body._id };
  console.log(`deleteData : `)
  console.log(deleteData);

  // post에 저장된 _id, 로그인한 유저의 _id의 값이 동일하면 db에서 삭제 요청
  db.collection("comment").deleteOne(deleteData, (err, result) => {
    if (err) return console.log(err);
    // 성공하면 200이라는 코드를 보내줌
    console.log("result.deletedCount = " + result.deletedCount);
    if (result.deletedCount == 1) {
      console.log("삭제 성공");
      res.status(200).send({ message: "성공" });
    }
    // 실패하면 400이라는 코드를 보내줌
    else if (result.deletedCount == 0) {
      console.log("삭제 실패");
      res.status(400).send({ message: "실패" });
    }
    // 아이디까지 똑같을떄만 삭제했다는 메시지를 보낼거임
    // 그래야 진짜 삭제했을때만 list.ejs에서 삭제 처리를 할거임
  });
});

// 글쓰기 버튼 누르면 진입
app.get("/write", function (req, res) {
  res.render("write.ejs");
});

// 각 카테고리 페이지 렌더링
let array = ["면접", "인적성", "언어", "자소서", "자격증"];

app.get("/", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result, array: array[0] });
    });
});

app.get("/aptitute", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result, array: array[1] });
    });
});

app.get("/language", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result, array: array[2] });
    });
});

app.get("/resume", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result, array: array[3] });
    });
});

app.get("/license", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result, array: array[4] });
    });
});

//그룹 검색 기능
app.get("/search", (req, res) => {
  console.log(req.query.value);

  let keyword = req.query.value;

  db.collection("group")
    .find({
      name: new RegExp(`${keyword}`, "i"),
    })
    .toArray(function (err, result) {
      if (err) return console.log(err);
      res.render("search_result.ejs", { posts: result });
    });
});

//그룹 생성 페이지
app.get("/group_add", (req, res) => {
  if (req.isAuthenticated()) {
    return res.render("group_sign.ejs");
  } else {
    res.redirect("/login");
  }
});

//그룹 생성 과정
//처음 가입할 때 방장의 정보만 입력가능하도록 수정! (멤버 정보 객체형태로 저장해야함)
app.post("/group_upload", upload.single("Img"), (req, res) => {
  db.collection("user").findOne(
    {
      email: req.session.passport.user,
    },
    function (err, result) {
      delete result.pw;

      db.collection("group").insertOne(
        {
          name: req.body.Name,
          notice: req.body.Notice,
          leader: req.body.leader,
          member: [result],
          img: req.file.filename,
          tag: req.body.tag,
          createdate: getCurrentDate(),
        },
        function (err, result) {
          if (err) return console.log(err);
          console.log("수정 완료");
          res.redirect("/");
        }
      );
    }
  );
});

app.get("/group/:id", (req, res) => {
  let myId = req.params.id;

  db.collection("group").findOne(
    { _id: ObjectId(myId) },
    function (err, result) {
      if (err) return console.log(err);

      res.render("group_info.ejs", { posts: result, myId });
    }
  );
});

//유저 그룹 가입 기능
app.get("/group/:id/register", (req, res) => {
  let params = req.params.id;
  if (req.isAuthenticated()) {
    res.render("group_register.ejs", { params: params });
  } else {
    res.redirect("/login");
  }
});

app.post("/group/:id/register", (req, res) => {
  let myId = req.params.id;
  console.log(req.body);
  console.log(myId);

  db.collection("user").findOne(
    {
      email: req.body.email,
    },
    function (err, result) {
      if (err) return console.log(err);

      db.collection("group").updateOne(
        {
          _id: ObjectId(req.params.id),
        },
        {
          //$push: 새로운 값을 밀어넣는 것
          $push: {
            member: {
              name: req.body.name,
              local: req.body.local,
              intro: req.body.introduce,
              hope: req.body.Hope,
              email: req.body.email,
            },
          },
        },
        function (err, result) {
          if (err) return console.log(err);
          db.collection("group").findOne(
            { _id: ObjectId(myId) },
            function (err, result) {
              if (err) return console.log(err);

              res.render("group_info.ejs", { posts: result, myId });
            }
          );
        }
      );
    }
  );
});

// 그룹 정보 수정

app.get("/group/:id/group_update", (req, res) => {
  let names = [];

  let myId = req.params.id;
  if (req.isAuthenticated()) {
    db.collection("group").findOne(
      {
        _id: ObjectId(myId),
      },
      function (err, result) {
        if (err) return console.log(err);

        for (let index in result.member) {
          names.push(result.member[index].name);
        }

        res.render("group_update.ejs", {
          posts: result,
          members: names,
          param: myId,
        });
      }
    );
  } else {
    res.redirect("/login");
  }
});

app.post("/group/:id/group_update", upload.single("Img"), (req, res) => {
  let names = [];
  db.collection("group").updateOne(
    {
      _id: ObjectId(req.params.id),
    },
    {
      //$set은 값을 대체시켜주는 것
      $set: {
        name: req.body.name,
        notice: req.body.Notice,
        intro: req.body.Description,
        img: req.file.filename,
        tag: req.body.tag,
      },
    },
    function (err, result) {
      if (err) return console.log(err);

      for (let index in result.member) {
        names.push(result.member[index].name);
      }
      res.redirect("/");
    }
  );
});

app.delete("/group/:id/group_update", (req, res) => {
  console.log(req.body);
  db.collection("group").findOne(
    { _id: ObjectId(req.params.id) },
    function (err, result) {
      if (err) return console.log(err);
      result.member.forEach((item, index) => {
        if (item.email === req.body.email) {
          result.member.splice(index, 1);
        }
      });
      console.log(result.member);
      db.collection("group").updateOne(
        {
          _id: ObjectId(req.params.id),
        },
        {
          //$set은 값을 대체시켜주는 것
          $set: {
            member: result.member,
          },
        },
        function (err, result) {
          if (err) return console.log(err);
          console.log(result);
        }
      );
    }
  );
});

//현재 날짜(nnnn년 n월 n일) 가져오기
//연, 월
const nowdate = new Date();
const thisYear = nowdate.getFullYear();
const thisMonth = nowdate.getMonth() + 1;
// console.log(thisYear, thisMonth)
//일
// const prevLast = new date(thisYear, thisMonth, 0)
const lastDate = new Date(thisYear, thisMonth, 0).getDate();
const thisDates = [...Array(lastDate + 1).keys()].splice(1);
// console.log(thisDates)

const gid = 200;

app.get("/group/:id/homework", (req, res) => {
  //해당 모임의 해당 월 숙제 데이터 find
  // const gid = req.params.id;
  // console.log(gid);
  db.collection("homework")
    .find({ group_id: gid, "date.y": thisYear, "date.m": thisMonth })
    .toArray((err, result) => {
      if (err) console.log(err);
      // console.log(result)
      console.log(result.length);
      if (result.length === 0) {
        //데이터 없으면, insert
        insertHomeworkData(gid);

        //다시 조회
        db.collection("homework")
          .find({ group_id: gid, "date.y": thisYear, "date.m": thisMonth })
          .toArray((err, result) => {
            if (err) console.log(err);
            console.log(result);
            return res.render("homework.ejs", {
              homeworks: result,
              params: req.params.id,
            });
          });
      }
      //데이터가 있으면, 바로 render
      else {
        return res.render("homework.ejs", {
          homeworks: result,
          params: req.params.id,
        });
      }
    });
});

app.put("/group/:id/homework", (req, res) => {
  // const gid = group_id

  // let gid = req.params.id;

  // console.log(gid);

  const inputValues = req.body;

  console.log(req.body);

  //날짜별로 update, (오늘부터 마지막날)
  for (const key in inputValues) {
    // console.log(parseInt(key))
    db.collection("homework").updateOne(
      {
        group_id: gid,
        "date.y": thisYear,
        "date.m": thisMonth,
        "date.d": parseInt(key),
      },
      { $set: { content: inputValues[key] } },
      (err, result) => {
        if (err) return console.log(err);
        console.log(result);
        // console.log('group_id: '+ gid + ', ' + parseInt(key)+'일 숙제수정완료');
      }
    );
  }
  res.status(200).send({
    message: "put요청으로 데이터 전달, 해당 그룹의 숙제 수정 완료",
  });
});

app.get("/group/:id/bat", (req, res) => {
  let g_members = [];
  let g_id = req.params.id;

  console.log(`g_id : ${g_id}`);
  db.collection("group").findOne(
    { _id: ObjectId(g_id) },
    function (err, result) {
      if (err) return console.log(err);

      for (let i = 0; i < result.member.length; i++) {
        g_members.push(result.member[i].name);
      }

      //render할 데이터 세팅
      const setReturn = (result) => {
        console.log(result);
        //모임원
        const mems = result[result.length - 1].success;
        const memIds = Object.keys(mems);
        console.log(mems);
        //오늘의 숙제
        // console.log(nowdate.getDate())
        const idx = result.length + nowdate.getDate() - lastDate - 1; //(길이 + 오늘(일) - 이번달마지막(일) - 1)
        console.log(idx);
        const todayHomework = result[idx].content;

        //이번 달, 참여한 숙제 수
        // [...thisDates].splice(today)
        let score = [];
        let percentageScore = 0;
        g_members.forEach((memId) => {
          let attendCnt = 0;
          let trueCnt = 0;
          // (hw.success[mem] === true)
          // console.log(result.slice(0, nowdate.getDate()))
          result.slice(0, nowdate.getDate()).forEach((r) => {
            // console.log(r.success)
            if (memId in r.success) {
              attendCnt += 1;
              if (r.success[memId] === true) {
                trueCnt += 1;
              }
            }
          });
          percentageScore = (trueCnt / attendCnt) * 100;
          console.log(
            memId +
              ", " +
              trueCnt +
              " / " +
              attendCnt +
              ", " +
              Number(percentageScore.toFixed(2)) +
              "(%)"
          ); //소수점둘째자리까지
          //attend(할당된 숙제 개수), success(할당된 숙제 완료한 개수)
          score[memId] = {
            attend: attendCnt,
            success: trueCnt,
            percentage: Number(percentageScore.toFixed(2)),
          };
        });
        // console.log(result);
        return res.render("bat.ejs", {
          homeworks: result,
          members: g_members,
          todayHomework: todayHomework,
          score: score,
          params: req.params.id,
          idx: idx,
        });
      };

      db.collection("homework")
        .find({
          group_id: gid,
          "date.y": thisYear,
          "date.m": thisMonth,
        })
        .toArray((err, result) => {
          if (err) console.log(err);
          // console.log(result);
          // console.log(result.length);
          if (result.length === 0) {
            //해당 그룹의 해당 월 숙제 데이터가 없는 상태.
            //#### 방장이면, 숙제 처리로 이동? 나머지 인원은 모달창 띄워줌? #### 어떻게 할 것???

            //데이터 없으면, insert

            insertHomeworkData(gid);

            db.collection("homework")
              .find({
                group_id: gid,
                "date.y": thisYear,
                "date.m": thisMonth,
              })
              .toArray((err, result) => {
                if (err) console.log(err);
                // console.log(result);
                setReturn(result);
              });
          } else {
            setReturn(result);
          }
        });
    }
  );
});

app.put("/group/:id/bat", (req, res) => {
  //gid == group_id

  // console.log(gid);

  // console.log(req.body);
  const inputValues = req.body;
  const setKeyString = "success." + inputValues.id;

  db.collection("homework").updateOne(
    {
      "date.y": thisYear,
      "date.m": thisMonth,
      "date.d": nowdate.getDate(),
    },
    {
      $set: { [setKeyString]: JSON.parse(inputValues.success) },
    },
    (err, result) => {
      if (err) console.log(err);
      console.log(result);
    }
  );

  res.status(200).send({
    message:
      "put요청으로 데이터 전달, 선택한 모임원 점수와 이행 여부 업데이트 완료",
  });
});

//테스트 homework 데이터 삭제 쿼리
// app.get("/test", (req, res) => {
//   db.collection('homework').deleteMany({group_id : 400})
//   res.send('테스트 데이터 삭제완료.')
// })

//데이터가 없으면, 해당 월의 오늘 포함 이후 날짜만큼 숙제 데이터 insert하고, homework로 render하는 함수
const insertHomeworkData = (gid) => {
  //해당 모임의 모임원 id 가져오고, 숙제 이행 여부(success)를 defalut값(false)으로 적용
  db.collection("group").findOne({ _id: gid }, (err, result) => {
    if (err) console.log(err);
    console.log(result);

    let hw = [];
    let memSuccess = {};
    const members = result.member;

    members.forEach((member) => {
      memSuccess[member] = false;
    });
    // console.log('내부',memSuccess)

    //insert할 데이터 리스트 (오늘 ~ 마지막 날)
    const inputIds = [...thisDates].splice(nowdate.getDate() - 1);

    inputIds.forEach((d) => {
      hw.push({
        content: "",
        date: {
          y: thisYear,
          m: thisMonth,
          d: d,
        },
        group_id: gid,
        success: memSuccess,
      });
    });
    // console.log('내부', hw)
    //insert
    db.collection("homework").insertMany(hw, (err, result) => {
      if (err) console.log(err);
      // console.log(result)
    });
  });
};

//get korea local time
const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  return new Date(
    Date.UTC(year, month, today, hours, minutes, seconds, milliseconds)
  );
};

// 페이지를 찾을 수 없을때 표시
app.all("*", (req, res) => {
  //등록되지 않은 패스에 대해 페이지 오류 응답
  res.status(404).send("<h1>ERROR - 페이지를 찾을 수 없습니다.</h1>");
});
