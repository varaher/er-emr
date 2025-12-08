# 🚨 FIX: Render Returns 404 Not Found

## Your Issue:
```
URL: https://er-emr-backend.onrender.com
Error: 404 Not Found (even on /health)
```

**This means:** Your backend application is **NOT running** on Render!

---

## ✅ Step-by-Step Fix

### Step 1: Check Render Dashboard

1. Go to: https://dashboard.render.com
2. Find your service: `er-emr-backend`
3. Check the status at the top:
   - ✅ **"Live"** = Service is running
   - ❌ **"Deploy failed"** = Build or deployment failed
   - ⚠️ **"Building"** = Still deploying (wait)

**What do you see?**

---

### Step 2: Check Latest Deploy Status

In Render Dashboard:
1. Click on your service
2. Go to **"Events"** tab
3. Look at the latest deployment

**Look for:**
- ✅ "Deploy live" = Success
- ❌ "Deploy failed" = Failed
- ⚠️ "Build failed" = Build error

**If it says "Failed"**, click on it to see error logs.

---

### Step 3: Verify Build Settings

In Render Dashboard → your service → Settings:

**Build Command should be:**
```bash
cd backend && chmod +x build.sh && ./build.sh
```

**NOT:**
- ❌ `pip install -r requirements.txt`
- ❌ `pip install -r backend/requirements.txt`
- ❌ Just `./build.sh` (missing cd backend)

**Start Command should be:**
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
```

**NOT:**
- ❌ `uvicorn server:app`
- ❌ `python server.py`
- ❌ `uvicorn main:app`

---

### Step 4: Check Environment Variables

Go to Render Dashboard → Environment tab.

**You MUST have ALL 7 variables:**

```
MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME = er_emr_database
CORS_ORIGINS = *
EMERGENT_LLM_KEY = sk-emergent-1489bD95832530eB39
JWT_SECRET = (random 32+ character string)
JWT_ALGORITHM = HS256
JWT_EXPIRATION_MINUTES = 43200
```

**Missing any?** → Add them and redeploy!

---

### Step 5: Check Build Logs

1. Go to Render Dashboard → your service
2. Click **"Logs"** tab
3. Scroll to where the build starts

**Look for these SUCCESS messages:**
```
✓ Installing emergentintegrations...
✓ Installing requirements...
✓ Build completed successfully!
```

**Or these ERROR messages:**
```
✗ ModuleNotFoundError: No module named 'emergentintegrations'
✗ ERROR: Could not find a version that satisfies the requirement
✗ Permission denied
✗ build.sh: not found
```

**Share the error if you see one!**

---

### Step 6: Check Runtime Logs

In Render Dashboard → Logs tab:

**Look for:**
```
✅ INFO: Started server process
✅ INFO: Uvicorn running on http://0.0.0.0:10000
✅ INFO: Application startup complete
```

**Or errors:**
```
❌ ModuleNotFoundError
❌ ImportError
❌ pymongo.errors.ServerSelectionTimeoutError
❌ Port 10000 already in use
```

---

## 🔧 Common Fixes

### Fix 1: Wrong Root Directory

**If your repo structure is:**
```
your-repo/
├── backend/
│   ├── server.py
│   ├── build.sh
│   └── requirements.txt
└── frontend/
```

**Then in Render Settings:**
- Root Directory: Leave EMPTY (or just `/`)
- Build Command: `cd backend && chmod +x build.sh && ./build.sh`
- Start Command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`

---

### Fix 2: build.sh Not Executable

**Symptoms:** "build.sh: Permission denied"

**Fix:** In Render, the build command should include:
```bash
chmod +x build.sh && ./build.sh
```

Or update build.sh permissions in git:
```bash
chmod +x backend/build.sh
git add backend/build.sh
git commit -m "Make build.sh executable"
git push
```

---

### Fix 3: MongoDB Not Connected

**Symptoms:** Server starts but crashes immediately

**Check:**
1. MONGO_URL is set correctly
2. Password in MONGO_URL is URL-encoded
   - Special characters like `@`, `#`, `!` need encoding
   - Example: `pass@word` → `pass%40word`
3. MongoDB Atlas IP whitelist includes `0.0.0.0/0`

---

### Fix 4: Missing Dependencies

**Symptoms:** "ModuleNotFoundError: No module named 'X'"

**Fix:** 
1. Make sure `build.sh` runs successfully
2. Check if `emergentintegrations` installs:
   ```bash
   pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
   ```

---

### Fix 5: Port Binding Issue

**Symptoms:** "Address already in use"

**Fix:** Use `$PORT` environment variable (Render provides this automatically):
```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

**NOT:**
```bash
uvicorn server:app --port 8001  # ❌ Wrong!
```

---

## 🚀 Force Redeploy

If everything looks correct but still not working:

1. Go to Render Dashboard
2. Click your service
3. Click **"Manual Deploy"**
4. Select **"Clear build cache & deploy"**
5. Wait 5-10 minutes

---

## 🧪 Test After Deploy

Once deployed successfully, test:

```bash
# 1. Health check
curl https://er-emr-backend.onrender.com/health

# Should return:
{
  "status": "healthy",
  "service": "ER-EMR Backend",
  "timestamp": "..."
}

# 2. API docs
curl https://er-emr-backend.onrender.com/docs

# Should return HTML page

# 3. Register test
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

# Should return:
{
  "access_token": "...",
  "user": {...}
}
```

---

## 📞 Next Steps

1. **Check Render Dashboard** - Is service "Live" or "Failed"?
2. **Check Logs** - Any error messages?
3. **Verify Settings** - Build/Start commands correct?
4. **Check Environment** - All 7 variables set?
5. **Force Redeploy** - Clear cache & deploy

**Share screenshots of:**
- Render Dashboard status
- Build logs (last 50 lines)
- Runtime logs (last 50 lines)
- Environment variables (hide sensitive values)

**And I'll help you fix it!** 🔧
