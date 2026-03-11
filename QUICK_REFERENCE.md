# Token Broker Pattern - Quick Reference

## Server-Side Quick Reference

### TokenBroker API

```javascript
const tokenBroker = require("../broker/tokenBroker");

// Generate token for user
const token = await tokenBroker.generateAuthToken(user, metadata);

// Validate and authenticate
const { token: decoded, user } = await tokenBroker.authenticate(token);

// Get token info (expiration, user, etc)
const info = tokenBroker.getTokenInfo(token);

// Revoke single token
await tokenBroker.revokeToken(userId, token);

// Revoke all tokens (logout everywhere)
await tokenBroker.revokeAllTokens(userId);

// Refresh expired token
const newToken = await tokenBroker.refreshToken(oldToken);

// Check if expired
const isExpired = tokenBroker.isTokenExpired(token);

// Decode without verification
const decoded = tokenBroker.decodeToken(token);
```

### Use in Routes

```javascript
const express = require("express");
const router = express.Router();
const tokenBroker = require("../broker/tokenBroker");
const authenticate = require("../middleware/authenticateWithBroker");

// Public endpoint
router.post("/signin", async (req, res) => {
  const user = await User.findOne({ email });
  const token = await tokenBroker.generateAuthToken(user);
  res.json({ token });
});

// Protected endpoint
router.get("/user", authenticate, (req, res) => {
  res.json(req.rootUser); // Added by authenticate middleware
});
```

---

## Client-Side Quick Reference

### TokenBrokerService API

```javascript
import { tokenBroker } from "@/services/tokenBrokerService";

// Store token
tokenBroker.setToken(token);

// Get token
const token = tokenBroker.getToken();

// Clear token
tokenBroker.clearToken();

// Check if expired
const isExpired = tokenBroker.isTokenExpired();

// Get token info
const info = tokenBroker.getTokenInfo();
// Returns: { valid, userId, email, issuedAt, expiresAt, expiresIn, isExpired }

// Refresh token
const newToken = await tokenBroker.refreshToken();

// Setup auto-refresh (5 min before expiry)
tokenBroker.setupAutoRefresh();

// Stop auto-refresh
tokenBroker.stopAutoRefresh();

// Complete logout (revoke + clear)
await tokenBroker.logout();

// Listen to token changes
const unsubscribe = tokenBroker.subscribe((event) => {
  console.log(event.eventType); // TOKEN_SET, TOKEN_CLEARED, TOKEN_SYNCED
});
```

### useTokenBroker Hook

```javascript
import { useTokenBroker } from "@/hooks/useTokenBroker";

export default function MyComponent() {
  const {
    token, // Current token string
    tokenInfo, // Token metadata
    isAuthenticated, // Boolean
    isExpired, // Boolean
    userInfo, // { userId, email }
    timeUntilExpiry, // Milliseconds
    isLoading,
    logout, // Async function
    refreshToken, // Async function
    getToken, // Get current token
  } = useTokenBroker();

  return (
    <div>
      {isAuthenticated && (
        <>
          <p>User: {userInfo.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}
```

### httpClient

```javascript
import { httpClient } from "@/services/httpClient";

// Automatically includes token in Authorization header
const { data } = await httpClient.get("/user");
const { data } = await httpClient.post("/data", body);
const { data } = await httpClient.put("/data/123", body);
const { data } = await httpClient.delete("/data/123");

// Check auth
const authData = await httpClient.checkAuth();

// Validate token
const isValid = await httpClient.validateToken(token);
```

### ProtectedRoute

```javascript
import ProtectedRoute from "@/components/ProtectedRoute";

<Routes>
  <Route path="/login" element={<Login />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
</Routes>;
```

---

## Common Tasks

### Login User with Broker

```javascript
// Component:
import { tokenBroker } from "@/services/tokenBrokerService";

const loginUser = async (email, password) => {
  const response = await fetch("/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.token) {
    tokenBroker.setToken(data.token);
    tokenBroker.setupAutoRefresh();
    navigate("/");
  }
};
```

### Logout User

```javascript
const logoutUser = async () => {
  await tokenBroker.logout(); // Handles server call + clearing
  navigate("/login");
};
```

### Get User Info from Token

```javascript
const { userInfo, isAuthenticated } = useTokenBroker();

if (isAuthenticated) {
  console.log("User email:", userInfo.email);
}
```

### Check Token Expiration

```javascript
const { isExpired, timeUntilExpiry } = useTokenBroker();

if (isExpired) {
  console.log("Token expired, please login again");
} else {
  const minutes = Math.floor(timeUntilExpiry / 1000 / 60);
  console.log(`Token expires in ${minutes} minutes`);
}
```

### Make Authenticated Request

```javascript
// Using httpClient (auto-includes token):
const { data } = await httpClient.get("/user");

// Or manual fetch:
const token = tokenBroker.getToken();
const response = await fetch("/api/data", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Setup App with Token Broker

```javascript
// App.jsx
import { useEffect } from "react";
import { tokenBroker } from "@/services/tokenBrokerService";

export default function App() {
  useEffect(() => {
    // Initialize on app load
    tokenBroker.initialize().then((isValid) => {
      if (isValid) {
        console.log("Token is valid");
      } else {
        console.log("No valid token, user needs to login");
      }
    });
  }, []);

  return <Routes>{/* routes */}</Routes>;
}
```

---

## API Endpoints Summary

| Endpoint          | Method | Auth? | Purpose                   |
| ----------------- | ------ | ----- | ------------------------- |
| `/signin`         | POST   | ❌    | Login                     |
| `/register`       | POST   | ❌    | Sign up                   |
| `/check-auth`     | GET    | ✅    | Verify auth               |
| `/user`           | GET    | ✅    | Get user info             |
| `/logout`         | GET    | ✅    | Logout (revoke one token) |
| `/logout-all`     | GET    | ✅    | Logout everywhere         |
| `/refresh-token`  | POST   | ✅    | Get new token             |
| `/token-info`     | GET    | ✅    | Get token details         |
| `/validate-token` | POST   | ❌    | Check if token valid      |
| `/sync-token`     | GET    | ❌    | Cross-domain sync         |

---

## File Structure

```
server/
├── broker/
│   └── tokenBroker.js           # Token generation/validation
├── middleware/
│   ├── authenticate.js          # Old (keep for compatibility)
│   └── authenticateWithBroker.js # New broker-based
├── router/
│   ├── auth.js                  # Old endpoints
│   └── authWithBroker.js        # New broker-based endpoints
└── app.js                       # Configure router

client/src/
├── services/
│   ├── tokenBrokerService.js    # Token storage/validation
│   └── httpClient.js            # Auto-token API calls
├── hooks/
│   └── useTokenBroker.js        # React hook
├── components/
│   ├── LoginWithBroker.jsx
│   ├── LogoutWithBroker.jsx
│   └── ProtectedRoute.jsx
└── App.jsx                      # App setup
```

---

## Debug Tips

### Check Stored Token

```javascript
console.log(localStorage.getItem("app_token"));
```

### Decode Token Manually

```javascript
import { tokenBroker } from "@/services/tokenBrokerService";
const decoded = tokenBroker.decodeToken(token);
console.log(decoded);
```

### Check Token Expiration

```javascript
const info = tokenBroker.getTokenInfo();
console.log("Expires at:", info.expiresAt);
console.log("Expires in:", info.expiresIn, "seconds");
console.log("Is expired?", info.isExpired);
```

### Monitor Token Events

```javascript
tokenBroker.subscribe((event) => {
  console.log("[Token Event]", event.eventType);
});
```

### Server Token Logs

The server logs token operations:

```
✓ Token generated for user user@example.com
✓ Token validated for user 507f1f77bcf86cd799439011
❌ Token invalidated by logout
```

---

## Common Issues & Fixes

| Issue                   | Cause                     | Fix                                                |
| ----------------------- | ------------------------- | -------------------------------------------------- |
| Token not saving        | `setToken()` not called   | Call `tokenBroker.setToken(token)` after login     |
| 401 on protected routes | Token missing/expired     | Call `tokenBroker.initialize()` on app load        |
| Logout not working      | Server not called         | Use `tokenBroker.logout()` not just `clearToken()` |
| Token not refreshing    | Auto-refresh disabled     | Call `tokenBroker.setupAutoRefresh()` after login  |
| CORS error              | Wrong origin              | Check `allowedOrigins` in app.js                   |
| Cross-tab sync fails    | Storage events not firing | Ensure same domain & localStorage enabled          |

---

## Best Practices

✅ **DO:**

- Call `tokenBroker.initialize()` on app startup
- Use `useTokenBroker()` hook in components
- Call `tokenBroker.setupAutoRefresh()` after login
- Use `ProtectedRoute` wrapper for auth-required pages
- Use `httpClient` for API calls (auto-includes token)

❌ **DON'T:**

- Store token in global state (use localStorage)
- Manually manipulate tokens
- Make raw fetch calls (use httpClient)
- Skip server-side token validation
- Use `clearToken()` alone - use `logout()` instead
