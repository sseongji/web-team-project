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
  return res.render("search.ejs");
});

app.get("/group_add", (req, res) => {
  return res.render("group_sign.ejs");
});

app.post("/group_upload", (req, res) => {
  let username = req.body.Name;

  console.log(username);
  // db.collection("group").insertOne(
  //   { id: username },

  //   function (err, result) {
  //     if (err) return console.log(err);
  //     console.log("수정 완료");
  //     res.redirect("/search");
  //   }
  // );
});

app.get("/group", (req, res) => {
  return res.render("group_info.ejs");
});

app.get("/homework", (req, res) => {
  // // 현재시간을 한국 시간 기준으로(+9h)
  // const curr = new Date()
  // const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000)
  // const KR_TIME_DIFF = 9 * 60 * 60 * 1000
  
  // console.log(new Date(utc+KR_TIME_DIFF))

  db.collection('homework').insertOne({
    content: '단어 외우기2',
    date: new Date(),
    success: {one: false, two: true, three: true},
    createdate: new Date(),
    group_id: 200
    },(err, result)=>{
      if(err) return console.log(err)
      console.log('저장완료')
  })
  
  return res.render("homework.ejs");
});
