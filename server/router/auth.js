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

    // Set JWT token in cookie (for same-origin requests)
    // Note: domain is NOT set - for localhost subdomains, use Authorization header instead
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
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

//logout - clear token from both cookie and database
router.post("/logout", async (req, res) => {
  try {
    let token = null;

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7); // Remove 'Bearer ' prefix
    }

    // Also try to get from cookies
    if (!token && req.cookies.jwtoken) {
      token = req.cookies.jwtoken;
    }

    console.log("=== LOGOUT START ===");
    console.log("Token exists:", !!token);

    let tokenRemoved = false;
    if (token) {
      try {
        const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
        const userId = verifyToken._id;

        console.log("User ID:", userId);
        console.log("Token (first 30 chars):", token.substring(0, 30));

        // Get user BEFORE removal
        const userBefore = await User.findById(userId);
        console.log("Tokens BEFORE removal:", userBefore?.tokens?.length || 0);

        // Method 1: Use $pull to remove exact token
        const updateResult = await User.findByIdAndUpdate(
          userId,
          {
            $pull: { tokens: { token: token } },
            $inc: { logoutVersion: 1 }, // Increment logoutVersion to invalidate all tokens
          },
          { new: true },
        );

        console.log("Tokens AFTER removal:", updateResult?.tokens?.length || 0);
        console.log(
          "✓ Logout version incremented to:",
          updateResult?.logoutVersion,
        );

        // Verify token is actually gone
        const tokenCheckAfter = await User.findOne({
          _id: userId,
          "tokens.token": token,
        });

        if (tokenCheckAfter) {
          console.log("  Token STILL exists in DB!");
          // Force remove by rebuilding array without this token
          await User.findByIdAndUpdate(userId, {
            tokens: updateResult.tokens.filter((t) => t.token !== token),
          });
          console.log("✓ Forced token removal completed");
        }

        tokenRemoved = true;
        console.log("Token removed from database");
      } catch (err) {
        console.log("Token verification failed:", err.message);
      }
    }

    // Clear cookie
    res.clearCookie("jwtoken", {
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    console.log("✓ Cookies cleared");
    console.log("=== LOGOUT END ===");

    res.status(200).json({
      message: "Logged out successfully",
      tokenRemoved: tokenRemoved,
    });
  } catch (err) {
    console.log("  Logout error:", err);

    // Still clear cookie on error
    res.clearCookie("jwtoken", {
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({
      message: "Logged out successfully (error handling path)",
    });
  }
});

//logout all devices - clear all tokens
router.post("/logout-all", authenticate, async (req, res) => {
  try {
    const userId = req.userID;

    console.log("Logout all devices for user:", userId);

    // Remove ALL tokens AND increment logoutVersion
    const updateResult = await User.findByIdAndUpdate(
      userId,
      {
        tokens: [],
        $inc: { logoutVersion: 1 }, // Increment to invalidate all sessions
      },
      { new: true },
    );

    console.log(
      "✓ All tokens cleared, logout version incremented to:",
      updateResult?.logoutVersion,
    );

    // Clear the cookie
    res.clearCookie("jwtoken", {
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    res.clearCookie("jwtoken", {
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({
      message: "Logged out from all devices successfully",
    });
  } catch (err) {
    console.log("Logout all error:", err);
    res.status(500).json({ error: "Logout all failed" });
  }
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

    // Check logout version - ensure token hasn't been invalidated
    const tokenLogoutVersion = verifyToken.logoutVersion || 0;
    const currentLogoutVersion = rootUser.logoutVersion || 0;

    if (tokenLogoutVersion !== currentLogoutVersion) {
      return res.status(401).json({ error: "Token has been invalidated" });
    }

    // Set the cookie on this subdomain
    res.cookie("jwtoken", tokenParam, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    console.log("✓ Token synced successfully for user:", rootUser._id);

    res.status(200).json({
      message: "Token synced successfully",
      user: rootUser,
    });
  } catch (err) {
    console.log(err);
    res.status(401).json({ error: "Token sync failed" });
  }
});

//get-cookie-token endpoint - returns token from cookie (for direct subdomain access)
router.get("/get-cookie-token", async (req, res) => {
  try {
    const cookieToken = req.cookies.jwtoken;

    if (!cookieToken) {
      return res.status(401).json({ error: "No cookie token found" });
    }

    // Verify the token is valid
    const verifyToken = jwt.verify(cookieToken, process.env.SECRET_KEY);

    // Check if token exists in DB
    const rootUser = await User.findOne({
      _id: verifyToken._id,
      "tokens.token": cookieToken,
    });

    if (!rootUser) {
      return res.status(401).json({ error: "Token not valid in database" });
    }

    // Check logout version
    const tokenLogoutVersion = verifyToken.logoutVersion || 0;
    const currentLogoutVersion = rootUser.logoutVersion || 0;

    if (tokenLogoutVersion !== currentLogoutVersion) {
      return res.status(401).json({ error: "Session invalidated" });
    }

    console.log("✓ Cookie token verified, returning to client");

    res.status(200).json({
      message: "Token retrieved from cookie",
      token: cookieToken,
      user: rootUser,
    });
  } catch (err) {
    console.log("Get cookie token error:", err.message);
    res.status(401).json({ error: "Cookie token invalid" });
  }
});

//debug endpoint - check tokens for current user
router.get("/debug-user-tokens", authenticate, async (req, res) => {
  try {
    const userId = req.userID;
    const user = await User.findById(userId);

    res.status(200).json({
      userId: userId,
      tokenCount: user?.tokens?.length || 0,
      tokens:
        user?.tokens?.map((t) => ({
          token: t.token.substring(0, 20) + "...",
        })) || [],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Debug failed" });
  }
});

//debug endpoint - check if a specific token exists in DB
router.get("/debug-verify-token", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ error: "Token required in query" });
    }

    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    const userId = verifyToken._id;

    const user = await User.findOne({
      _id: userId,
      "tokens.token": token,
    });

    if (user) {
      res.status(200).json({
        message: "Token found in DB",
        userId: userId,
        tokenExists: true,
        tokenCount: user.tokens.length,
      });
    } else {
      res.status(200).json({
        message: "Token NOT found in DB (may have been logged out)",
        userId: userId,
        tokenExists: false,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(401).json({ error: "Token verification failed" });
  }
});

module.exports = router;
