const express = require('express')
const app = express()

//dotenv, 환경변수세팅
require('dotenv').config()
//ejs
app.set('view engine', 'ejs')
//public folder
app.use('/public', express.static('public'))

//(app == http) express Server
const handleListening = () => {
    console.log(`Server listening on port http://localhost:${process.env.PORT}`)
}

app.listen(process.env.PORT, handleListening);

app.get("/post", (req, res) => {
  return res.render("post.ejs");
});

app.get("/signup", (req, res) => {
  return res.render("signup.ejs");
});

app.get("/search", (req, res) => {
  return res.render("search.ejs");
});

app.get("/groupAdd", (req, res) => {
  return res.render("group_sign.ejs");
});
