const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
require("../db/connection");
const User = require("../model/userSchema");
const authenticate = require("../middleware/authenticate");

router.get("/", (req, res) => {
  res.send("hello from router");
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, work, password, cpassword } = req.body;

    if (!name || !email || !phone || !work || !password || !cpassword) {
      return res.status(422).json({ error: "Please fill all fields" });
    }
    const userExist = await User.findOne({ email });

    if (userExist) {
      return res
        .status(422)
        .json({ error: "User already exists, please login" });
    } else if (password != cpassword) {
      return res
        .status(422)
        .json({ error: "Incorrect password try again later" });
    } else {
      const user = new User({
        name,
        email,
        phone,
        work,
        password,
        cpassword,
      });

      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to register" });
  }
});
//login
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    if (!email || !password) {
      return res.status(400).json({ error: "invaild data please fill" });
    }
    const userLogin = await User.findOne({ email });
    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);
      const token = await userLogin.generateAuthToken();
      console.log(token);
      res.cookie("jwtoken", token, {
        expires: new Date(Date.now() + 25892000000),
        httpOnly: true,
      });
      if (!isMatch) {
        return res.status(400).json({ error: "invalid crendtials" });
      } else {
        res.json({ message: "signin successfully" });
      }
    } else {
      return res.status(400).json({ error: "invalid crendtials" });
    }
  } catch (err) {
    console.log(err);
  }
});

//about ko idhar
router.get("/about", authenticate, (req, res) => {
  res.status(200).json(req.rootUser);
});
module.exports = router;
