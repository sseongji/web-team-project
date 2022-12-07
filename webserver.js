//express를 이용한 서버 만들기
const express = require('express')
const app = express()
//dotenv, 환경변수세팅
require('dotenv').config()
//ejs
app.set('view engine', 'ejs')
//미들웨어, static file들은 public폴더에서 관리하겠다. (정적파일 예)이미지)
app.use('/public', express.static('public'))

//(app == http) express Server
http.listen(process.env.PORT, ()=>{
    console.log('listening on 8080')
})

