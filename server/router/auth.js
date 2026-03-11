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
    } else if (password !== cpassword) {
      return res.status(422).json({ error: "Passwords do not match" });
    } else {
      const user = new User({
        name,
        email,
        phone,
        work,
        password,
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
    if (!email || !password) {
      return res.status(400).json({ error: "Please fill all fields" });
    }
    const userLogin = await User.findOne({ email });
    if (!userLogin) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, userLogin.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = await userLogin.generateAuthToken();

    // Set BOTH the JWT token and a session cookie for cross-subdomain SSO
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
      domain: ".localhost",
    });

    // Also send the token in response for localStorage + URL passing
    res.status(200).json({
      message: "Signin successful",
      user: userLogin,
      token: token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

//check auth status (for SSO - works across subdomains via cookies)
router.get("/check-auth", authenticate, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: req.rootUser,
  });
});

//get user details (check if logged in across all domains)
router.get("/user", authenticate, (req, res) => {
  res.status(200).json(req.rootUser);
});

//logout - clear token
router.get("/logout", (req, res) => {
  res.clearCookie("jwtoken", {
    sameSite: "Lax",
    secure: false,
    path: "/",
    domain: ".localhost", // Must match the domain used when setting
  });
  res.status(200).json({ message: "Logged out successfully" });
});

//about ko idhar
router.get("/about", authenticate, (req, res) => {
  res.status(200).json(req.rootUser);
});

//debug endpoint to check cookies
router.get("/debug-cookies", (req, res) => {
  res.status(200).json({
    cookies: req.cookies,
    headers: {
      authorization: req.headers.authorization,
      origin: req.headers.origin,
    },
  });
});

//sync-token endpoint - for cross-subdomain SSO setup
router.get("/sync-token", async (req, res) => {
  try {
    const tokenParam = req.query.token;
    if (!tokenParam) {
      return res.status(400).json({ error: "Token required" });
    }

    // Verify the token
    const verifyToken = jwt.verify(tokenParam, process.env.SECRET_KEY);
    const rootUser = await User.findOne({
      _id: verifyToken._id,
      "tokens.token": tokenParam,
    });

    if (!rootUser) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Set the cookie on this subdomain
    res.cookie("jwtoken", tokenParam, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
      domain: ".localhost",
    });

    res.status(200).json({
      message: "Token synced successfully",
      user: rootUser,
    });
  } catch (err) {
    console.log(err);
    res.status(401).json({ error: "Token sync failed" });
  }
});
module.exports = router;
