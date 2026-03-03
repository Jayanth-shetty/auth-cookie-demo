const dotenv = require("dotenv");
const express = require("express");
const app = express();
dotenv.config({ path: "./config.env" });
require("./db/connection");
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
  res.send("hello");
});

app.get("/signin", (req, res) => {
  res.send("hello");
});

app.get("/signup", (req, res) => {
  res.send("hello");
});
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
