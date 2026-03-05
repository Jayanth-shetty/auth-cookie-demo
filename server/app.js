const dotenv = require("dotenv");
const express = require("express");
const app = express();
const cors = require("cors");
dotenv.config({ path: "./config.env" });
require("./db/connection");
// const User = require("./model/userSchema");
app.use(cors());
app.use(express.json());
const authRouter = require("./router/auth");
app.use(authRouter);
const PORT = process.env.PORT;

const middleware = (req, res, next) => {
  console.log("hello middleware");
  next();
};

app.get("/", (req, res) => {
  res.send("hello");
});

app.get("/about", middleware, (req, res) => {
  res.send("hello");
});

app.get("/contact", (req, res) => {
  res.cookie("test", "jai");
  res.send("hello");
});

app.get("/signin", (req, res) => {
  res.send("hello");
});

app.get("/register", (req, res) => {
  res.send("hello");
});
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
