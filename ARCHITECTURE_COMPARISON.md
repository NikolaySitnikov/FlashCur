# NextAuth API Route Architecture - Visual Comparison

## 🔴 BEFORE (Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Client                             │
│                                                                   │
│  Tries to get session: GET /api/auth/session                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js Frontend (Port 3000)                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ next.config.js Rewrite Rule:                             │   │
│  │                                                            │   │
│  │ source: '/api/:path*'                                    │   │
│  │ destination: 'http://localhost:3001/api/:path*'         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                    Intercepts ALL /api/*                         │
│                             │                                    │
│        Tries to route /api/auth/session to backend ❌            │
│                             │                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               Backend Server (Port 3001)                         │
│                                                                   │
│  ❌ ECONNREFUSED (backend not running)                           │
│     OR                                                            │
│  ❌ 404 Not Found (backend doesn't have /api/auth/session)      │
│     OR                                                            │
│  ❌ 500 Internal Server Error (wrong response type)             │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Client (Browser)                            │
│                                                                   │
│  ❌ Gets HTML error page instead of JSON                        │
│  ❌ Tries to parse HTML as JSON                                 │
│  ❌ ClientFetchError: Unexpected token < in JSON                │
│  ❌ Session fails to load                                       │
│  ❌ Can't log in                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ AFTER (Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Client                             │
│                                                                   │
│  Tries to get session: GET /api/auth/session                    │
│  Also makes API calls: GET /api/users                           │
└────────────────────────────┬──────────────────────┬──────────────┘
                             │                      │
                    Requests for auth       Requests for API
                             │                      │
        ┌────────────────────┘                      │
        │                                            │
        ▼                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js Frontend (Port 3000)                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ next.config.js Rewrite Rules (FIXED):                    │   │
│  │                                                            │   │
│  │ source: '/api/((?!auth).*)/:path*'                       │   │
│  │ destination: 'http://localhost:3001/api/$1/:path*'      │   │
│  │                                                            │   │
│  │ Matches: /api/users ✅ (no 'auth' in path)              │   │
│  │ Excludes: /api/auth/session ✅ (has 'auth')             │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬──────────────────────┬──────────────┘
        │                                            │
        │                    ┌───────────────────────┘
        │                    │
        ▼                    ▼
    ┌──────────────────┐ ┌──────────────────────────────┐
    │ NextAuth Handler │ │ Rewrite to Backend           │
    │ (Local Route)    │ │ (Backend API)                │
    └────────┬─────────┘ └──────────┬───────────────────┘
             │                      │
             ▼                      ▼
    ┌──────────────────┐ ┌──────────────────────────────┐
    │ src/app/api/     │ │ Backend Server               │
    │ auth/[...next]   │ │ (Port 3001)                  │
    │ /route.ts        │ │                              │
    │                  │ │ GET /api/users ✅            │
    │ Returns valid    │ │ POST /api/trades ✅          │
    │ JSON session ✅  │ │ GET /api/alerts ✅           │
    └────────┬─────────┘ └──────────┬───────────────────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
    ┌──────────────────────────────────────┐
    │      Client (Browser)                 │
    │                                       │
    │ ✅ Session endpoint: 200 JSON         │
    │ ✅ Backend endpoints: 200 JSON        │
    │ ✅ No parsing errors                  │
    │ ✅ Can log in successfully            │
    │ ✅ Dashboard loads                    │
    │ ✅ Everything works! 🎉               │
    └──────────────────────────────────────┘
```

---

## Route Pattern Explanation

### The Regex Pattern: `/api/((?!auth).*)/:path*`

```
/api/
    ├─ (           Start of capture group
    │  ├─ (?!auth) Negative lookahead: Exclude if 'auth' follows
    │  ├─ .*       Match any characters after the exclusion
    │  └─ )        End of capture group (becomes $1 in destination)
    └─ /:path*     Match the rest of the path
```

### Example Matching:

```
/api/users
├─ /api/ ✅ Matches initial part
├─ ((?!auth).*) → Matches 'users' ✅ (no 'auth' at start)
├─ /:path* → Matches empty string or trailing path
└─ Result: PROXIED to backend ✅

/api/auth/session
├─ /api/ ✅ Matches initial part
├─ ((?!auth).*) → NO MATCH ❌ ('auth' found at start)
├─ Pattern fails to match
└─ Result: NOT PROXIED, runs locally ✅

/api/trades/123
├─ /api/ ✅ Matches initial part
├─ ((?!auth).*) → Matches 'trades' ✅ (no 'auth' at start)
├─ /:path* → Matches '/123'
└─ Result: PROXIED to backend ✅

/api/authenticate
├─ /api/ ✅ Matches initial part
├─ ((?!auth).*) → NO MATCH ❌ (starts with 'auth')
├─ Pattern fails to match
└─ Result: NOT PROXIED, runs locally ❌ (would be error if NextAuth doesn't have this route)
```

---

## Environment Variables Flow

```
.env.local
├─ NEXTAUTH_URL=http://localhost:3000
│  └─ Tells NextAuth where the app is running
│
├─ NEXTAUTH_SECRET=1ec0c125c5bdd...
│  └─ Signs JWT tokens for session security
│
├─ NEXT_PUBLIC_API_URL=http://localhost:3001
│  └─ Used in next.config.js rewrites
│  └─ Tells frontend where backend is
│
└─ NEXT_PUBLIC_WS_URL=ws://localhost:3001
   └─ WebSocket connection for real-time data

All these are loaded at:
- Build time (for server)
- Browser (for NEXT_PUBLIC_* variables)
```

---

## Request Flow Comparison

### ❌ Before Fix: GET /api/auth/session

```
Client: GET /api/auth/session
   ↓
Next.js: Check rewrites
   ↓
Rewrite Rule: source: '/api/:path*' matches ✅
   ↓
Rewrite: Send to http://localhost:3001/api/auth/session
   ↓
Backend: No such route ❌
   ↓
Response: 500 Error (HTML)
   ↓
Client: Tries to JSON.parse(html) ❌ CRASH
```

### ✅ After Fix: GET /api/auth/session

```
Client: GET /api/auth/session
   ↓
Next.js: Check rewrites
   ↓
Rewrite Rule: source: '/api/((?!auth).*)/:path*' checks
   ↓
Pattern Check: 'auth' found at start? YES ❌
   ↓
Rewrite: NO MATCH - let Next.js handle it
   ↓
Next.js: Look for src/app/api/auth/[...nextauth]/route.ts ✅
   ↓
NextAuth Handler: Process session request
   ↓
Response: 200 JSON { user: {...} } ✅
   ↓
Client: JSON.parse(response) ✅ SUCCESS
```

### ✅ After Fix: GET /api/users

```
Client: GET /api/users
   ↓
Next.js: Check rewrites
   ↓
Rewrite Rule: source: '/api/((?!auth).*)/:path*' checks
   ↓
Pattern Check: 'auth' found at start? NO ✅
   ↓
Pattern Match: 'users' captured in $1 ✅
   ↓
Rewrite: Send to http://localhost:3001/api/users ✅
   ↓
Backend: Process request
   ↓
Response: 200 JSON { data: [...] } ✅
   ↓
Client: JSON.parse(response) ✅ SUCCESS
```

---

## Component Interactions

```
┌──────────────────────────────────┐
│   src/app/page.tsx              │
│   Calls: const session = auth()  │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   src/app/layout.tsx             │
│   Wraps with: <Providers>        │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   src/components/providers.tsx   │
│   ├─ QueryClientProvider         │
│ ├─ SessionProvider               │
│ ├─ Web3Providers                 │
│ └─ ThemeProvider                 │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   next-auth/react (client-side)  │
│   Makes: GET /api/auth/session   │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   next.config.js rewrites        │
│   ✅ Pattern EXCLUDES /auth      │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   src/app/api/auth/[...nextauth] │
│   /route.ts                      │
│   export { GET, POST } = handlers│
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   src/lib/auth.ts                │
│   NextAuth handlers              │
│   ├─ CredentialsProvider         │
│ ├─ JWT callbacks                 │
│ └─ Session callbacks             │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   SessionProvider state updated  │
│   ✅ Session available           │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│   Dashboard renders              │
│   ✅ User is authenticated       │
└──────────────────────────────────┘
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Auth Routes** | Sent to backend ❌ | Handled locally ✅ |
| **/api/auth/session** | 500 Error ❌ | 200 JSON ✅ |
| **API Routes** | Sent to backend ✅ | Sent to backend ✅ |
| **/api/users** | Works ✅ | Works ✅ |
| **Session Loading** | Fails ❌ | Works ✅ |
| **Login** | Can't log in ❌ | Works ✅ |
| **Dashboard** | Blank/Error ❌ | Loads ✅ |

**The Key Insight**: NextAuth v5 needs its routes to run locally on the Next.js server, not be proxied to a separate backend!
