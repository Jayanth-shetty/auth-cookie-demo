const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");

/**
 * TokenBroker - Server-side token management broker
 * Handles all token operations: generation, validation, revocation, synchronization
 */
class TokenBroker {
  constructor() {
    this.tokenSecret = process.env.SECRET_KEY;
    this.tokenExpiry = "1h"; // Token expiration time
    this.refreshTokenExpiry = "7d"; // Refresh token expiration
  }

  /**
   * Generate a new authentication token for a user
   * @param {Object} user - User document from database
   * @param {Object} metadata - Optional metadata (device, ip, etc)
   * @returns {Promise<string>} JWT token
   */
  async generateAuthToken(user, metadata = {}) {
    try {
      const tokenPayload = {
        _id: user._id.toString(),
        email: user.email,
        logoutVersion: user.logoutVersion || 0,
        ...metadata,
      };

      const token = jwt.sign(tokenPayload, this.tokenSecret, {
        expiresIn: this.tokenExpiry,
      });

      // Store token in user's tokens array
      user.tokens = user.tokens.concat({ token });
      await user.save();

      console.log(`✓ Token generated for user ${user.email}`);
      return token;
    } catch (err) {
      console.log("❌ Error generating token:", err.message);
      throw new Error("Failed to generate token");
    }
  }

  /**
   * Validate a token and return decoded payload
   * @param {string} token - JWT token to validate
   * @returns {Promise<Object>} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  async validateToken(token) {
    try {
      // Verify JWT signature and expiration
      const decoded = jwt.verify(token, this.tokenSecret);
      console.log(`✓ Token validated for user ${decoded._id}`);
      return decoded;
    } catch (err) {
      console.log("❌ Token validation error:", err.message);
      throw new Error(`Invalid or expired token: ${err.message}`);
    }
  }

  /**
   * Verify token exists in database (additional security check)
   * @param {string} userId - User ID
   * @param {string} token - Token to verify
   * @returns {Promise<boolean>} True if token exists
   */
  async verifyTokenInDatabase(userId, token) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return false;
      }

      // Check if token is in user's tokens array
      const tokenExists = user.tokens.some((t) => t.token === token);

      if (!tokenExists) {
        console.log(`❌ Token not found in user's tokens array`);
        return false;
      }

      // Check logout version (for invalidation on logout)
      const tokenLogoutVersion = (jwt.decode(token) || {}).logoutVersion;
      const currentLogoutVersion = user.logoutVersion || 0;

      if (tokenLogoutVersion !== currentLogoutVersion) {
        console.log(`❌ Token invalidated by logout (version mismatch)`);
        return false;
      }

      console.log(`✓ Token verified in database`);
      return true;
    } catch (err) {
      console.log("❌ Database verification error:", err.message);
      return false;
    }
  }

  /**
   * Full authentication check (signature + database)
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User object and decoded token
   * @throws {Error} If authentication fails
   */
  async authenticate(token) {
    try {
      // Step 1: Verify JWT signature
      const decoded = await this.validateToken(token);

      // Step 2: Verify token exists in database
      const isValid = await this.verifyTokenInDatabase(decoded._id, token);

      if (!isValid) {
        throw new Error("Token not valid in database");
      }

      // Step 3: Get full user object
      const user = await User.findById(decoded._id);

      if (!user) {
        throw new Error("User not found");
      }

      console.log(`✓ Full authentication successful for ${user.email}`);
      return { token: decoded, user };
    } catch (err) {
      console.log("❌ Authentication error:", err.message);
      throw new Error(`Authentication failed: ${err.message}`);
    }
  }

  /**
   * Revoke a specific token (used on logout)
   * @param {string} userId - User ID
   * @param {string} token - Token to revoke
   * @returns {Promise<void>}
   */
  async revokeToken(userId, token) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Remove token from tokens array
      user.tokens = user.tokens.filter((t) => t.token !== token);

      // If last token, increment logout version to invalidate all tokens
      if (user.tokens.length === 0) {
        user.logoutVersion = (user.logoutVersion || 0) + 1;
      }

      await user.save();

      console.log(`✓ Token revoked for user ${user.email}`);
    } catch (err) {
      console.log("❌ Error revoking token:", err.message);
      throw new Error("Failed to revoke token");
    }
  }

  /**
   * Revoke all tokens for a user (complete logout)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async revokeAllTokens(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Clear all tokens and increment logout version
      user.tokens = [];
      user.logoutVersion = (user.logoutVersion || 0) + 1;

      await user.save();

      console.log(`✓ All tokens revoked for user ${user.email}`);
    } catch (err) {
      console.log("❌ Error revoking all tokens:", err.message);
      throw new Error("Failed to revoke all tokens");
    }
  }

  /**
   * Refresh an expiring token (generate new without relogin)
   * @param {string} oldToken - Current token
   * @returns {Promise<string>} New token
   */
  async refreshToken(oldToken) {
    try {
      // Decode token without verification (might be expired)
      const decoded = jwt.decode(oldToken);

      if (!decoded) {
        throw new Error("Invalid token format");
      }

      const user = await User.findById(decoded._id);

      if (!user) {
        throw new Error("User not found");
      }

      // Revoke old token
      await this.revokeToken(user._id, oldToken);

      // Generate new token
      const newToken = await this.generateAuthToken(user, {
        device: decoded.device,
      });

      console.log(`✓ Token refreshed for user ${user.email}`);
      return newToken;
    } catch (err) {
      console.log("❌ Error refreshing token:", err.message);
      throw new Error("Failed to refresh token");
    }
  }

  /**
   * Get token info (for debugging/client)
   * @param {string} token - JWT token
   * @returns {Object} Token info including expiration
   */
  getTokenInfo(token) {
    try {
      const decoded = jwt.decode(token);

      if (!decoded) {
        return { valid: false };
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = (decoded.exp || 0) - now;

      return {
        valid: true,
        userId: decoded._id,
        email: decoded.email,
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        expiresIn, // seconds
        isExpired: expiresIn < 0,
      };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Validate token expiration
   * @param {string} token - JWT token
   * @returns {boolean} True if token is not expired
   */
  isTokenExpired(token) {
    const info = this.getTokenInfo(token);
    return info.isExpired || !info.valid;
  }

  /**
   * Decode token safely (for client-side checks)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token or null
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (err) {
      return null;
    }
  }
}

// Export as singleton
module.exports = new TokenBroker();
