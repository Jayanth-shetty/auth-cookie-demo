const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
require("../db/connection");
const User = require("../model/userSchema");
const tokenBroker = require("../broker/tokenBroker");
const authenticateWithBroker = require("../middleware/authenticateWithBroker");

// Keep old authenticate import for backwards compatibility
const authenticate = require("../middleware/authenticate");

/**
 * Health check endpoint
 */
router.get("/", (req, res) => {
  res.send("Auth API - Token Broker Pattern");
});

/**
 * User Registration
 * Creates a new user account
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, work, password, cpassword } = req.body;

    // Validation
    if (!name || !email || !phone || !work || !password || !cpassword) {
      return res.status(422).json({ error: "Please fill all fields" });
    }

    if (password !== cpassword) {
      return res.status(422).json({ error: "Passwords do not match" });
    }

    // Check if user already exists
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res
        .status(422)
        .json({ error: "User already exists, please login" });
    }

    // Create new user
    const user = new User({
      name,
      email,
      phone,
      work,
      password,
    });

    await user.save();

    console.log(`✓ User registered: ${email}`);
    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (err) {
    console.log("❌ Registration error:", err);
    res.status(500).json({ error: "Failed to register" });
  }
});

/**
 * User Sign In (Login)
 * Authenticates user and generates token using Token Broker
 */
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate token using TokenBroker
    const token = await tokenBroker.generateAuthToken(user, {
      device: "web",
    });

    console.log(`✓ User signed in: ${email}`);

    // Set token in HTTP-only cookie (for same-origin requests)
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false, // Set to true in production with HTTPS
      path: "/",
    });

    // Send response with token (for localStorage + cross-domain)
    res.status(200).json({
      message: "Signin successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        work: user.work,
      },
      token: token,
    });
  } catch (err) {
    console.log("❌ Sign in error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * Check Authentication Status
 * Uses Token Broker authentication
 */
router.get("/check-auth", authenticateWithBroker, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: {
      id: req.rootUser._id,
      name: req.rootUser.name,
      email: req.rootUser.email,
      phone: req.rootUser.phone,
      work: req.rootUser.work,
    },
    tokenInfo: tokenBroker.getTokenInfo(req.token),
  });
});

/**
 * Get User Details
 * Uses Token Broker authentication
 */
router.get("/user", authenticateWithBroker, (req, res) => {
  res.status(200).json({
    id: req.rootUser._id,
    name: req.rootUser.name,
    email: req.rootUser.email,
    phone: req.rootUser.phone,
    work: req.rootUser.work,
  });
});

/**
 * Logout - Revoke Current Token
 * Uses Token Broker to revoke the token
 */
router.get("/logout", authenticateWithBroker, async (req, res) => {
  try {
    // Revoke the current token
    await tokenBroker.revokeToken(req.userID, req.token);

    // Clear cookie
    res.clearCookie("jwtoken", {
      path: "/",
    });

    console.log(`✓ User logged out: ${req.rootUser.email}`);

    res.status(200).json({
      message: "Logged out successfully",
      logoutVersion: req.rootUser.logoutVersion,
    });
  } catch (err) {
    console.log("❌ Logout error:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
});

/**
 * Logout All Devices
 * Revokes all tokens for the user (complete logout)
 */
router.get("/logout-all", authenticateWithBroker, async (req, res) => {
  try {
    // Revoke all tokens
    await tokenBroker.revokeAllTokens(req.userID);

    // Clear cookie
    res.clearCookie("jwtoken", {
      path: "/",
    });

    console.log(`✓ All tokens revoked for user: ${req.rootUser.email}`);

    res.status(200).json({
      message: "Logged out from all devices",
      logoutVersion: req.rootUser.logoutVersion,
    });
  } catch (err) {
    console.log("❌ Logout all error:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
});

/**
 * Refresh Token
 * Issues a new token before current one expires
 */
router.post("/refresh-token", authenticateWithBroker, async (req, res) => {
  try {
    const newToken = await tokenBroker.refreshToken(req.token);

    console.log(`✓ Token refreshed for user: ${req.rootUser.email}`);

    // Update cookie with new token
    res.cookie("jwtoken", newToken, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({
      message: "Token refreshed successfully",
      token: newToken,
      tokenInfo: tokenBroker.getTokenInfo(newToken),
    });
  } catch (err) {
    console.log("❌ Token refresh error:", err);
    res.status(401).json({ error: "Failed to refresh token" });
  }
});

/**
 * Get Token Info
 * Returns token expiration and metadata (for client)
 */
router.get("/token-info", authenticateWithBroker, (req, res) => {
  const info = tokenBroker.getTokenInfo(req.token);

  res.status(200).json(info);
});

/**
 * Validate Token
 * Checks if a token is valid (for client-side pre-checks)
 */
router.post("/validate-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    const info = tokenBroker.getTokenInfo(token);

    if (!info.valid) {
      return res.status(401).json({
        valid: false,
        error: "Invalid token",
      });
    }

    res.status(200).json({
      valid: true,
      ...info,
    });
  } catch (err) {
    console.log("❌ Token validation error:", err);
    res.status(500).json({ error: "Failed to validate token" });
  }
});

/**
 * Sync Token Across Domains
 * Allows other subdomains to sync token via this endpoint
 */
router.get("/sync-token", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    // Verify token using broker
    const info = tokenBroker.getTokenInfo(token);

    if (!info.valid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Set cookie for this domain
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    console.log(`✓ Token synced for user: ${info.email}`);

    res.status(200).json({
      message: "Token synced",
      userId: info.userId,
    });
  } catch (err) {
    console.log("❌ Token sync error:", err);
    res.status(500).json({ error: "Failed to sync token" });
  }
});

/**
 * Get Token from Cookie
 * Retrieves token stored in cookie (for localStorage syncing)
 */
router.get("/get-cookie-token", (req, res) => {
  const token = req.cookies.jwtoken;

  if (!token) {
    return res.status(401).json({ error: "No token in cookie" });
  }

  const info = tokenBroker.getTokenInfo(token);

  if (!info.valid) {
    return res.status(401).json({ error: "Invalid token" });
  }

  console.log(`✓ Token retrieved from cookie`);

  res.status(200).json({
    token: token,
    tokenInfo: info,
  });
});

module.exports = router;
