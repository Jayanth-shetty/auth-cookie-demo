/**
 * Client-Side Token Broker Service
 * Manages token lifecycle on the client: storage, retrieval, validation, synchronization
 */
class TokenBrokerService {
  constructor() {
    this.tokenKey = "app_token";
    this.listeners = new Set(); // For cross-tab/component notifications
    this.setupStorageListener();
  }

  /**
   * Store token in localStorage
   * @param {string} token - JWT token to store
   */
  setToken(token) {
    if (!token) {
      console.warn("Attempting to set empty token");
      return;
    }

    try {
      localStorage.setItem(this.tokenKey, token);
      console.log("✓ Token stored in localStorage");
      this.notifyListeners("TOKEN_SET", { token });
    } catch (err) {
      console.error("❌ Failed to store token:", err);
    }
  }

  /**
   * Retrieve token from localStorage
   * @returns {string|null} JWT token or null
   */
  getToken() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        console.log("✓ Token retrieved from localStorage");
      }
      return token;
    } catch (err) {
      console.error("❌ Failed to get token:", err);
      return null;
    }
  }

  /**
   * Clear token from localStorage
   */
  clearToken() {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem("app_token_info"); // Also clear cached info
      console.log("✓ Token cleared from localStorage");
      this.notifyListeners("TOKEN_CLEARED", {});
    } catch (err) {
      console.error("❌ Failed to clear token:", err);
    }
  }

  /**
   * Decode JWT token (without verification - client-side only)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload
   */
  decodeToken(token) {
    try {
      if (!token) return null;

      const parts = token.split(".");
      if (parts.length !== 3) {
        console.warn("Invalid token format");
        return null;
      }

      // Decode payload (base64url)
      const payload = parts[1];
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
      );

      return decoded;
    } catch (err) {
      console.error("❌ Failed to decode token:", err);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token (optional, uses stored token if not provided)
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(token = null) {
    try {
      const targetToken = token || this.getToken();
      if (!targetToken) return true;

      const decoded = this.decodeToken(targetToken);
      if (!decoded || !decoded.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp < now;

      if (isExpired) {
        console.warn("⚠️ Token has expired");
      }

      return isExpired;
    } catch (err) {
      console.error("❌ Error checking token expiration:", err);
      return true; // Assume expired on error
    }
  }

  /**
   * Get time until token expiration
   * @returns {number} Milliseconds until expiration (negative if expired)
   */
  getTimeUntilExpiry() {
    try {
      const token = this.getToken();
      if (!token) return -1;

      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return -1;

      const now = Math.floor(Date.now() / 1000);
      const secondsLeft = decoded.exp - now;

      return secondsLeft * 1000; // Convert to milliseconds
    } catch (err) {
      return -1;
    }
  }

  /**
   * Get token info (expiration, user, etc)
   * @returns {Object} Token metadata
   */
  getTokenInfo() {
    try {
      const token = this.getToken();
      if (!token) {
        return {
          valid: false,
          hasToken: false,
        };
      }

      const decoded = this.decodeToken(token);
      if (!decoded) {
        return {
          valid: false,
          hasToken: true,
          error: "Failed to decode token",
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired = (decoded.exp || 0) < now;
      const timeLeft = (decoded.exp || 0) - now;

      return {
        valid: !isExpired,
        hasToken: true,
        userId: decoded._id || decoded.sub,
        email: decoded.email,
        issuedAt: new Date((decoded.iat || 0) * 1000),
        expiresAt: new Date((decoded.exp || 0) * 1000),
        expiresIn: timeLeft, // seconds
        isExpired,
        rawPayload: decoded,
      };
    } catch (err) {
      console.error("❌ Error getting token info:", err);
      return {
        valid: false,
        hasToken: !!this.getToken(),
        error: err.message,
      };
    }
  }

  /**
   * Check if we have a valid token
   * @returns {Promise<boolean>} True if token is valid (checks server)
   */
  async isTokenValid() {
    try {
      const token = this.getToken();

      if (!token || this.isTokenExpired(token)) {
        return false;
      }

      // Optional: Validate with server
      try {
        const response = await fetch("http://localhost:5000/token-info", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        return response.status === 200;
      } catch {
        // If server is unreachable, trust local validation
        return true;
      }
    } catch (err) {
      console.error("❌ Error validating token:", err);
      return false;
    }
  }

  /**
   * Refresh token before expiration
   * @returns {Promise<string|null>} New token or null if refresh fails
   */
  async refreshToken() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error("No token to refresh");
      }

      const response = await fetch("http://localhost:5000/refresh-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      const newToken = data.token;

      this.setToken(newToken);
      console.log("✓ Token refreshed successfully");

      return newToken;
    } catch (err) {
      console.error("❌ Token refresh error:", err);
      this.clearToken();
      return null;
    }
  }

  /**
   * Setup automatic token refresh before expiration
   * @param {number} bufferMs - Time before expiry to refresh (default 5 min)
   */
  setupAutoRefresh(bufferMs = 5 * 60 * 1000) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(
      async () => {
        const timeLeft = this.getTimeUntilExpiry();

        // Refresh if less than buffer time remaining
        if (timeLeft > 0 && timeLeft < bufferMs) {
          console.log("⚠️ Token expiring soon, refreshing...");
          await this.refreshToken();
        }
      },
      1 * 60 * 1000,
    ); // Check every minute
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Add listener for token changes (for cross-tab/component sync)
   * @param {Function} callback - Called when token changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of token changes
   * @private
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach((callback) => {
      try {
        callback({ eventType, ...data });
      } catch (err) {
        console.error("Error in listener callback:", err);
      }
    });
  }

  /**
   * Setup cross-tab storage synchronization
   * When token changes in one tab, update in all tabs
   * @private
   */
  setupStorageListener() {
    window.addEventListener("storage", (event) => {
      if (event.key === this.tokenKey) {
        console.log("📱 Token changed in another tab");

        if (event.newValue) {
          this.notifyListeners("TOKEN_SYNCED", {
            token: event.newValue,
          });
        } else {
          this.notifyListeners("TOKEN_CLEARED_ELSEWHERE", {});
        }
      }
    });
  }

  /**
   * Initialize token broker on app startup
   * @returns {Promise<boolean>} True if valid token exists
   */
  async initialize() {
    try {
      console.log("🔄 Initializing Token Broker...");

      const token = this.getToken();

      if (!token) {
        console.log("ℹ️ No token found, user needs to login");
        return false;
      }

      // Check if token is expired locally
      if (this.isTokenExpired(token)) {
        console.log("⚠️ Stored token is expired");
        this.clearToken();
        return false;
      }

      // Validate with server
      const isValid = await this.isTokenValid();

      if (!isValid) {
        console.log("❌ Token not valid on server");
        this.clearToken();
        return false;
      }

      console.log("✓ Token is valid, setting up auto-refresh");
      this.setupAutoRefresh();

      return true;
    } catch (err) {
      console.error("❌ Initialization error:", err);
      return false;
    }
  }

  /**
   * Logout - clear token and notify server
   * @returns {Promise<boolean>} True if logout successful
   */
  async logout() {
    try {
      const token = this.getToken();

      // Notify server to revoke token
      if (token) {
        await fetch("http://localhost:5000/logout", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
      }

      // Clear local token
      this.clearToken();
      this.stopAutoRefresh();

      console.log("✓ Logout successful");
      return true;
    } catch (err) {
      console.error("❌ Logout error:", err);
      // Still clear token locally even if server call fails
      this.clearToken();
      return false;
    }
  }
}

// Export as singleton for app-wide use
export const tokenBroker = new TokenBrokerService();

export default TokenBrokerService;
