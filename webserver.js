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
    .toArray((err, postResult) => {
      // post 게시물 id를 기준으로 그 게시물의 댓글들만 가져옴
      db.collection("comment")
        // { post_id : postResult._id } 뒤에 아무거나 넣으면 모든 데이터가 나옴 웨나옴?
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

app.get("/test", (req, res) => {
  db.collection("comment")
    .find({ post_id: 0 })
    .toArray((err, postResult) => {
      console.log("3");
      console.log(postResult);
    });
});

app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.get("/signup", (req, res) => {
  return res.render("signup.ejs");
});


app.post('/signup',(req, res) => {
  
  db.collection('user').insertOne({
      phone : req.body.phone, 
      name : req.body.name,
      pw : req.body.pw,
      birth : req.body.birth,
      region : req.body.region,
      tag : req.body.tag,
      regidate : getCurrentDate()
  }, function(err, result){
      console.log('저장완료');
      
      //index 카운트
      // db.collection('counter').updateOne({name : 'usercnt'}, { $inc : {cnt : 1}}, function(err, result){
      //   //usercnt 1만큼 증가
      //   if(err) return console.log(err);
      //   })
      
  })
  res.redirect('/login');
});


//각각의 카테고리 페이지를 아래의 함수 반복으로 처리할 예정
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

app.post("/add", (req, res) => {
  console.log(req.body.title);
  console.log(req.body.date);

  db.collection("counter").findOne({ name: "postcnt" }, (err, result) => {
    if (err) return console.log(err);
    console.log("토탈포스트는 : " + result.cnt);
    var postCount = result.cnt;

    // passport.serializeUser(function(user, done)에 있는 user를 받아서 사용
    db.collection("post").insert(
      {
        _id: postCount + 1,
        writer: req.user._id,
        content: req.body.content,
        createdate: getCurrentDate(),
      },
      function (err, result) {
        console.log("저장 완료");

        db.collection("counter").updateOne(
          { name: "postcnt" },
          { $inc: { cnt: 1 } },
          function () {
            if (err) return console.log(err);
          }
        );
      }
    );
  });
  res.redirect("/post");
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

      res.render("group_info.ejs", { posts: result });
    }
  );
});

//현재 날짜(nnnn년 n월 n일) 가져오기
//연, 월
const nowdate = new Date()
const thisYear = nowdate.getFullYear()
const thisMonth = nowdate.getMonth()+1
// console.log(thisYear, thisMonth)
//일
// const prevLast = new date(thisYear, thisMonth, 0)
const lastDate = new Date(thisYear, thisMonth, 0).getDate()
const thisDates = [...Array(lastDate+1).keys()].splice(1)
// console.log(thisDates)

app.get("/homework", (req, res) => {
  //:id == gid, 해당 모임의 해당 월 숙제 데이터 find
  const gid = 200
  
  db.collection('homework').find({ group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth}).toArray((err, result)=>{
    if(err) console.log(err)
    console.log(result)
    console.log(result.length)
    if(result.length===0){
      //데이터가 없으면, 해당 월의 날짜만큼 숙제 데이터 insert
      // res.send(`그룹아이디 ${gid}의 ${thisMonth}월 숙제 데이터가 없습니다.`)

      //해당 모임의 모임원 id 가져오고, 숙제 이행 여부(success)를 defalut값(false)으로 적용
      db.collection('group').findOne({ _id : gid},(err, result)=>{
        if(err) console.log(err)
        console.log(result)

        let hw = []
        let memSuccess = {}
        const members = result.member

        members.forEach(member=>{
          memSuccess[member] = false
        })  
        console.log('내부',memSuccess) 

        //insert할 데이터 리스트
        thisDates.forEach(d=>{
          hw.push({
            content: '',
            date:{
              y: thisYear,
              m: thisMonth,
              d: d
            },
            group_id : gid,
            success : memSuccess
          })
        })
        console.log('내부', hw)
        //insert
        db.collection('homework').insertMany(hw, (err, result)=>{
          if(err) console.log(err)
          console.log(result)
        })
      })
    }
    //데이터가 있으면, 바로 render
    return res.render("homework.ejs", {homeworks: result});
  })
});

app.put('/homework', (req, res)=>{
  console.log(req.body)
  const inputValues = req.body
  const gid = 200 //group_id
  
  //날짜별로 update
  for(const key in inputValues){
    // console.log(parseInt(key))
    db.collection('homework').updateOne(
      { group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth, 'date.d' : parseInt(key)}, 
      { $set: { content : inputValues[key] }},
      (err, result)=>{
        if (err) return console.log(err);
        // console.log('group_id: '+ gid + ', ' + parseInt(key)+'일 숙제수정완료');
    })
  }
  res.status(200).send({message : 'put요청으로 데이터 전달, 해당 그룹의 숙제 수정 완료'})
})

app.get("/bat", (req, res) => {
  const gid = 200
  
  db.collection('homework').find({ group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth}).toArray((err, result)=>{
    if(err) console.log(err)
    console.log(result)
    console.log(result.length)
    if(result.length===0){
      //해당 그룹의 해당 월 숙제 데이터가 없는 상태.
      //#### 방장이면, 숙제 처리로 이동? 나머지 인원은 모달창 띄워줌? #### 어떻게 할 것???
      return res.render("homework.ejs");
    }
    console.log(result)
    // console.log(result[result.legth-1])
    return res.render("bat.ejs", {homeworks: result});
  })

})

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