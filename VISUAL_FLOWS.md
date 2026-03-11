# Token Broker Pattern - Visual Flows

## Login Flow Sequence Diagram

```
USER              BROWSER              SERVER
  │                 │                    │
  ├─ Enter email ──→│                    │
  │                 │                    │
  ├─ Enter password ─→│                  │
  │                 │                    │
  │                 ├─ POST /signin ────→│
  │                 │ (email, password)  │
  │                 │                    ├─ Validate credentials
  │                 │                    ├─ tokenBroker.generateAuthToken()
  │                 │                    │  ├─ Create JWT
  │                 │                    │  ├─ Sign with SECRET_KEY
  │                 │                    │  └─ Store in DB
  │                 │                    │
  │                 │ ← 200 OK ──────────┤
  │                 │ { token, user }    │
  │                 │                    │
  │                 ├─ tokenBroker.setToken()
  │                 ├─ localStorage.setItem("app_token", token)
  │                 │
  │                 ├─ setupAutoRefresh()
  │                 │
  ← Redirect /──────┤
                    │ (navigate with token)
```

## Authentication Check Flow

```
COMPONENT         CLIENT BROKER         SERVER
     │                  │                  │
     ├─ useTokenBroker()──→ getToken()    │
     │                  │                  │
     ├─ isAuthenticated?    │              │
     ├─────────────────────→ isTokenExpired()
     │                  │                  │
     │                  ← false ────────────
     │                  │                  │
     ├─ Render component with user data   │
     │                                     │
     │                                     │
     ├─ Need data? ───────────────────────→
     │ httpClient.get("/user")            │
     │                  │                  │
     │                  ├─ Add token to header
     │                  │ Authorization: Bearer <token>
     │                  │
     │                  ├─ fetch() ──────→│
     │                  │                  │
     │                  │          ← 200 OK with user data
     │                  │                  │
     │ ← data ──────────┤
     │                  │
```

## Token Expiration & Refresh Flow

```
APP RUNNING          TOKEN BROKER         SERVER
     │                    │                  │
     │ setupAutoRefresh() │                  │
     ├───────────→ Start 1-min check loop    │
     │                    │                  │
     │                    ├─ getTimeUntilExpiry()
     │                    │                  │
     │                    ├─ Is < 5 minutes?
     │                    │                  │
     │                    ├─ YES: refreshToken()
     │                    │                  │
     │                    ├─ POST /refresh-token
     │                    ├─────────────────→│
     │                    │ Authorization: Bearer <old_token>
     │                    │                  │
     │                    │      ← 200 OK ───┤
     │                    │      { token: new_token }
     │                    │                  │
     │                    ├─ setToken(new_token)
     │                    ├─ localStorage.setItem("app_token", new_token)
     │                    │                  │
     │ ← Token refreshed  │                  │
     │   Continue using   │                  │
```

## Logout Flow

```
USER          COMPONENT         BROKER         SERVER
  │               │               │              │
  ├ Click logout  │               │              │
  │               │               │              │
  │               ├─ logout() ───→│              │
  │               │               │              │
  │               │               ├─ GET /logout
  │               │               ├─────────────→│
  │               │               │ Bearer token │
  │               │               │              │
  │               │               │   ┌─ Verify token
  │               │               │   ├─ tokenBroker.revokeToken()
  │               │               │   ├─ Remove from user.tokens[]
  │               │               │   └─ Return 200 OK
  │               │               │              │
  │               │               ← 200 OK ─────┤
  │               │               │              │
  │               │               ├─ clearToken()
  │               │               ├─ localStorage.removeItem("app_token")
  │               │               ├─ stopAutoRefresh()
  │               │               │
  │               ← Redirect /login│
  │               │               │
← Logged out ────────────────────→
```

## Cross-Tab Synchronization

```
TAB 1              LOCAL STORAGE          TAB 2
   │                   │                    │
   ├─ Login ───────────→│                    │
   │ setToken(token)    │                    │
   │                    ├─ Storage event ──→│
   │                    │ (key: app_token)   │
   │                    │                    ├─ Listen for storage change
   │                    │                    ├─ notifyListeners()
   │                    │                    │
   │                    │                    ├─ useTokenBroker updates
   │                    │                    ├─ userInfo changes
   │                    │                    ├─ Re-render with new user
   │                    │                    │
   │                    │                    ├─ API calls now work
   │                    │                    │ (same token)
```

## Error Recovery Flow

```
COMPONENT         CLIENT BROKER         SERVER
     │                  │                  │
     ├─ API call ──────→│                  │
     │ (with token)     │                  │
     │                  ├─ fetch() ───────→│
     │                  │                  │
     │                  │ ← 401 Error ────┤
     │                  │ (Token invalid)  │
     │                  │                  │
     │                  ├─ Try refreshToken()
     │                  │                  │
     │                  ├─ POST /refresh-token
     │                  ├─────────────────→│
     │                  │                  │
     │                  │ ← 401 Error ────┤
     │                  │ (Old token expired)
     │                  │                  │
     │                  ├─ clearToken()
     │                  │
     │ ← Redirect /login ─
     │                   (user needs to re-auth)
```

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│         REACT COMPONENTS LAYER              │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Login   │  │ Home     │  │ Logout     │ │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘ │
│       │            │              │        │
└───────┼────────────┼──────────────┼────────┘
        │            │              │
┌───────┼────────────┼──────────────┼────────┐
│       ▼            ▼              ▼        │
│  ┌────────────────────────────────────┐  │
│  │    CUSTOM HOOKS LAYER              │  │
│  │  useTokenBroker()                  │  │
│  │  useProtectedRoute()               │  │
│  │  useTokenAutoRefresh()             │  │
│  │  useTokenSync()                    │  │
│  └────────────────────────────────────┘  │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │    SERVICES LAYER                  │  │
│  │  ┌────────────────────────────┐   │  │
│  │  │ TokenBrokerService         │   │  │
│  │  │ (localStorage mgmt,        │   │  │
│  │  │ validation, refresh)       │   │  │
│  │  └────────────────────────────┘   │  │
│  │                                    │  │
│  │  ┌────────────────────────────┐   │  │
│  │  │ HttpClient                 │   │  │
│  │  │ (auto token injection)     │   │  │
│  │  └────────────────────────────┘   │  │
│  └────────────────────────────────────┘  │
│                                           │
│         REACT CLIENT LAYER                │
└─────────────────────────────────────────┘
           │
           │ HTTP/FETCH
           │
┌──────────▼──────────────────────────────┐
│                                        │
│  ┌──────────────────────────────────┐  │
│  │    MIDDLEWARE LAYER              │  │
│  │                                  │  │
│  │  authenticateWithBroker          │  │
│  │  (extract + validate token)      │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│          EXPRESS.JS SERVER             │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │    ROUTES LAYER                  │  │
│  │                                  │  │
│  │  POST /signin                    │  │
│  │  GET /user                       │  │
│  │  GET /logout                     │  │
│  │  POST /refresh-token             │  │
│  │  etc.                            │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │    TOKEN BROKER LAYER            │  │
│  │                                  │  │
│  │  tokenBroker                     │  │
│  │  ├─ generateAuthToken()          │  │
│  │  ├─ validateToken()              │  │
│  │  ├─ authenticate()               │  │
│  │  ├─ revokeToken()                │  │
│  │  ├─ refreshToken()               │  │
│  │  └─ getTokenInfo()               │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────┬─────────────────────┘
                 │ MongoDB Driver
                 ▼
         ┌────────────────┐
         │   DATABASE     │
         │  (User Model)  │
         │  - tokens[]    │
         │  - logoutVer.  │
         └────────────────┘
```

## Token State Transitions

```
                    ┌─────────────────┐
                    │   NO TOKEN      │
                    │ (Not logged in)  │
                    └────┬────────────┘
                         │
                    (User clicks Login)
                         │
                         ▼
                    ┌─────────────────┐
                    │  VALID TOKEN    │◄──────┐
                    │ (Authenticated)  │       │
                    └────┬────────────┘       │
                         │                   │
        ┌────────────────┬┤                   │
        │               │                    │
   (Auto-refresh)  (Logout clicked)   (Token refreshed)
        │               │                    │
        │               ▼                    │
        │        ┌──────────────┐            │
        │        │  REVOKING    │            │
        │        │ (logout API) │            │
        │        └──────┬───────┘            │
        │               │                    │
        │               ▼                    │
        │        ┌──────────────┐            │
        │        │  CLEARED     │            │
        │        │ (Not logged in)           │
        │        └──────────────┘            │
        │               │                    │
        │               └──→ NO TOKEN ───────┘
        │
        └─→ VALID TOKEN (same user)
```

## Memory/Storage States

```
COMPONENT STATE          BROWSER STORAGE          SERVER DATABASE
     │                        │                          │
     │                        │                          │
Token: null             localStorage: {}          User.tokens: []
isAuth: false           Cookies: {}               logoutVersion: 1
userInfo: null          SessionStorage: {}
     │                        │                          │
▼ (User logs in)              │                          │
     │                        │                          │
Token: "jwt..."      localStorage:                User.tokens: [
isAuth: true         app_token: "jwt..."           { token: "jwt..." }
userInfo: {        Cookies:                       ]
  id: "123",       jwtoken: "jwt..." (httpOnly)   logoutVersion: 1
  email: "..."     }
}
     │                        │                          │
▼ (Token expires)             │                          │
     │                   (Auto refresh triggered)       │
     │                        │                          │
Token: "jwt2..."  localStorage:                  User.tokens: [
isAuth: true      app_token: "jwt2..." (new)      { token: "jwt2..." }
userInfo: {...}   (old token still visible)       (old revoked)
                  }                                logoutVersion: 1
     │                        │                          │
▼ (User logs out)             │                          │
     │                        │                          │
Token: null       localStorage:                  User.tokens: []
isAuth: false     app_token: (cleared)            logoutVersion: 2
userInfo: null    Cookies:                       (updated!)
                  (jwtoken cleared)
                  SessionStorage: {}
```
