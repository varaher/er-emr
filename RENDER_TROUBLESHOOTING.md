# 🚨 Render Deployment Troubleshooting

## Problem: "Not Found" Errors on Render

### Symptoms:
```
LOG  REG ERROR: Not Found
LOG  LOGIN ERROR: Not Found
```

Your endpoints work locally but return 404 on Render.

---

## ✅ Checklist to Fix

### 1. **Verify Render Deployment Completed**

Go to Render Dashboard → Your Service → Logs

Look for:
```
✅ Build completed successfully
✅ uvicorn running on http://0.0.0.0:$PORT
✅ Application startup complete
```

If you see errors, deployment failed!

---

### 2. **Test Your Deployed Backend**

```bash
# Replace with your actual Render URL
curl https://your-app.onrender.com/health

# Should return:
{
  "status": "healthy",
  "service": "ER-EMR Backend",
  "timestamp": "..."
}
```

If this fails → Backend not deployed correctly!

---

### 3. **Test Auth Endpoints**

```bash
# Test register
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123",
    "name": "Test User",
    "role": "resident",
    "user_type": "individual",
    "subscription_tier": "free"
  }'

# Test login
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'
```

---

### 4. **Check Environment Variables on Render**

Go to Render Dashboard → Your Service → Environment

**REQUIRED Variables:**
```
MONGO_URL = mongodb+srv://... (your Atlas connection string)
DB_NAME = er_emr_database
CORS_ORIGINS = *
EMERGENT_LLM_KEY = sk-emergent-1489bD95832530eB39
JWT_SECRET = (any secure random string)
JWT_ALGORITHM = HS256
JWT_EXPIRATION_MINUTES = 43200
```

**Missing any?** → Add them and redeploy!

---

### 5. **Check CORS Configuration**

In your `server.py`, CORS should be:

```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Or specific domains
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If `CORS_ORIGINS` is too restrictive, React Native requests will fail!

---

### 6. **Check MongoDB Connection**

Common issues:

**❌ Wrong Connection String**
- Make sure `MONGO_URL` has correct password
- No special characters unencoded
- Database name included

**❌ IP Whitelist**
- MongoDB Atlas → Network Access
- Add `0.0.0.0/0` (allow from anywhere)
- Or add Render's IP addresses

**Test Connection:**
```bash
# In Render shell or logs, should see:
INFO: Connected to MongoDB
```

---

### 7. **Verify API Routes**

All auth endpoints should be prefixed with `/api`:

```
✅ https://your-app.onrender.com/api/auth/register
✅ https://your-app.onrender.com/api/auth/login
✅ https://your-app.onrender.com/api/auth/signup

❌ https://your-app.onrender.com/auth/login (NO /api prefix!)
```

In `server.py`:
```python
api_router = APIRouter(prefix="/api")
```

---

### 8. **Check React Native Frontend Config**

In your React Native app, the API URL should be:

```javascript
// ✅ CORRECT
const API_URL = "https://your-app.onrender.com/api";

// ❌ WRONG (missing /api)
const API_URL = "https://your-app.onrender.com";

// ❌ WRONG (localhost)
const API_URL = "http://localhost:8001/api";
```

---

### 9. **Force Rebuild on Render**

Sometimes Render caches old code:

1. Go to Render Dashboard
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Wait 5-10 minutes for rebuild

---

### 10. **Check Render Logs for Errors**

Go to Render Dashboard → Logs

Look for:
```
❌ ModuleNotFoundError: No module named 'emergentintegrations'
❌ pymongo.errors.ServerSelectionTimeoutError
❌ pydantic.error_wrappers.ValidationError
❌ FAILED to load environment variables
```

Any errors? → Fix them first!

---

## 🔧 Common Fixes

### Fix 1: Build Script Not Running

**Check:**
```bash
# Render build command should be:
cd backend && chmod +x build.sh && ./build.sh
```

**Not:**
```bash
pip install -r requirements.txt  # ❌ Won't install emergentintegrations!
```

---

### Fix 2: Wrong Start Command

**Correct:**
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
```

**NOT:**
```bash
uvicorn server:app  # ❌ Wrong directory or port!
python server.py    # ❌ Wrong command!
```

---

### Fix 3: MongoDB Not Connected

**Add to Render Environment:**
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
```

**Replace:**
- `username` - your Atlas username
- `password` - your Atlas password (URL-encoded!)
- `cluster` - your cluster name

---

### Fix 4: JWT_SECRET Missing

Render auto-generates this, but check it exists:

```
JWT_SECRET = (any random string, 32+ characters)
JWT_ALGORITHM = HS256
```

---

## 🧪 Quick Test Script

Save this as `test_render.sh`:

```bash
#!/bin/bash

RENDER_URL="https://your-app.onrender.com"

echo "Testing Render Deployment..."

# Test health
echo "1. Health Check:"
curl -s $RENDER_URL/health | jq .

# Test register
echo "2. Register:"
curl -s -X POST $RENDER_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","role":"resident","user_type":"individual","subscription_tier":"free"}' \
  | jq .

# Test login
echo "3. Login:"
curl -s -X POST $RENDER_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  | jq .
```

Run:
```bash
chmod +x test_render.sh
./test_render.sh
```

---

## 🆘 Still Not Working?

### Get Render Logs:

```bash
# In Render dashboard, click "Shell" and run:
cd backend
python3 -c "from server import app; print('App loaded!')"

# Check if MongoDB connects:
python3 -c "from motor.motor_asyncio import AsyncIOMotorClient; import os; client = AsyncIOMotorClient(os.environ.get('MONGO_URL')); print('MongoDB OK!')"
```

---

## 📞 Need More Help?

1. **Check Render Status**: https://status.render.com
2. **Render Logs**: Dashboard → Your Service → Logs
3. **Environment Variables**: Dashboard → Environment
4. **Build Logs**: Dashboard → Events → Click latest deploy

---

## ✅ Success Checklist

- [ ] Health endpoint returns 200 OK
- [ ] `/api/auth/register` works via curl
- [ ] `/api/auth/login` works via curl
- [ ] MongoDB connected (check logs)
- [ ] CORS allows your frontend domain
- [ ] Environment variables all set
- [ ] Build completed without errors
- [ ] React Native uses correct API URL

Once all ✅ → Your app should work!
