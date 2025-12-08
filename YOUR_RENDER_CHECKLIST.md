# ✅ Your Render Deployment Checklist

## Service: https://er-emr-backend.onrender.com
## Issue: 404 Not Found (Backend not running)

---

## 🔴 CRITICAL CHECKS (Do These First!)

### 1. Service Status
- [ ] Go to: https://dashboard.render.com
- [ ] Find service: `er-emr-backend`
- [ ] Status shows: **"Live"** (green)
- [ ] NOT showing: "Deploy failed" or "Suspended"

**If NOT "Live":** Your service didn't deploy! Check why.

---

### 2. Latest Deployment
- [ ] Dashboard → Events tab
- [ ] Latest event shows: **"Deploy live"** ✅
- [ ] NOT showing: "Deploy failed" or "Build failed" ❌

**If Failed:** Click the event to see error logs.

---

### 3. Build Command (CRITICAL!)
Dashboard → Settings → Build & Deploy

**Must be EXACTLY:**
```bash
cd backend && chmod +x build.sh && ./build.sh
```

**Common mistakes:**
- ❌ `pip install -r requirements.txt` (won't install emergentintegrations!)
- ❌ `./build.sh` (missing `cd backend`)
- ❌ `cd backend && ./build.sh` (missing `chmod +x`)

---

### 4. Start Command (CRITICAL!)
Dashboard → Settings → Build & Deploy

**Must be EXACTLY:**
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
```

**Common mistakes:**
- ❌ `uvicorn server:app` (missing `cd backend` and `$PORT`)
- ❌ `python server.py` (wrong command)
- ❌ Using port 8001 instead of `$PORT`

---

### 5. Root Directory
Dashboard → Settings → Build & Deploy

**Should be:**
- Root Directory: (leave EMPTY or `/`)

**NOT:**
- ❌ `/backend` (then your commands would be wrong)

---

### 6. Environment Variables (ALL Required!)
Dashboard → Environment tab

Check you have ALL 7:

```
✓ MONGO_URL = mongodb+srv://...
✓ DB_NAME = er_emr_database
✓ CORS_ORIGINS = *
✓ EMERGENT_LLM_KEY = sk-emergent-1489bD95832530eB39
✓ JWT_SECRET = (any random 32+ character string)
✓ JWT_ALGORITHM = HS256
✓ JWT_EXPIRATION_MINUTES = 43200
```

**Missing any?** Add them and redeploy!

---

## 📋 Check Build Logs

Dashboard → Logs tab → Scroll to build section

**Look for SUCCESS:**
```
✅ Installing emergentintegrations...
✅ Installing requirements from requirements-render.txt...
✅ Build completed successfully!
```

**Or ERROR:**
```
❌ ModuleNotFoundError: No module named 'emergentintegrations'
   → Fix: Check build command includes build.sh

❌ build.sh: not found
   → Fix: Add `chmod +x build.sh` to build command

❌ Permission denied
   → Fix: Add `chmod +x` before `./build.sh`
```

---

## 📋 Check Runtime Logs

Dashboard → Logs tab → Look for latest logs

**Look for SUCCESS:**
```
✅ INFO: Started server process [123]
✅ INFO: Waiting for application startup.
✅ INFO: Application startup complete.
✅ INFO: Uvicorn running on http://0.0.0.0:10000
```

**Or ERROR:**
```
❌ ModuleNotFoundError: No module named 'motor'
   → Fix: Requirements not installed properly

❌ pymongo.errors.ServerSelectionTimeoutError
   → Fix: MongoDB not connected (check MONGO_URL)

❌ Address already in use
   → Fix: Make sure using $PORT, not hardcoded port
```

---

## 🔧 MongoDB Atlas Setup

If you see MongoDB errors:

1. **Go to:** https://cloud.mongodb.com
2. **Network Access:**
   - [ ] Added IP: `0.0.0.0/0` (allow from anywhere)
3. **Database Access:**
   - [ ] Username/password correct
   - [ ] User has read/write permissions
4. **Connection String:**
   - [ ] Copied to MONGO_URL
   - [ ] Password is correct
   - [ ] Special characters URL-encoded

---

## 🚀 QUICK FIX: Force Redeploy

If everything above looks correct:

1. Dashboard → Your service
2. Click **"Manual Deploy"**
3. Select **"Clear build cache & deploy"**
4. Wait 5-10 minutes
5. Check logs for "Application startup complete"

---

## 🧪 Test Your Deployment

After fixing, test these in order:

```bash
# Test 1: Health Check
curl https://er-emr-backend.onrender.com/health

# Expected: {"status":"healthy","service":"ER-EMR Backend",...}
# If 404: Backend not running!

# Test 2: API Docs
curl https://er-emr-backend.onrender.com/docs

# Expected: HTML page
# If 404: Backend not running!

# Test 3: Register
curl -X POST https://er-emr-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","role":"resident","user_type":"individual","subscription_tier":"free"}'

# Expected: {"access_token":"...","user":{...}}
# If 404: Endpoint exists but no /api prefix
# If 500: Server error (check logs)
```

---

## 📸 Share These Screenshots

To help debug, share screenshots of:

1. **Service Status:**
   - Dashboard → Your service (top section showing status)

2. **Build Settings:**
   - Dashboard → Settings → Build & Deploy section

3. **Environment Variables:**
   - Dashboard → Environment tab (hide sensitive values)

4. **Latest Logs:**
   - Dashboard → Logs tab (last 50 lines)

5. **Latest Event:**
   - Dashboard → Events tab (latest deployment event)

---

## 🎯 Most Likely Issue

Based on "404 on /health", your issue is **ONE of these:**

1. **Build Command Wrong** (most common!)
   - Not running `build.sh`
   - Not installing dependencies properly

2. **Start Command Wrong**
   - Not using correct uvicorn command
   - Wrong directory

3. **Service Not Deployed**
   - Build failed
   - Check Events tab

4. **Port Issue**
   - Not using `$PORT` variable
   - Using hardcoded port 8001

---

## ✅ Success Looks Like:

When working, you'll see:

```bash
$ curl https://er-emr-backend.onrender.com/health
{
  "status": "healthy",
  "service": "ER-EMR Backend",
  "timestamp": "2025-12-08T23:45:00Z"
}
```

**Until you see this, your backend is NOT running!**

---

## 📞 Need Help?

Share in order:
1. Service status (Live/Failed)
2. Build command (copy/paste)
3. Start command (copy/paste)
4. Last 30 lines of logs
5. Environment variables list (names only)

I'll help you fix it! 🚀
