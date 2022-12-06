import express from "express";
import mongoose from "mongoose";

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

const handleListening = () =>
  console.log(`✅ Server listenting on port http://localhost:${PORT} 🚀`);

app.listen(PORT, handleListening);
