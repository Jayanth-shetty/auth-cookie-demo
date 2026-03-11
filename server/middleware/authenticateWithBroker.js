const tokenBroker = require("../broker/tokenBroker");

/**
 * Authenticate middleware using Token Broker Pattern
 * Extracts token from cookie or Authorization header and validates it
 */
const authenticate = async (req, res, next) => {
  try {
    // Step 1: Extract token from cookie or Authorization header
    let token = req.cookies.jwtoken;
    let tokenSource = "cookie";

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7); // Remove 'Bearer ' prefix
        tokenSource = "header";
      }
    }

    console.log(
      `[Authenticate] Token from ${tokenSource}:`,
      token ? "exists" : "missing",
    );

    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token found" });
    }

    // Step 2: Use Token Broker to authenticate
    const { token: decoded, user } = await tokenBroker.authenticate(token);

    // Step 3: Attach to request for downstream handlers
    req.token = token;
    req.decodedToken = decoded;
    req.rootUser = user;
    req.userID = user._id;
    req.tokenSource = tokenSource;

    console.log(`[Authenticate] ✓ Authentication successful for ${user.email}`);
    next();
  } catch (err) {
    console.log("[Authenticate] ❌ Authentication error:", err.message);
    return res.status(401).json({
      error: "Unauthorized",
      details: err.message,
    });
  }
};

module.exports = authenticate;
