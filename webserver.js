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

//(app == http) express Server
const handleListening = () => {
  console.log(`Server listening on port http://localhost:${process.env.PORT}`);
};

// multer 설정(사진 업로드)
let multer = require("multer");
const path = require("path");

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



app.get("/mypage", loginCheck, (req, res) => {
  res.render("mypage.ejs", { userSession : req.user });
});

function loginCheck(req, res, next){
  if (req.user) {
    next()
  } else {
    res.render("login.ejs");
  }
}


app.post('/uploadProfile', upload.single('myImage'), (req, res) => {
  // res.render('mypage', {
  //   file : './public/image/${req.file.filename}'
  // })
});

app.get("/changeprivacy", (req, res) => {
  return res.render("changeprivacy.ejs");
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
    //이메일 중복 아닐 시
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
    } else {
      res.send("중복");
    }
  } catch (err) {
    console.log(err);
  }
});

//이메일 인증
app.post("/cert", async (req, res) => {
  const code = req.body.code;
  const hashAuth = req.cookies.hashAuth;
  console.log(code);

  try {
    if (bcrypt.compareSync(code, hashAuth)) {
      res.send({ result: "success" });
    } else {
      res.send({ result: "fail" });
    }
  } catch (err) {
    res.send({ result: "fail" });
    console.error(err);
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
});
passport.deserializeUser((userid, done) => {
  db.collection("user").findOne({ email: userid }, function (err, result) {
    done(null, result);
  });
});

// db의 post collection을 post.ejs에 result로 전달 (게시물) -> 게시판이라서 역순으로 출력
app.get("/post", (req, res) => {
  db.collection("post")
    .find()
    .sort({ _id: -1 })
    .toArray((err, postResult) => {
      // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
      db.collection("comment")
        .find()
        .toArray((err, commentResult) => {
          // 게시물, 댓글을 post.ejs로 전달
          res.render("post.ejs", {
            posts: postResult,
            comments: commentResult,
          });
        });
    });
});

// 게시물 작성
app.post("/add", (req, res) => {
  console.log(`글 내용 : ${req.body.contents}`);

  db.collection("index").findOne({ name: "postcnt" }, (err, result) => {
    console.log(`result.cnt : ${result.cnt}`);

    var totalcount = result.cnt;

    db.collection("post").insertOne(
      {
        _id: totalcount + 1,
        content: req.body.contents,
        createdate: getCurrentDate(),
        writer: req.body.writer,
        count_id: totalcount + 1,
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
    res.redirect("/post");
  });
});

// 댓글 작성
app.post("/addComment", (req, res) => {
  console.log(`댓글 내용 : ${req.body.comment}`);

  db.collection("index").findOne({ name: "commentcnt" }, (err, result) => {
    console.log(`result.cnt : ${result.cnt}`);

    var totalcount = result.cnt;

    db.collection("comment").insertOne(
      {
        _id: totalcount + 1,
        content: req.body.comment,
        createdate: getCurrentDate(),
        writer: req.body.writer,
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
    res.redirect("/post");
  });
});

// 게시물 수정
app.put("/edit", (req, res) => {
  console.log(req.body);
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { content: req.body.editContent } },
    (err, result) => {
      if (err) return console.log(err);
      console.log(result);
      console.log("수정 완료");
      res.redirect("/post");
    }
  );
});

// // 게시물 수정 url 진입(별도 url 진입을 안하게 수정해서 사용 안할 예정)
// app.get("/edit/:id", (req, res) => {
//   console.log(req.params.id);

//   db.collection("post").findOne(
//     { _id: parseInt(req.params.id) },
//     function (err, result) {
//       if (err) return console.log(err);
//       console.log(result);
//       res.render("edit.ejs", { post: result });
//     }
//   );
// });

// 게시물 삭제
app.delete("/delete", (req, res) => {
  console.log(`게시물 id : ${req.body._id}`);
  req.body._id = parseInt(req.body._id);
  // post에 저장된 _id, 로그인한 유저의 _id
  var deleteData = { _id: req.body._id, _id: req.body._id };
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

//그룹 생성 페이지
app.get("/group_add", (req, res) => {
  return res.render("group_sign.ejs");
});

//그룹 생성 과정
app.post("/group_upload", upload.single("Img"), (req, res) => {
  console.log(req.body);
  let members = req.body.member.split(",");

  db.collection("group").insertOne(
    {
      name: req.body.Name,
      member: members,
      notice: req.body.Notice,
      intro: req.body.Description,
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
});

app.get("/group/:id", (req, res) => {
  let myId = req.params.id;

  db.collection("group").findOne(
    { _id: ObjectId(myId) },
    function (err, result) {
      if (err) return console.log(err);
      console.log(result);
      res.render("group_info.ejs", { posts: result, myId });
    }
  );
});

//유저 그룹 가입 기능
app.get("/group/:id/register", (req, res) => {
  let params = req.params.id;
  res.render("group_register.ejs", { params: params });
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
              console.log(result);
              res.render("group_info.ejs", { posts: result, myId });
            }
          );
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
            // console.log(result);
            return res.render("homework.ejs", { homeworks: result });
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

  console.log(req.body);
  const inputValues = req.body;

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
        // console.log('group_id: '+ gid + ', ' + parseInt(key)+'일 숙제수정완료');
      }
    );
  }
  res
    .status(200)
    .send({ message: "put요청으로 데이터 전달, 해당 그룹의 숙제 수정 완료" });
});

let g_members = [];

app.get("/group/:id/bat", (req, res) => {
  let myId = req.params.id;
  const members = () =>
    db
      .collection("group")
      .findOne({ _id: ObjectId(myId) }, function (err, result) {
        if (err) return console.log(err);

        for (let i = 0; i < result.member.length; i++) {
          g_members.push(result.member[i].name);
        }
      });

  //render할 데이터 세팅
  const setReturn = (result) => {
    //모임원
    const mems = result[result.length - 1].success;
    const memIds = Object.keys(mems);
    console.log(memIds);
    //오늘의 숙제
    // console.log(nowdate.getDate())
    const idx = result.length + nowdate.getDate() - lastDate - 1; //(길이 + 오늘(일) - 이번달마지막(일) - 1)
    const todayHomework = result[idx].content;
    // console.log(todayHomework);

    //이번 달, 참여한 숙제 수
    // [...thisDates].splice(today)
    let score = [];
    let percentageScore = 0;
    memIds.forEach((memId) => {
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
    // console.log(score);
    return res.render("bat.ejs", {
      homeworks: result,
      members: memIds,
      todayHomework: todayHomework,
      score: score,
      params: req.params.id,
    });
  };

  db.collection("homework")
    .find({ group_id: gid, "date.y": thisYear, "date.m": thisMonth })
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
          .find({ group_id: gid, "date.y": thisYear, "date.m": thisMonth })
          .toArray((err, result) => {
            if (err) console.log(err);
            // console.log(result);
            setReturn(result);
          });
      } else {
        setReturn(result);
      }
    });
});

app.put("/group/:id/bat", (req, res) => {
  //gid == group_id

  // const gid = req.params.id;

  // console.log(gid);

  console.log(req.body);
  const inputValues = req.body;
  const setKeyString = "success." + inputValues.id;
  console.log(setKeyString);

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
