import { tokenBroker } from "./tokenBrokerService";

/**
 * HTTP Client with automatic token management
 * Uses Token Broker to automatically add tokens to requests
 */
class HttpClient {
  constructor(baseURL = "http://localhost:5000") {
    this.baseURL = baseURL;
  }

  /**
   * Get Authorization header with token
   * @private
   * @returns {Object} Headers object with Authorization
   */
  getAuthHeaders() {
    const token = tokenBroker.getToken();
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response and refresh token if needed
   * @private
   */
  async handleResponse(response) {
    // If token expired, try to refresh
    if (response.status === 401) {
      const newToken = await tokenBroker.refreshToken();

      if (newToken) {
        console.log("🔄 Token refreshed, retrying request...");
        // Retry the request with new token
        return true; // Signal that retry is needed
      } else {
        // If refresh failed, user needs to login
        console.log("❌ Token refresh failed, user needs to login");
        tokenBroker.clearToken();
        window.location.href = "/login";
        return false;
      }
    }

    return false; // No retry needed
  }

  /**
   * GET request
   */
  async get(endpoint) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getAuthHeaders();

      let response = await fetch(url, {
        method: "GET",
        headers,
        credentials: "include",
      });

      // Handle token expiration
      if (await this.handleResponse(response)) {
        // Retry with new token
        const newHeaders = this.getAuthHeaders();
        response = await fetch(url, {
          method: "GET",
          headers: newHeaders,
          credentials: "include",
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return { data, status: response.status };
    } catch (err) {
      console.error("GET request error:", err);
      throw err;
    }
  }

  /**
   * POST request
   */
  async post(endpoint, body = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getAuthHeaders();

      let response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        credentials: "include",
      });

      // Handle token expiration
      if (await this.handleResponse(response)) {
        // Retry with new token
        const newHeaders = this.getAuthHeaders();
        response = await fetch(url, {
          method: "POST",
          headers: newHeaders,
          body: JSON.stringify(body),
          credentials: "include",
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return { data, status: response.status };
    } catch (err) {
      console.error("POST request error:", err);
      throw err;
    }
  }

  /**
   * PUT request
   */
  async put(endpoint, body = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getAuthHeaders();

      let response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        credentials: "include",
      });

      // Handle token expiration
      if (await this.handleResponse(response)) {
        const newHeaders = this.getAuthHeaders();
        response = await fetch(url, {
          method: "PUT",
          headers: newHeaders,
          body: JSON.stringify(body),
          credentials: "include",
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return { data, status: response.status };
    } catch (err) {
      console.error("PUT request error:", err);
      throw err;
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getAuthHeaders();

      let response = await fetch(url, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      // Handle token expiration
      if (await this.handleResponse(response)) {
        const newHeaders = this.getAuthHeaders();
        response = await fetch(url, {
          method: "DELETE",
          headers: newHeaders,
          credentials: "include",
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return { data, status: response.status };
    } catch (err) {
      console.error("DELETE request error:", err);
      throw err;
    }
  }

  /**
   * Check if user is authenticated
   */
  async checkAuth() {
    try {
      const { data } = await this.get("/check-auth");
      return data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Validate token on server
   */
  async validateToken(token) {
    try {
      const { data } = await this.post("/validate-token", {
        token,
      });
      return data;
    } catch (err) {
      return { valid: false };
    }
  }
}

// Export as singleton
export const httpClient = new HttpClient();

export default HttpClient;
