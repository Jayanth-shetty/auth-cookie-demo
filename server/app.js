const dotenv = require("dotenv");
const express = require("express");
const app = express();
const cors = require("cors");
dotenv.config({ path: "./config.env" });
require("./db/connection");
const cookieParser = require("cookie-parser");

app.use(cookieParser());
// const User = require("./model/userSchema");

// SSO Support - Allow multiple subdomain origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "http://localhost:3001",
  /^http:\/\/([\w-]+\.)*localhost(:\d+)?$/, // Match localhost and *.localhost on any port
];

app.use(
  cors({
    origin: (origin, callback) => {
      // For development/localhost, accept all localhost-based origins
      const isLocalhost = origin && origin.includes("localhost");
      const isAllowedOrigin = allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isLocalhost || isAllowedOrigin || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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
module.exports = app;
