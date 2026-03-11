# Token Broker Pattern - Integration Guide

This guide explains how to integrate the Token Broker Pattern into your existing application.

---

## Architecture Overview

```
CLIENT (React)
├── useTokenBroker() hook
├── tokenBrokerService → manages token storage/validation
├── httpClient → auto-adds token to requests
└── ProtectedRoute → requires authentication

SERVER (Node.js/Express)
├── tokenBroker → generates/validates tokens
├── authenticateWithBroker → token middleware
├── authWithBroker router → endpoints using broker
└── User model → stores tokens
```

---

## Server-Side Implementation

### 1. Token Broker Initialize

The `tokenBroker.js` is already imported in `authWithBroker.js`:

```javascript
const tokenBroker = require("../broker/tokenBroker");
```

### 2. Use Token Broker in Endpoints

**Login (signin):**

```javascript
const token = await tokenBroker.generateAuthToken(user, { device: "web" });
```

**Authentication Middleware:**

```javascript
const { token: decoded, user } = await tokenBroker.authenticate(token);
```

**Logout:**

```javascript
await tokenBroker.revokeToken(userId, token);
```

**Token Refresh:**

```javascript
const newToken = await tokenBroker.refreshToken(oldToken);
```

### 3. Update app.js to Use New Router

Currently, your `app.js` uses the old `authRouter`. To use the new broker-based router:

```javascript
// OLD:
const authRouter = require("./router/auth");
app.use(authRouter);

// NEW:
const authWithBroker = require("./router/authWithBroker");
app.use(authWithBroker);
```

Or run BOTH for backwards compatibility.

### 4. API Endpoints with Token Broker

| Endpoint          | Method | Purpose                   |
| ----------------- | ------ | ------------------------- |
| `/signin`         | POST   | Login and get token       |
| `/check-auth`     | GET    | Verify authentication     |
| `/user`           | GET    | Get user details          |
| `/logout`         | GET    | Revoke current token      |
| `/logout-all`     | GET    | Revoke all tokens         |
| `/refresh-token`  | POST   | Get new token             |
| `/token-info`     | GET    | Get token expiration info |
| `/validate-token` | POST   | Validate a token          |
| `/sync-token`     | GET    | Sync token across domains |

---

## Client-Side Implementation

### 1. Token Storage

**Store Token:**

```javascript
import { tokenBroker } from "@/services/tokenBrokerService";

tokenBroker.setToken(token);
```

**Get Token:**

```javascript
const token = tokenBroker.getToken();
```

**Clear Token:**

```javascript
tokenBroker.clearToken();
```

### 2. Using the Custom Hook

In any React component:

```javascript
import { useTokenBroker } from "@/hooks/useTokenBroker";

export default function MyComponent() {
  const { token, isAuthenticated, userInfo, logout, refreshToken } =
    useTokenBroker();

  if (!isAuthenticated) {
    return <p>Please login first</p>;
  }

  return (
    <div>
      <p>Welcome {userInfo?.email}</p>
      <button onClick={logout}>Logout</button>
      <button onClick={refreshToken}>Refresh Token</button>
    </div>
  );
}
```

### 3. Protected Routes

Wrap routes that need authentication:

```javascript
import ProtectedRoute from "@/components/ProtectedRoute";

<Routes>
  <Route path="/login" element={<Login />} />
  <Route
    path="/"
    element={
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    }
  />
</Routes>;
```

### 4. HTTP Requests with Auto Token

Use the httpClient for automatic token inclusion:

```javascript
import { httpClient } from "@/services/httpClient";

// GET request
const { data } = await httpClient.get("/user");

// POST request
const { data } = await httpClient.post("/data", {
  name: "John",
});

// DELETE request
const { data } = await httpClient.delete("/item/123");
```

The httpClient automatically:

- Adds token to `Authorization: Bearer` header
- Sends credentials with requests
- Handles 401 errors by refreshing token
- Retries request with new token

### 5. Login Component

Use the new `LoginWithBroker` component:

```javascript
import LoginWithBroker from "@/components/LoginWithBroker";

// Or implement your own using tokenBroker:
const { data } = await httpClient.post("/signin", {
  email,
  password,
});

// Store token
tokenBroker.setToken(data.token);
tokenBroker.setupAutoRefresh(); // Optional auto-refresh
```

### 6. Logout Component

Use the new `LogoutWithBroker` component:

```javascript
import LogoutWithBroker from "@/components/LogoutWithBroker";

// Or manually:
await tokenBroker.logout(); // Calls server AND clears locally
```

---

## Migration Steps

If you already have an app without Token Broker:

### Step 1: Add Server-Side Broker

```bash
# Copy broker folder to server
server/broker/tokenBroker.js
```

### Step 2: Create New Auth Middleware

```bash
# Copy authenticateWithBroker
server/middleware/authenticateWithBroker.js
```

### Step 3: Create New Auth Router

```bash
# Copy authWithBroker
server/router/authWithBroker.js
```

### Step 4: Update app.js

```javascript
// Add or switch to:
const authWithBroker = require("./router/authWithBroker");
app.use(authWithBroker);
```

### Step 5: Add Client Services

```bash
client/src/services/tokenBrokerService.js
client/src/services/httpClient.js
client/src/hooks/useTokenBroker.js
client/src/components/ProtectedRoute.jsx
client/src/components/LoginWithBroker.jsx
client/src/components/LogoutWithBroker.jsx
```

### Step 6: Update Routes

Replace old Login/Logout with new Broker versions, and wrap protected routes.

---

## Token Lifecycle with Broker

### Login -> Token Storage -> Auto-Refresh -> Logout

```
1. USER LOGS IN
   └─> POST /signin with email+password
       └─> Server validates credentials
           └─> tokenBroker.generateAuthToken()
               └─> Creates JWT, stores in DB
                   └─> Returns token to client
                       └─> Client: tokenBroker.setToken()

2. AUTHENTICATED REQUESTS
   └─> Component calls httpClient.get("/user")
       └─> httpClient adds token: Authorization: Bearer <token>
           └─> Request sent to server
               └─> Server middleware: authenticateWithBroker
                   └─> tokenBroker.authenticate() validates
                       └─> Returns user data to component

3. TOKEN EXPIRING SOON
   └─> useTokenAutoRefresh() detects expiration in 5 minutes
       └─> Calls tokenBroker.refreshToken()
           └─> Server: tokenBroker.refreshToken()
               └─> Revokes old token, generates new one
                   └─> Returns new token to client
                       └─> Client updates token storage

4. USER LOGS OUT
   └─> Click logout button
       └─> Calls tokenBroker.logout()
           └─> POST /logout with token
               └─> Server: tokenBroker.revokeToken()
                   └─> Removes token from DB
                       └─> Increments logoutVersion
                           └─> Client clears localStorage
                               └─> Redirect to /login
```

---

## Data Flow Example

### Login Request

```
Client
  ├─ User enters email: "user@example.com", password: "secret"
  ├─ LoginWithBroker component calls httpClient.post("/signin", {...})
  │
Server
  ├─ authWithBroker receives POST /signin
  ├─ Validates credentials against DB
  ├─ Password hash matches ✓
  ├─ tokenBroker.generateAuthToken(user)
  │  ├─ Creates JWT payload: { _id, email, logoutVersion, iat, exp }
  │  ├─ Signs with SECRET_KEY
  │  ├─ Adds token to user.tokens array in DB
  │  ├─ Returns signed token string
  ├─ Sets cookie: jwtoken={token}
  ├─ Returns JSON: { user: {...}, token: "jwt..." }
  │
Client
  ├─ LoginWithBroker receives response
  ├─ tokenBroker.setToken(token) → localStorage.setItem("app_token", token)
  ├─ tokenBroker.setupAutoRefresh() → starts 1-minute interval checks
  └─ navigate("/") → redirect to dashboard
```

### Authenticated Request

```
Client
  ├─ Home component needs user data
  ├─ const { data } = await httpClient.get("/user")
  │
  │  httpClient.get()
  │  ├─ Gets token: tokenBroker.getToken() → "jwt..."
  │  ├─ Builds headers: { Authorization: "Bearer jwt..." }
  │  ├─ fetch("/user", { headers, credentials: "include" })
  │
Server
  ├─ authenticateWithBroker middleware intercepts
  ├─ Extracts token from Authorization header
  ├─ Calls tokenBroker.authenticate(token)
  │  ├─ jwt.verify() validates signature ✓
  │  ├─ Checks token in user.tokens array ✓
  │  ├─ Checks logoutVersion matches ✓
  │  └─ Returns full user object
  ├─ req.rootUser = user
  ├─ next() passes to route handler
  │
  ├─ Route handler returns user data in JSON
  │
Client
  └─ Component renders user data
```

---

## Configuration

### Token Expiration

Edit in `server/broker/tokenBroker.js`:

```javascript
this.tokenExpiry = "1h"; // Default 1 hour
```

### Auto Refresh Buffer

Edit in component or hook:

```javascript
tokenBroker.setupAutoRefresh(5 * 60 * 1000); // Refresh 5 min before exp
```

### API Base URL

Edit in `client/src/services/httpClient.js`:

```javascript
constructor(baseURL = "http://localhost:5000") { ... }
```

---

## Security Considerations

1. **HTTPOnly Cookies**: Token in cookie is `httpOnly: true` (not accessible to JS)
2. **CORS**: Set specific origins in production, not wildcard
3. **HTTPS**: Set `secure: true` on cookies in production
4. **Token Rotation**: Use refresh tokens for longer sessions
5. **Logout Version**: Invalidates all old tokens on logout
6. **Database Verification**: Each request checks token exists in DB

---

## Testing

### Test Login

```bash
POST http://localhost:5000/signin
Body: { email: "user@example.com", password: "password" }
```

### Test Protected Endpoint

```bash
GET http://localhost:5000/user
Header: Authorization: Bearer <token_from_login>
```

### Test Logout

```bash
GET http://localhost:5000/logout
Header: Authorization: Bearer <token>
```

### Test Token Refresh

```bash
POST http://localhost:5000/refresh-token
Header: Authorization: Bearer <old_token>
```

---

## Troubleshooting

### Token Not Persisting After Refresh

- Check localStorage in DevTools → Application → LocalStorage
- Ensure `tokenBroker.setToken()` is called

### 401 Unauthorized on Protected Routes

- Verify token is in localStorage
- Check token expiration: `tokenBroker.isTokenExpired()`
- Verify server can decode JWT (check SECRET_KEY)

### Cross-Tab Sync Not Working

- Ensure you're subscribed: `tokenBroker.subscribe(callback)`
- Check storage events listener is setup

### Auto-Refresh Not Triggering

- Ensure `tokenBroker.setupAutoRefresh()` is called after login
- Check browser console for refresh logs

---

## Next Steps

1. ✅ Implement Token Broker on server
2. ✅ Implement Token Broker on client
3. ⏭️ Add refresh token (separate token for getting new access tokens)
4. ⏭️ Add token rotation (auto-rotate on each refresh)
5. ⏭️ Add multi-device support (track devices, logout from specific device)
6. ⏭️ Add rate limiting on auth endpoints
7. ⏭️ Add audit logging (log all auth events)
