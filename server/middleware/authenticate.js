const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");
const { request } = require("express");

const authenticate = async (req, res, next) => {
  try {
    // Try to get token from cookie first
    let token = req.cookies.jwtoken;
    let tokenSource = "cookie";

    // If no cookie, try Authorization header (Bearer token)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7); // Remove 'Bearer ' prefix
        tokenSource = "header";
      }
    }

    // Debug log
    console.log(
      `Auth check: Token from ${tokenSource}:`,
      token ? "exists" : "missing",
    );

    if (!token) {
      console.log("Auth failed: No token found");
      return res.status(401).json({ error: "Unauthorized - No token found" });
    }

    // Verify JWT signature
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Token verified, user ID:", verifyToken._id);

    // Get user and check logoutVersion
    const rootUser = await User.findById(verifyToken._id);

    if (!rootUser) {
      console.log("Auth failed: User not found");
      return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    // Check if token was invalidated by logout (logoutVersion mismatch)
    const tokenLogoutVersion = verifyToken.logoutVersion || 0;
    const currentLogoutVersion = rootUser.logoutVersion || 0;

    console.log(
      `Logout version check - Token: ${tokenLogoutVersion}, Current: ${currentLogoutVersion}`,
    );

    if (tokenLogoutVersion !== currentLogoutVersion) {
      console.log(
        `❌ Auth failed: Token invalidated by logout (version mismatch)`,
      );
      return res.status(401).json({
        error: "Unauthorized - Session invalidated",
      });
    }

    // Check if token exists in user's tokens array (additional safety check)
    const tokenExists = rootUser.tokens.some((t) => t.token === token);

    if (!tokenExists) {
      console.log("❌ Auth failed: Token not found in user tokens array");
      return res
        .status(401)
        .json({ error: "Unauthorized - Token not in database" });
    }

    console.log("✓ Authentication successful");
    req.token = token;
    req.rootUser = rootUser;
    req.userID = rootUser._id;
    next();
  } catch (err) {
    console.log("Auth error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = authenticate;
