const express = require('express');
const mongoose = require('mongoose');

mongoose.connect(
  "mongodb+srv://admin:admin@cluster0.stcqvbl.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;

const handleOpen = () => console.log("connected to DB");
const handleError = (error) => console.log("DB error", error);
db.on("error", handleError);
db.once("open", handleOpen);

const app = express();

const PORT = 8080;

const handleListening = () => console.log(`✅ Server listenting on port http://localhost:${PORT} 🚀`);

app.set('view engine', 'ejs');

// node.js
app.use('/public', express.static('public'));

app.listen(PORT, handleListening);

app.get('/', function(req, res){
  // node.js
  res.render('post.ejs');
})