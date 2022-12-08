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

//routes
app.get("/changeprivacy", (req, res) => {
  return res.render("changeprivacy.ejs");
});

app.get("/login", (req, res) => {
  return res.render("login.ejs");
});

app.get("/post", (req, res) => {
  return res.render("post.ejs");
});

app.get("/signup", (req, res) => {
  return res.render("signup.ejs");
});

app.get("/search", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result });
    });
});

app.get("/group_add", (req, res) => {
  return res.render("group_sign.ejs");
});

app.post("/group_upload", upload.single("Img"), (req, res) => {
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
      res.redirect("/search");
    }
  );
});

app.get("/group", (req, res) => {
  return res.render("group_info.ejs");
});

app.get("/homework", (req, res) => {
  console.log(getCurrentDate());

  const date = new Date()
  const thisYear = date.getFullYear()
  const thisMonth = date.getMonth()+1
  console.log(thisYear, thisMonth)
  //일
  // const prevLast = new date(thisYear, thisMonth, 0)
  const lastDate = new Date(thisYear, thisMonth, 0).getDate()
  const thisDates = [...Array(lastDate+1).keys()].splice(1)
  console.log(thisDates)

  //숙제 데이터 없으면, 특정 그룹명(200)으로 생성
  // db.collection('homework').find().toArray({ group_id : 200, date : {y: thisYear, m: thisMonth+1}}, (err, result)=>{
  const gid = 200
  db.collection('homework').find({ group_id : 200, date : {y: thisYear, m: thisMonth+1}}).toArray((err, result)=>{
    if(err) console.log(err)
    console.log(result)
    console.log(result.length)
    if(!result.length){
      res.send(`그룹아이디 ${gid}의 ${thisMonth}월 숙제 데이터가 없습니다.`)
      // db.collection('homework').insertMany(
      //   []
      // )

    }else{
      return res.render("homework.ejs");
    }

  })

  //test insert
  // db.collection('homework').insertOne({
  //   content: '영어 단어 외우기',
  //   date: getCurrentDate(),
  //   success: {one: false, two: true, three: true},
  //   createdate: getCurrentDate(),
  //   group_id: 200
  //   },(err, result)=>{
  //     if(err) return console.log(err)
  //     console.log('저장완료')
  // })

  //test update
  // db.collection("homework").updateOne(
  //   { content: "영어 단어 외우기" },
  //   {
  //     $set: { "success.one": true, "success.two": true, "success.four": true },
  //   },
  //   (err, result) => {
  //     if (err) return console.log(err);
  //     console.log("수정완료");
  //   }
  // );
});

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
