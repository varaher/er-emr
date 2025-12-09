# 🔗 API URL Reference - ER-EMR Backend

## Your Backend Configuration

```python
# Line 38 in server.py
api_router = APIRouter(prefix="/api")

# Line 2663 in server.py
app.include_router(api_router)
```

**This means ALL your auth endpoints have `/api` prefix!**

---

## ✅ CORRECT URLs

### Base URLs:
```
Local:  http://localhost:8001
Render: https://er-emr-backend.onrender.com
```

### Authentication Endpoints:

| Endpoint | Method | Full URL |
|----------|--------|----------|
| Register | POST | `{BASE_URL}/api/auth/register` |
| Signup | POST | `{BASE_URL}/api/auth/signup` |
| Login | POST | `{BASE_URL}/api/auth/login` |
| Get Profile | GET | `{BASE_URL}/api/auth/me` |
| Update Profile | PUT | `{BASE_URL}/api/auth/profile` |

### Other Endpoints:

| Endpoint | Method | Full URL |
|----------|--------|----------|
| Health Check | GET | `{BASE_URL}/health` (no /api!) |
| API Docs | GET | `{BASE_URL}/docs` (no /api!) |
| OpenAPI JSON | GET | `{BASE_URL}/openapi.json` (no /api!) |
| Subscription Plans | GET | `{BASE_URL}/api/subscription/plans` |
| Hospitals | GET | `{BASE_URL}/api/hospitals` |
| Triage | POST | `{BASE_URL}/api/triage` |
| Cases | GET | `{BASE_URL}/api/cases` |

---

## ❌ WRONG URLs (Will Return 404!)

```bash
# ❌ Missing /api prefix
https://er-emr-backend.onrender.com/auth/login

# ❌ Missing /api prefix
https://er-emr-backend.onrender.com/auth/register

# ❌ Extra /api on health
https://er-emr-backend.onrender.com/api/health
```

---

## 🧪 Test Your Deployment

### Test 1: Health Check (NO /api prefix)
```bash
curl https://er-emr-backend.onrender.com/health

# Expected:
{
  "status": "healthy",
  "service": "ER-EMR Backend",
  "timestamp": "..."
}
```

### Test 2: API Documentation (NO /api prefix)
```bash
# Open in browser:
https://er-emr-backend.onrender.com/docs

# You should see Swagger UI with all endpoints listed
```

### Test 3: Register (WITH /api prefix)
```bash
curl -X POST https://er-emr-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123",
    "name": "Test User",
    "role": "resident",
    "user_type": "individual",
    "subscription_tier": "free"
  }'

# Expected:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {...}
}
```

### Test 4: Login (WITH /api prefix)
```bash
curl -X POST https://er-emr-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'

# Expected:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {...}
}
```

---

## 🔧 React Native Configuration

### Correct Setup:

```javascript
// ✅ CORRECT
const API_BASE_URL = "https://er-emr-backend.onrender.com/api";

// Login
fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Register
fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name, role, user_type, subscription_tier })
});
```

### Wrong Setup:

```javascript
// ❌ WRONG - Missing /api
const API_BASE_URL = "https://er-emr-backend.onrender.com";

fetch(`${API_BASE_URL}/auth/login`, {...});  // Results in /auth/login (404!)


// ❌ WRONG - Double /api
const API_BASE_URL = "https://er-emr-backend.onrender.com/api";

fetch(`${API_BASE_URL}/api/auth/login`, {...});  // Results in /api/api/auth/login (404!)
```

---

## 📋 Quick Verification Checklist

### In `/docs` page, you should see:

```
POST /api/auth/register
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/profile
GET  /api/subscription/plans
GET  /api/hospitals
POST /api/triage
GET  /api/cases
...
```

**If you see these → Backend is deployed correctly!**

### In React Native, your config should have:

```javascript
const BASE_URL = "https://er-emr-backend.onrender.com/api";
// OR
const BASE_URL = "https://er-emr-backend.onrender.com";
const API_URL = BASE_URL + "/api";
```

---

## 🚨 Common Mistakes

### Mistake 1: Forgot /api in Frontend
```javascript
// ❌ WRONG
fetch("https://er-emr-backend.onrender.com/auth/login", ...)

// ✅ CORRECT
fetch("https://er-emr-backend.onrender.com/api/auth/login", ...)
```

### Mistake 2: Added /api to Health Check
```javascript
// ❌ WRONG
fetch("https://er-emr-backend.onrender.com/api/health", ...)

// ✅ CORRECT
fetch("https://er-emr-backend.onrender.com/health", ...)
```

### Mistake 3: Double /api
```javascript
// ❌ WRONG
const BASE = "https://er-emr-backend.onrender.com/api";
fetch(`${BASE}/api/auth/login`, ...)  // Results in /api/api/auth/login

// ✅ CORRECT
const BASE = "https://er-emr-backend.onrender.com/api";
fetch(`${BASE}/auth/login`, ...)  // Results in /api/auth/login
```

---

## 🎯 Summary

### Backend Structure:
```
Root endpoints (no /api):
  GET /health
  GET /docs
  GET /openapi.json

API endpoints (with /api):
  POST /api/auth/register
  POST /api/auth/signup
  POST /api/auth/login
  GET  /api/auth/me
  PUT  /api/auth/profile
  ... (all other endpoints)
```

### Frontend Should Use:
```javascript
const BASE_URL = "https://er-emr-backend.onrender.com/api";

// Then just append the endpoint:
fetch(`${BASE_URL}/auth/login`, ...)      // → /api/auth/login ✅
fetch(`${BASE_URL}/auth/register`, ...)   // → /api/auth/register ✅
fetch(`${BASE_URL}/subscription/plans`, ...) // → /api/subscription/plans ✅
```

---

## ✅ Verify Everything Works

Run these commands in order:

```bash
# 1. Check if backend is running
curl https://er-emr-backend.onrender.com/health

# 2. Check API documentation
curl https://er-emr-backend.onrender.com/docs | grep "auth/login"

# 3. Test register with /api
curl -X POST https://er-emr-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"verify@test.com","password":"test123","name":"Verify","role":"resident","user_type":"individual","subscription_tier":"free"}'

# 4. Test login with /api
curl -X POST https://er-emr-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"verify@test.com","password":"test123"}'
```

**All 4 should work!** If any fail, check the specific error message.

---

## 🔧 If Still Getting 404

1. **Check `/docs` page first:**
   - Go to: https://er-emr-backend.onrender.com/docs
   - Can you see the Swagger UI?
   - Do you see `/api/auth/login` listed?

2. **If `/docs` works but endpoints don't:**
   - You're using wrong URL in frontend
   - Add `/api` prefix to all endpoint calls

3. **If `/docs` returns 404:**
   - Backend not running on Render
   - Check Render Dashboard status
   - Check Render logs for errors
   - Verify build/start commands

4. **If `/docs` works AND `/api/auth/login` is listed:**
   - Test with curl command above
   - If curl works but app doesn't → Frontend URL issue
   - Check React Native code for correct BASE_URL

---

## 📞 Need Help?

Share:
1. Your React Native BASE_URL configuration
2. Screenshot of https://er-emr-backend.onrender.com/docs
3. Exact error message from React Native
4. Result of: `curl https://er-emr-backend.onrender.com/api/auth/login`

I'll help you fix it! 🚀
