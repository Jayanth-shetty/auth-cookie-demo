# Token Broker Pattern - Before & After Comparison

## Code Comparison: Login

### BEFORE (Without Token Broker)

**Router (auth.js):**

```javascript
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
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

    // Generate token
    const token = await userLogin.generateAuthToken(); // On User model

    // Set cookie
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

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
```

**User Model (userSchema.js):**

```javascript
userSchema.methods.generateAuthToken = async function () {
  try {
    let token = jwt.sign(
      { _id: this._id, logoutVersion: this.logoutVersion || 0 },
      process.env.SECRET_KEY,
    );
    this.tokens = this.tokens.concat({ token: token });
    await this.save();
    return token;
  } catch (err) {
    console.log(err);
  }
};
```

**Client (Login.jsx):**

```javascript
const loginUser = async (e) => {
  e.preventDefault();
  const res = await fetch("http://localhost:5000/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (res.status === 400 || !data) {
    window.alert("Invalid credentials");
  } else {
    localStorage.setItem("token", data.token);
    window.alert("Login successful!");
    navigate("/", { state: { token: data.token } });
  }
};
```

---

### AFTER (With Token Broker)

**Router (authWithBroker.js):**

```javascript
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
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

    // Set cookie
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({
      message: "Signin successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token: token,
    });
  } catch (err) {
    console.log("❌ Sign in error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});
```

**Token Broker (tokenBroker.js):**

```javascript
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

    user.tokens = user.tokens.concat({ token });
    await user.save();

    console.log(`✓ Token generated for user ${user.email}`);
    return token;
  } catch (err) {
    console.log("❌ Error generating token:", err.message);
    throw new Error("Failed to generate token");
  }
}
```

**Client (LoginWithBroker.jsx):**

```javascript
const loginUser = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const { data } = await httpClient.post("/signin", {
      email,
      password,
    });

    if (!data.token) {
      throw new Error("No token received");
    }

    // Store token using Token Broker
    tokenBroker.setToken(data.token);
    tokenBroker.setupAutoRefresh();

    navigate("/", { state: { user: data.user } });
  } catch (err) {
    setError(err.message || "Invalid credentials");
  } finally {
    setLoading(false);
  }
};
```

---

## Code Comparison: Authentication

### BEFORE (Without Token Broker)

**Middleware (authenticate.js):**

```javascript
const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies.jwtoken;
    let tokenSource = "cookie";

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
        tokenSource = "header";
      }
    }

    console.log(
      `Auth check: Token from ${tokenSource}:`,
      token ? "exists" : "missing",
    );

    if (!token) {
      console.log("Auth failed: No token found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify JWT signature
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Token verified, user ID:", verifyToken._id);

    // Get user and check logoutVersion
    const rootUser = await User.findById(verifyToken._id);

    if (!rootUser) {
      console.log("Auth failed: User not found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check logout version
    const tokenLogoutVersion = verifyToken.logoutVersion || 0;
    const currentLogoutVersion = rootUser.logoutVersion || 0;

    if (tokenLogoutVersion !== currentLogoutVersion) {
      console.log(`❌ Auth failed: Token invalidated`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if token exists in array
    const tokenExists = rootUser.tokens.some((t) => t.token === token);

    if (!tokenExists) {
      console.log("❌ Auth failed: Token not in database");
      return res.status(401).json({ error: "Unauthorized" });
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
```

---

### AFTER (With Token Broker)

**Middleware (authenticateWithBroker.js):**

```javascript
const authenticate = async (req, res, next) => {
  try {
    // Extract token
    let token = req.cookies.jwtoken;
    let tokenSource = "cookie";

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
        tokenSource = "header";
      }
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Use Token Broker for authentication
    const { token: decoded, user } = await tokenBroker.authenticate(token);

    // Attach to request
    req.token = token;
    req.decodedToken = decoded;
    req.rootUser = user;
    req.userID = user._id;
    req.tokenSource = tokenSource;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
```

---

## Code Comparison: Client Token Management

### BEFORE (Without Token Broker)

Manual token handling scattered across components:

```javascript
// Login stores token
localStorage.setItem("token", data.token);

// Component checks manually
const token = localStorage.getItem("token");

// No auto-refresh
// No cross-tab sync
// No expiration checks
```

---

### AFTER (With Token Broker)

Centralized token management in service:

```javascript
// Service handles everything
import { tokenBroker } from "@/services/tokenBrokerService";

// Store token
tokenBroker.setToken(data.token);

// Setup auto-refresh
tokenBroker.setupAutoRefresh();

// In component, use hook
const { token, isAuthenticated, logout } = useTokenBroker();

// Automatic features:
// - Cross-tab sync
// - Auto-refresh
// - Expiration checks
// - Event notifications
```

---

## Comparison Table

| Feature                | BEFORE                        | AFTER                          |
| ---------------------- | ----------------------------- | ------------------------------ |
| **Token Generation**   | In User model                 | Centralized TokenBroker        |
| **Token Validation**   | In middleware                 | TokenBroker method             |
| **Token Refresh**      | Not implemented               | TokenBroker method             |
| **Logout**             | Increments version            | TokenBroker.revokeToken()      |
| **Client Token Store** | Raw localStorage              | TokenBrokerService             |
| **React Integration**  | Manual fetch calls            | useTokenBroker() hook          |
| **Server Calls**       | Raw fetch                     | httpClient wrapper             |
| **Cross-Tab Sync**     | Manual                        | Automatic (TokenBroker)        |
| **Auto-Refresh**       | Not implemented               | TokenBroker.setupAutoRefresh() |
| **Expiration Checks**  | Manual                        | TokenBroker.isTokenExpired()   |
| **Error Handling**     | Scattered                     | Centralized                    |
| **Code Duplication**   | High (token logic everywhere) | Low (single source of truth)   |
| **Testability**        | Hard (coupled)                | Easy (isolated)                |
| **Maintenance**        | Difficult                     | Easy                           |

---

## Benefits Summary

### Code Organization

- **Before**: Token logic in auth.js, user model, middleware, multiple components
- **After**: Token logic in single TokenBroker service

### Consistency

- **Before**: Different validation approaches per endpoint
- **After**: Single `authenticate()` method always used

### Features

- **Before**: Manual token management, no refresh, no sync
- **After**: Auto-refresh, cross-tab sync, expiration checks

### Developer Experience

- **Before**: Must understand multiple files and patterns
- **After**: Use `useTokenBroker()` hook everywhere

### Debugging

- **Before**: Trace token through multiple files
- **After**: All logs in TokenBroker class

### Scalability

- **Before**: Adding refresh requires changes everywhere
- **After**: Add to TokenBroker, everything uses it automatically

---

## Migration Checklist

When upgrading from OLD to NEW pattern:

- [ ] Copy `server/broker/tokenBroker.js`
- [ ] Copy `server/middleware/authenticateWithBroker.js`
- [ ] Copy `server/router/authWithBroker.js`
- [ ] Update `app.js` to use new router (or run both)
- [ ] Copy `client/src/services/tokenBrokerService.js`
- [ ] Copy `client/src/services/httpClient.js`
- [ ] Copy `client/src/hooks/useTokenBroker.js`
- [ ] Copy `client/src/components/ProtectedRoute.jsx`
- [ ] Copy `client/src/components/LoginWithBroker.jsx`
- [ ] Copy `client/src/components/LogoutWithBroker.jsx`
- [ ] Update `App.jsx` to initialize TokenBroker
- [ ] Update routes to use new components
- [ ] Test login flow
- [ ] Test protected routes
- [ ] Test logout
- [ ] Test token refresh
- [ ] Test cross-tab sync

---

## Key Improvements

1. **Single Responsibility**: Token logic in one place
2. **DRY**: No repeated validation logic
3. **Testable**: TokenBroker can be tested independently
4. **Reusable**: All services extend TokenBroker
5. **Scalable**: Easy to add refresh tokens, device tracking, etc.
6. **Maintainable**: Changes in one place affect entire app
7. **Secure**: Consistent validation everywhere
8. **User-Friendly**: Auto-refresh prevents surprise logouts
