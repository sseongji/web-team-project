const express = require('express');

const app = express();

const PORT = 8080;

const handleListening = () => console.log(`✅ Server listenting on port http://localhost:${PORT} 🚀`);

app.set('view engine', 'ejs');

// node.js
app.use('/public', express.static('public'));

app.listen(PORT, handleListening);

// 메인 화면(임시로 post 화면으로 대체)
app.get('/', function(req, res){
    // node.js
    res.render('post.ejs');
  })

app.get('/post', function(req, res){
  // node.js
  res.render('post.ejs');
})

app.get("/search", (req, res) => {
  return res.render("search.ejs");
});

app.get("/groupAdd", (req, res) => {
  return res.render("signup.ejs");
});