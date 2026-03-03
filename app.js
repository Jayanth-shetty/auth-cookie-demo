const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("hello");
});

app.get("/about", (req, res) => {
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
