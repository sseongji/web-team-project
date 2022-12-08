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

  // db의 post collection을 post.ejs에 result로 전달 (게시물)
app.get("/post", (req, res) => {
  db.collection("post")
      .find()
      .toArray( (err, postResult) => {

        // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
        db.collection("comment")
            // { post_id : postResult._id } 뒤에 아무거나 넣으면 모든 데이터가 나옴 웨나옴?
            .find()
            .toArray( (err, commentResult) => {
              // 게시물, 댓글을 post.ejs로 전달
              res.render("post.ejs", { posts: postResult, comments: commentResult });
            });
      });
});

app.get("/test", (req, res) => {
  db.collection("comment")
      .find( {post_id : 0})
      .toArray( (err, postResult) => {
        console.log("3")
        console.log(postResult) 
      })
})

app.get('/write', function(req, res){
  res.render('write.ejs');
})

app.get("/signup", (req, res) => {
  return res.render("signup.ejs");
});

app.get("/", (req, res) => {
  db.collection("group")
    .find()
    .toArray(function (err, result) {
      res.render("search.ejs", { posts: result });
    });
});

app.get("/group_add", (req, res) => {
  return res.render("group_sign.ejs");
});

app.post('/add', (req, res) =>{
  console.log(req.body.title)
  console.log(req.body.date)

  db.collection('counter').findOne({name :'postcnt'}, (err, result) =>{
      if(err) return console.log(err);
      console.log("토탈포스트는 : " + result.cnt);
      var postCount = result.cnt

      // passport.serializeUser(function(user, done)에 있는 user를 받아서 사용
      db.collection('post').insert({_id : postCount + 1, writer : req.user._id, content : req.body.content, createdate : getCurrentDate()}, function(err, result){
          console.log('저장 완료');

          db.collection('counter').updateOne({name : 'postcnt'} , { $inc : {cnt : 1}}, function(){
              if(err) return console.log(err);
          })
      })
  })
  res.redirect("/post");
})
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
      res.redirect("/");
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
