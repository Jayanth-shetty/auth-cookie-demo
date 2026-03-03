const express = require("express");
const router = express.Router();
require("../db/connection");
const User = require("../model/userSchema");

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
    res.json({ message: "signin successfully" });
  } catch (err) {
    console.log(err);
  }
});
module.exports = router;
