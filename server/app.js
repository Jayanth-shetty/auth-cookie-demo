const dotenv = require("dotenv");
const express = require("express");
const app = express();
const cors = require("cors");
dotenv.config({ path: "./config.env" });
require("./db/connection");
const cookieParser = require("cookie-parser");

app.use(cookieParser());
// const User = require("./model/userSchema");
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true, // allow cookies to be sent
  }),
);
app.use(express.json());
const authRouter = require("./router/auth");
app.use(authRouter);
const PORT = process.env.PORT;

// const middleware = (req, res, next) => {
//   console.log("hello middleware");
//   next();
// };

app.get("/", (req, res) => {
  res.send("hello");
});

// app.get("/about", middleware, (req, res) => {
//   res.send("hello");
// });

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
