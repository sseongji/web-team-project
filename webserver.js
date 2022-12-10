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
        count_id: totalcount + 1
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
      });
  });
  res.redirect("/post");
});

app.put('/edit', (req, res) => {
  console.log(req.body)
  console.log("진입은 하니?")
  db.collection('post').updateOne(
      { _id : parseInt(req.body.id) },
      { $set : { content : req.body.contents } },
      (err, result) => {
          if (err) return console.log(err);
          console.log(result);
          console.log('수정 완료')
          res.redirect("/post");
      }
  )
})

app.get('/edit/:id', (req, res) => {
  console.log(req.params.id);

  db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result){
      if (err) return console.log(err);
      console.log(result);
      res.render('edit.ejs', {post : result});
  })
})

// 게시물 삭제
app.delete('/delete', (req, res) => {
  console.log(`게시물 id : ${req.body._id}`)
  req.body._id = parseInt(req.body._id);
                   // post에 저장된 _id, 로그인한 유저의 _id
  var deleteData = {_id : req.body._id, _id : req.body._id}
  console.log(deleteData);

  // post에 저장된 _id, 로그인한 유저의 _id의 값이 동일하면 db에서 삭제 요청
  db.collection('post').deleteOne(deleteData, (err, result) => {
      if (err) return console.log(err);
      // 성공하면 200이라는 코드를 보내줌
      console.log('result.deletedCount = ' + result.deletedCount)
      if (result.deletedCount == 1){
          console.log('삭제 성공');
          res.status(200).send({message : '성공'});
      }
      // 실패하면 400이라는 코드를 보내줌
      else if (result.deletedCount == 0){
          console.log('삭제 실패');
          res.status(400).send({message : '실패'});
      }
      // 아이디까지 똑같을떄만 삭제했다는 메시지를 보낼거임
      // 그래야 진짜 삭제했을때만 list.ejs에서 삭제 처리를 할거임
  });
})

// 댓글 삭제
app.delete('/deleteComment', (req, res) => {
  console.log(`댓글 id : ${req.body._id}`)
  req.body._id = parseInt(req.body._id);
                   // post에 저장된 _id, 로그인한 유저의 _id
  var deleteData = {_id : req.body._id, _id : req.body._id}
  console.log(deleteData);

  // post에 저장된 _id, 로그인한 유저의 _id의 값이 동일하면 db에서 삭제 요청
  db.collection('comment').deleteOne(deleteData, (err, result) =>{
      if (err) return console.log(err);
      // 성공하면 200이라는 코드를 보내줌
      console.log('result.deletedCount = ' + result.deletedCount)
      if (result.deletedCount == 1){
          console.log('삭제 성공');
          res.status(200).send({message : '성공'});
      }
      // 실패하면 400이라는 코드를 보내줌
      else if (result.deletedCount == 0){
          console.log('삭제 실패');
          res.status(400).send({message : '실패'});
      }
      // 아이디까지 똑같을떄만 삭제했다는 메시지를 보낼거임
      // 그래야 진짜 삭제했을때만 list.ejs에서 삭제 처리를 할거임
  });
})

// 댓글 달기
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
        post_id: req.body.post_id
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
      });
  });
  res.redirect("/post");
});

// 글쓰기 버튼 누르면 진입
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

const gid = 400

app.get("/homework", (req, res) => {
  //:id == gid, 해당 모임의 해당 월 숙제 데이터 find

  db.collection('homework').find({ group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth}).toArray((err, result)=>{
    if(err) console.log(err)
    // console.log(result)
    console.log(result.length)
    if(result.length===0){
      //데이터 없으면, insert
      insertHomeworkData(gid)
      //다시 조회
      db.collection('homework').find({ group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth}).toArray((err, result)=>{
        if(err) console.log(err)
        console.log(result)
        return res.render("homework.ejs", {homeworks: result});
       })
    }
    //데이터가 있으면, 바로 render
    else{
      return res.render("homework.ejs", {homeworks: result});
    }
  })
});

app.put('/homework', (req, res)=>{
  console.log(req.body)
  const inputValues = req.body
  
  //날짜별로 update, (오늘부터 마지막날)
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
  //gid == group_id
  //render할 데이터 세팅
  const setReturn = (result) =>{
    //모임원
    const mems = result[result.length-1].success
    console.log(Object.keys(mems))

    //오늘의 숙제
    // console.log(nowdate.getDate())
    const idx = result.length + nowdate.getDate() - lastDate - 1 //(길이 + 오늘(일) - 이번달마지막(일) - 1)
    const todayHomework = result[idx].content
    console.log(todayHomework)

    return res.render("bat.ejs", {homeworks: result, members: Object.keys(mems), todayHomework : todayHomework});
  }

  db.collection('homework').find({ group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth}).toArray((err, result)=>{
    if(err) console.log(err)
    console.log(result)
    console.log(result.length)
    if(result.length===0){
      //해당 그룹의 해당 월 숙제 데이터가 없는 상태.
      //#### 방장이면, 숙제 처리로 이동? 나머지 인원은 모달창 띄워줌? #### 어떻게 할 것???

      //데이터 없으면, insert
      insertHomeworkData(gid)
      db.collection('homework').find({ group_id : gid, 'date.y' : thisYear, 'date.m' : thisMonth}).toArray((err, result)=>{
        if(err) console.log(err)
        console.log(result)
        setReturn(result)
      })
    }else{
      setReturn(result)
    }
  })
})

//테스트 homework 데이터 삭제 쿼리
app.get("/test", (req, res) => {
  db.collection('homework').deleteMany({group_id : 400})
  res.send('테스트 데이터 삭제완료.')
})

// 데이터가 없으면, 해당 월의 오늘 포함 이후 날짜만큼 숙제 데이터 insert하고, homework로 render하는 함수
const insertHomeworkData = (gid) =>{
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
    // console.log('내부',memSuccess) 

    //insert할 데이터 리스트 (오늘 ~ 마지막 날)
    const inputIds = [...thisDates].splice(nowdate.getDate()-1)

    inputIds.forEach(d=>{
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
    // console.log('내부', hw)
    //insert
    db.collection('homework').insertMany(hw, (err, result)=>{
      if(err) console.log(err)
      // console.log(result)
    })
  })
}

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
app.all('*', (req, res) => {//등록되지 않은 패스에 대해 페이지 오류 응답
  res.status(404).send('<h1>ERROR - 페이지를 찾을 수 없습니다.</h1>');
})
