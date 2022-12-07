const express = require("express");

const app = express();

const PORT = 8080;

const handleListening = () =>
  console.log(`✅ Server listenting on port http://localhost:${PORT} 🚀`);

app.listen(PORT, handleListening);

app.get("/search", (req, res) => {
  return res.render("search.ejs");
});

app.get("/groupAdd", (req, res) => {
  return res.render("group_sign.ejs");
});
