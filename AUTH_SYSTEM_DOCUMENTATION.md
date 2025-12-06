# 🔐 ER-EMR Authentication System Documentation

## Overview

Complete enterprise-grade authentication system with:
- ✅ User Registration & Login
- ✅ Individual & Institutional Accounts
- ✅ Hospital/Institution Management
- ✅ Subscription Tiers (Free, Basic, Premium, Enterprise)
- ✅ Professional Profiles
- ✅ JWT Token Authentication

---

## 🎯 User Types

### 1. Individual User
- Independent doctors/residents
- Personal subscription
- Can be linked to a hospital later

### 2. Institutional User
- Part of a hospital/clinic/institution
- Inherits institution's subscription
- Hospital admin can manage team

---

## 📋 API Endpoints

### Authentication Endpoints

#### 1. Register / Signup
```http
POST /api/auth/register
POST /api/auth/signup  (alias)
```

**Request Body (Individual User):**
```json
{
  "email": "doctor@example.com",
  "password": "securepassword",
  "name": "Dr. John Doe",
  "role": "resident",
  "user_type": "individual",
  "mobile": "+919876543210",
  "specialization": "Emergency Medicine",
  "medical_license_number": "MCI123456",
  "subscription_tier": "free"
}
```

**Request Body (Institutional User - New Hospital):**
```json
{
  "email": "doctor@hospital.com",
  "password": "securepassword",
  "name": "Dr. Jane Smith",
  "role": "consultant",
  "user_type": "institutional",
  "mobile": "+919876543210",
  "specialization": "Emergency Medicine",
  "medical_license_number": "MCI123456",
  "hospital_name": "City General Hospital",
  "hospital_type": "hospital",
  "hospital_city": "Mumbai",
  "hospital_state": "Maharashtra",
  "subscription_tier": "premium"
}
```

**Request Body (Institutional User - Link to Existing Hospital):**
```json
{
  "email": "doctor2@hospital.com",
  "password": "securepassword",
  "name": "Dr. Mike Johnson",
  "role": "resident",
  "user_type": "institutional",
  "mobile": "+919876543210",
  "hospital_id": "existing-hospital-uuid",
  "subscription_tier": "free"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "doctor@example.com",
    "name": "Dr. John Doe",
    "role": "resident",
    "user_type": "individual",
    "mobile": "+919876543210",
    "specialization": "Emergency Medicine",
    "medical_license_number": "MCI123456",
    "hospital_id": null,
    "hospital_name": null,
    "subscription_tier": "free",
    "subscription_status": "active",
    "subscription_end": null,
    "created_at": "2025-12-06T10:00:00Z",
    "updated_at": null
  }
}
```

#### 2. Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "securepassword"
}
```

**Response:** Same as register response

#### 3. Get Current User Profile
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:** UserResponse object

#### 4. Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Dr. John Doe Updated",
  "mobile": "+919876543211",
  "specialization": "Critical Care",
  "medical_license_number": "MCI123457",
  "hospital_id": "uuid-of-hospital"
}
```

---

### Hospital/Institution Management

#### 1. Create Hospital
```http
POST /api/hospitals
Authorization: Bearer <token>
```
*Requires: admin or hospital_admin role*

**Request Body:**
```json
{
  "name": "Apollo Hospital",
  "type": "hospital",
  "address": "123 Medical St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "phone": "+912212345678",
  "email": "info@apollo.com",
  "license_number": "H-12345"
}
```

#### 2. Get All Hospitals
```http
GET /api/hospitals
Authorization: Bearer <token>
```

#### 3. Get Specific Hospital
```http
GET /api/hospitals/{hospital_id}
Authorization: Bearer <token>
```

#### 4. Update Hospital
```http
PUT /api/hospitals/{hospital_id}
Authorization: Bearer <token>
```
*Requires: admin or hospital_admin role*

#### 5. Get Hospital Users
```http
GET /api/hospitals/{hospital_id}/users
Authorization: Bearer <token>
```
*Requires: admin, hospital_admin, or member of the hospital*

---

### Subscription Management

#### 1. Get Subscription Plans
```http
GET /api/subscription/plans
```

**Response:**
```json
{
  "plans": [
    {
      "tier": "free",
      "name": "Free Tier",
      "price_monthly": 0,
      "price_yearly": 0,
      "max_users": 5,
      "max_cases_per_month": 50,
      "features": [
        "Basic case sheet management",
        "Triage system",
        "5 users maximum",
        "50 cases per month",
        "Community support"
      ],
      "ai_credits_per_month": 100,
      "support_level": "community"
    },
    ...
  ]
}
```

#### 2. Get Subscription Status
```http
GET /api/subscription/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tier": "premium",
  "status": "active",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2026-01-01T00:00:00Z",
  "user_type": "institutional",
  "hospital_subscription": {
    "tier": "premium",
    "status": "active",
    "max_users": 100,
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2026-01-01T00:00:00Z"
  }
}
```

---

## 🗃️ Database Schema

### Users Collection
```json
{
  "id": "uuid",
  "email": "unique_email",
  "password": "bcrypt_hash",
  "name": "string",
  "role": "resident|consultant|admin|hospital_admin",
  "user_type": "individual|institutional",
  
  "mobile": "string",
  "specialization": "string",
  "medical_license_number": "string",
  
  "hospital_id": "uuid",
  "hospital_name": "string",
  
  "subscription_tier": "free|basic|premium|enterprise",
  "subscription_status": "active|expired|suspended",
  "subscription_start": "datetime",
  "subscription_end": "datetime",
  
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Hospitals Collection
```json
{
  "id": "uuid",
  "name": "string",
  "type": "hospital|clinic|institution",
  "address": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "phone": "string",
  "email": "string",
  "license_number": "string",
  
  "subscription_tier": "free|basic|premium|enterprise",
  "subscription_status": "active|expired|suspended",
  "subscription_start": "datetime",
  "subscription_end": "datetime",
  "max_users": "integer",
  
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## 🔑 User Roles

| Role | Permissions |
|------|-------------|
| **resident** | Basic user, can create cases |
| **consultant** | Can review and approve cases |
| **admin** | Full system access |
| **hospital_admin** | Manage hospital and its users |

---

## 💰 Subscription Tiers

### Free Tier
- **Price:** ₹0/month
- **Users:** 5
- **Cases:** 50/month
- **AI Credits:** 100/month
- **Support:** Community

### Basic Plan
- **Price:** ₹999/month or ₹9,999/year
- **Users:** 20
- **Cases:** 500/month
- **AI Credits:** 1,000/month
- **Support:** Email
- **Features:** AI voice transcription, Data export

### Premium Plan
- **Price:** ₹2,999/month or ₹29,999/year
- **Users:** 100
- **Cases:** 2,000/month
- **AI Credits:** 5,000/month
- **Support:** Priority
- **Features:** Advanced AI, Custom integrations, Analytics

### Enterprise Plan
- **Price:** ₹9,999/month or ₹99,999/year
- **Users:** Unlimited
- **Cases:** Unlimited
- **AI Credits:** 50,000/month
- **Support:** Dedicated
- **Features:** Custom deployment, On-premise, SLA, Custom AI training

---

## 🧪 Testing Examples

### Test Individual Registration
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "test123",
    "name": "Dr. Test",
    "role": "resident",
    "user_type": "individual",
    "mobile": "+919999999999",
    "specialization": "Emergency",
    "subscription_tier": "free"
  }'
```

### Test Institutional Registration
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "test123",
    "name": "Hospital Admin",
    "role": "hospital_admin",
    "user_type": "institutional",
    "mobile": "+919999999998",
    "hospital_name": "Test Hospital",
    "hospital_city": "Delhi",
    "subscription_tier": "premium"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "test123"
  }'
```

### Test Get Profile
```bash
TOKEN="your_access_token"
curl -X GET http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 Render Deployment

The authentication system is fully compatible with Render deployment:

1. All environment variables are configured
2. MongoDB indexes for email uniqueness
3. JWT token authentication
4. CORS enabled for frontend integration
5. Health check endpoint at `/health`

---

## 📝 Notes

- Passwords are hashed using bcrypt
- JWT tokens expire in 30 days (configurable)
- Email must be unique across the system
- Hospital names should be unique
- Subscription status is checked on login
- Expired subscriptions return 403 error

---

## 🔜 Future Enhancements

- [ ] Email verification
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, Microsoft)
- [ ] Payment gateway integration
- [ ] Automatic subscription renewal
- [ ] Usage analytics per hospital
- [ ] Role-based access control (RBAC) refinement
