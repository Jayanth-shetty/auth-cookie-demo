const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");
const { request } = require("express");
const authenticate = async (req, res, next) => {
  try {
    // Try to get token from cookie first
    let token = req.cookies.jwtoken;

    // If no cookie, try Authorization header (Bearer token)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token found" });
    }

    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    const rootUser = await User.findOne({
      _id: verifyToken._id,
      "tokens.token": token,
    });
    if (!rootUser) {
      throw new Error("user not found");
    }
    req.token = token;
    req.rootUser = rootUser;
    req.userID = rootUser._id;
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = authenticate;
