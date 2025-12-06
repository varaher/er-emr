from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText
import openai
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_MINUTES = int(os.environ.get('JWT_EXPIRATION_MINUTES', 43200))
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Initialize FastAPI app
app = FastAPI(title="ER-EMR Backend API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Add CORS middleware FIRST (before routes)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# AUTHENTICATION & USER MANAGEMENT MODELS
# ============================================

# Hospital/Institution Model
class Hospital(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = "hospital"  # hospital, clinic, institution
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None
    subscription_tier: str = "free"  # free, basic, premium, enterprise
    subscription_status: str = "active"  # active, expired, suspended
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    max_users: int = 5  # Default for free tier
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Subscription Plan Model
class SubscriptionPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tier: str  # free, basic, premium, enterprise
    name: str
    price_monthly: float
    price_yearly: float
    max_users: int
    max_cases_per_month: int
    features: List[str] = []
    ai_credits_per_month: int = 0
    support_level: str = "community"  # community, email, priority, dedicated

# User Registration Model
class UserRegister(BaseModel):
    # Basic Info
    email: str
    password: str
    name: str
    
    # Role & Permissions
    role: str = "resident"  # resident, consultant, admin, hospital_admin
    user_type: str = "individual"  # individual, institutional
    
    # Professional Info
    mobile: Optional[str] = None
    specialization: Optional[str] = None
    medical_license_number: Optional[str] = None
    
    # Hospital/Institution (for institutional users)
    hospital_id: Optional[str] = None  # Link to existing hospital
    hospital_name: Optional[str] = None  # For creating new hospital
    hospital_type: Optional[str] = "hospital"
    hospital_address: Optional[str] = None
    hospital_city: Optional[str] = None
    hospital_state: Optional[str] = None
    
    # Subscription (for future use)
    subscription_tier: str = "free"

# User Login Model
class UserLogin(BaseModel):
    email: str
    password: str

# User Response Model (returned after auth)
class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    user_type: str
    
    # Professional Info
    mobile: Optional[str] = None
    specialization: Optional[str] = None
    medical_license_number: Optional[str] = None
    
    # Hospital/Institution
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    
    # Subscription
    subscription_tier: str
    subscription_status: str
    subscription_end: Optional[datetime] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

# Token Response Model
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# User Profile Update Model
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    specialization: Optional[str] = None
    medical_license_number: Optional[str] = None
    hospital_id: Optional[str] = None

# Hospital Create/Update Models
class HospitalCreate(BaseModel):
    name: str
    type: str = "hospital"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None

# Triage Models
class TriageVitals(BaseModel):
    hr: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    rr: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    gcs_e: Optional[int] = None
    gcs_v: Optional[int] = None
    gcs_m: Optional[int] = None
    capillary_refill: Optional[float] = None

class TriageSymptoms(BaseModel):
    # Airway symptoms
    obstructed_airway: bool = False
    facial_burns: bool = False
    stridor: bool = False
    
    # Breathing symptoms
    severe_respiratory_distress: bool = False
    moderate_respiratory_distress: bool = False
    mild_respiratory_symptoms: bool = False
    cyanosis: bool = False
    apnea: bool = False
    
    # Circulation symptoms
    shock: bool = False
    severe_bleeding: bool = False
    cardiac_arrest: bool = False
    chest_pain: bool = False
    chest_pain_with_hypotension: bool = False
    
    # Neurological symptoms
    seizure_ongoing: bool = False
    seizure_controlled: bool = False
    confusion: bool = False
    focal_deficits: bool = False
    lethargic_unconscious: bool = False
    
    # Trauma
    major_trauma: bool = False
    moderate_trauma: bool = False
    minor_injury: bool = False
    
    # Other critical
    severe_burns: bool = False
    anaphylaxis: bool = False
    suspected_stroke: bool = False
    sepsis: bool = False
    gi_bleed: bool = False
    fever: bool = False
    non_blanching_rash: bool = False
    
    # Pediatric specific
    severe_dehydration: bool = False
    moderate_dehydration: bool = False
    
    # General
    abdominal_pain_severe: bool = False
    abdominal_pain_moderate: bool = False
    abdominal_pain_mild: bool = False
    
    other_symptoms: List[str] = []

class TriageAssessment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    age_group: str  # "adult" or "pediatric"
    vitals: TriageVitals
    symptoms: TriageSymptoms
    mechanism: str = ""  # trauma, medical, etc.
    
    # Calculated fields
    priority_level: int  # 1-5 (1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue)
    priority_color: str  # "red", "orange", "yellow", "green", "blue"
    priority_name: str  # "IMMEDIATE", "VERY URGENT", "URGENT", "SEMI-URGENT", "NON-URGENT"
    time_to_see: str  # "0 min", "5 min", "30 min", "60 min", "Time-permitted"
    triage_reason: List[str] = []  # reasons for the assigned priority
    
    triaged_by: str
    triaged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Link to case sheet
    case_sheet_id: Optional[str] = None

class TriageCreate(BaseModel):
    age_group: str
    vitals: TriageVitals
    symptoms: TriageSymptoms
    mechanism: str = ""
    triaged_by: str

class PatientInfo(BaseModel):
    uhid: Optional[str] = None
    name: str
    age: str
    sex: str
    phone: str
    address: str
    arrival_datetime: str
    mode_of_arrival: str
    accident_datetime: Optional[str] = None
    place_of_accident: Optional[str] = None
    nature_of_accident: List[str] = []
    mechanism_of_injury: List[str] = []
    brought_by: str
    informant_name: str
    informant_reliability: str
    identification_mark: str
    mlc: bool = False

class Vitals(BaseModel):
    hr: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    rr: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    gcs_e: Optional[int] = None
    gcs_v: Optional[int] = None
    gcs_m: Optional[int] = None
    grbs: Optional[float] = None
    pain_score: Optional[int] = None

class PresentingComplaint(BaseModel):
    text: str
    duration: str
    onset_type: str
    course: str

class PrimaryAssessment(BaseModel):
    airway_status: str = "Patent"
    airway_obstruction: List[str] = []
    airway_interventions: List[str] = []
    airway_notes: str = ""
    airway_additional_notes: str = ""
    
    breathing_rr: Optional[float] = None
    breathing_spo2: Optional[float] = None
    breathing_oxygen_device: str = ""
    breathing_oxygen_flow: Optional[float] = None
    breathing_work: str = ""
    breathing_air_entry: List[str] = []
    breathing_adjuncts: List[str] = []
    breathing_notes: str = ""
    breathing_additional_notes: str = ""
    
    circulation_hr: Optional[float] = None
    circulation_bp_systolic: Optional[float] = None
    circulation_bp_diastolic: Optional[float] = None
    circulation_crt: Optional[float] = None
    circulation_neck_veins: str = ""
    circulation_peripheral_pulses: str = ""
    circulation_external_bleed: bool = False
    circulation_long_bone_deformity: bool = False
    circulation_adjuncts: List[str] = []
    circulation_notes: str = ""
    circulation_additional_notes: str = ""
    
    disability_avpu: str = ""
    disability_gcs_e: Optional[int] = None
    disability_gcs_v: Optional[int] = None
    disability_gcs_m: Optional[int] = None
    disability_pupils_size: str = ""
    disability_pupils_reaction: str = ""
    disability_grbs: Optional[float] = None
    disability_seizure: bool = False
    disability_notes: str = ""
    disability_additional_notes: str = ""
    
    exposure_temperature: Optional[float] = None
    exposure_logroll_findings: List[str] = []
    exposure_local_exam_notes: str = ""
    exposure_additional_notes: str = ""
    
    ecg_findings: str = ""
    vbg_ph: Optional[float] = None
    vbg_pco2: Optional[float] = None
    vbg_hco3: Optional[float] = None
    vbg_hb: Optional[float] = None
    vbg_glu: Optional[float] = None
    vbg_lac: Optional[float] = None
    vbg_na: Optional[float] = None
    vbg_k: Optional[float] = None
    vbg_cr: Optional[float] = None
    bedside_echo_findings: str = ""
    adjuvants_additional_notes: str = ""

class History(BaseModel):
    hpi: str = ""
    hpi_additional_notes: str = ""
    
    signs_and_symptoms: str = ""
    secondary_survey_neuro: List[str] = []
    secondary_survey_resp: List[str] = []
    secondary_survey_cardiac: List[str] = []
    secondary_survey_gi: List[str] = []
    secondary_survey_gu: List[str] = []
    secondary_survey_msk: List[str] = []
    secondary_survey_notes: str = ""
    secondary_survey_additional_notes: str = ""
    
    past_medical: List[str] = []
    past_medical_additional_notes: str = ""
    past_surgical: str = ""
    past_surgical_additional_notes: str = ""
    drug_history: str = ""
    family_history: str = ""
    family_gyn_additional_notes: str = ""
    gyn_history: str = ""
    lmp: str = ""
    allergies: List[str] = []
    allergies_additional_notes: str = ""
    
    psychological_assessment: Dict[str, str] = {}
    psychological_additional_notes: str = ""

class Examination(BaseModel):
    general_pallor: bool = False
    general_icterus: bool = False
    general_clubbing: bool = False
    general_lymphadenopathy: bool = False
    general_thyroid: str = "Normal"
    general_varicose_veins: bool = False
    general_notes: str = ""
    general_additional_notes: str = ""
    
    cvs_status: str = "Normal"
    cvs_s1_s2: str = ""
    cvs_pulse: str = ""
    cvs_pulse_rate: Optional[int] = None
    cvs_apex_beat: str = ""
    cvs_precordial_heave: str = ""
    cvs_added_sounds: str = ""
    cvs_murmurs: str = ""
    cvs_additional_notes: str = ""
    
    respiratory_status: str = "Normal"
    respiratory_expansion: str = ""
    respiratory_percussion: str = ""
    respiratory_breath_sounds: str = ""
    respiratory_vocal_resonance: str = ""
    respiratory_added_sounds: str = ""
    respiratory_additional_notes: str = ""
    
    abdomen_status: str = "Normal"
    abdomen_umbilical: str = ""
    abdomen_organomegaly: str = ""
    abdomen_percussion: str = ""
    abdomen_bowel_sounds: str = ""
    abdomen_external_genitalia: str = ""
    abdomen_hernial_orifices: str = ""
    abdomen_per_rectal: str = ""
    abdomen_per_vaginal: str = ""
    abdomen_additional_notes: str = ""
    
    cns_status: str = "Normal"
    cns_higher_mental: str = ""
    cns_cranial_nerves: str = ""
    cns_sensory_system: str = ""
    cns_motor_system: str = ""
    cns_reflexes: str = ""
    cns_romberg_sign: str = ""
    cns_cerebellar_signs: str = ""
    cns_additional_notes: str = ""
    
    extremities_status: str = "Normal"
    extremities_findings: str = ""
    extremities_additional_notes: str = ""

class Investigations(BaseModel):
    panels_selected: List[str] = []
    individual_tests: List[str] = []
    results_notes: str = ""

class Treatment(BaseModel):
    interventions: List[str] = []
    intervention_notes: str = ""
    provisional_diagnoses: List[str] = []
    differential_diagnoses: List[str] = []

class Disposition(BaseModel):
    type: str  # discharged, admitted-icu, admitted-hdu, admitted-ward, referred, dama, death
    destination: str = ""
    advice: str = ""
    discharge_vitals: Optional[Vitals] = None
    condition_at_discharge: str = ""  # stable, unstable

class Addendum(BaseModel):
    id: str
    timestamp: datetime
    added_by_user_id: str
    added_by_name: str
    note: str

class CaseSheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient: PatientInfo
    vitals_at_arrival: Vitals
    presenting_complaint: PresentingComplaint
    primary_assessment: PrimaryAssessment
    history: History
    examination: Examination
    investigations: Investigations
    treatment: Treatment
    disposition: Optional[Disposition] = None
    
    # Triage information
    triage_id: Optional[str] = None
    triage_priority: Optional[int] = None  # 1-5
    triage_color: Optional[str] = None  # red, orange, yellow, green, blue
    
    em_resident: str
    em_consultant: str = ""
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by_user_id: str
    status: str = "draft"  # draft, completed, discharged
    is_locked: bool = False  # True = cannot be edited (for legal/audit purposes)
    locked_at: Optional[datetime] = None
    locked_by_user_id: Optional[str] = None
    addendums: List[Addendum] = []  # Additional notes added after locking
    
    # Custom save timestamp (for backdating within allowed window)
    custom_save_timestamp: Optional[datetime] = None

class CaseSheetCreate(BaseModel):
    patient: PatientInfo
    vitals_at_arrival: Vitals
    presenting_complaint: PresentingComplaint
    primary_assessment: Optional[PrimaryAssessment] = None
    history: Optional[History] = None
    examination: Optional[Examination] = None
    investigations: Optional[Investigations] = None
    treatment: Optional[Treatment] = None
    disposition: Optional[Disposition] = None
    triage_id: Optional[str] = None
    triage_priority: Optional[int] = None
    triage_color: Optional[str] = None
    em_resident: str
    em_consultant: str = ""

class CaseSheetUpdate(BaseModel):
    patient: Optional[PatientInfo] = None
    vitals_at_arrival: Optional[Vitals] = None
    presenting_complaint: Optional[PresentingComplaint] = None
    primary_assessment: Optional[PrimaryAssessment] = None
    history: Optional[History] = None
    examination: Optional[Examination] = None
    investigations: Optional[Investigations] = None
    treatment: Optional[Treatment] = None
    disposition: Optional[Disposition] = None
    triage_id: Optional[str] = None
    triage_priority: Optional[int] = None
    triage_color: Optional[str] = None
    em_resident: Optional[str] = None
    em_consultant: Optional[str] = None
    status: Optional[str] = None

class DischargeSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_sheet_id: str
    summary_text: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaveToEMR(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_sheet_id: str
    saved_at: datetime
    saved_by: str
    save_type: str  # "final", "draft", "backup"
    notes: str = ""

class AIGenerateRequest(BaseModel):
    case_sheet_id: str
    prompt_type: str  # discharge_summary, red_flags, diagnosis_suggestions

class AISource(BaseModel):
    title: str
    url: str
    snippet: str

class AIResponse(BaseModel):
    response: str
    case_sheet_id: str
    sources: List[AISource] = []

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current authenticated user from JWT token
    Supports enhanced user model with hospital and subscription info
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        # Convert datetime strings to datetime objects
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('updated_at'), str):
            user['updated_at'] = datetime.fromisoformat(user['updated_at'])
        if user.get('subscription_end') and isinstance(user['subscription_end'], str):
            user['subscription_end'] = datetime.fromisoformat(user['subscription_end'])
        
        # Provide defaults for missing fields (for backward compatibility)
        user.setdefault('user_type', 'individual')
        user.setdefault('subscription_tier', 'free')
        user.setdefault('subscription_status', 'active')
        
        return UserResponse(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Auth endpoints
# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

async def register_user_internal(user_data: UserRegister) -> TokenResponse:
    """
    Internal function to handle user registration logic
    Used by both /auth/register and /auth/signup endpoints
    """
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    # Handle hospital/institution creation or linking
    hospital_id = user_data.hospital_id
    hospital_name = None
    
    if user_data.user_type == "institutional":
        if user_data.hospital_id:
            # Link to existing hospital
            hospital = await db.hospitals.find_one({"id": user_data.hospital_id}, {"_id": 0})
            if not hospital:
                raise HTTPException(status_code=404, detail="Hospital not found")
            hospital_id = hospital["id"]
            hospital_name = hospital["name"]
        elif user_data.hospital_name:
            # Create new hospital
            new_hospital = Hospital(
                name=user_data.hospital_name,
                type=user_data.hospital_type or "hospital",
                address=user_data.hospital_address,
                city=user_data.hospital_city,
                state=user_data.hospital_state,
                subscription_tier=user_data.subscription_tier,
                subscription_status="active",
                subscription_start=datetime.now(timezone.utc)
            )
            
            hospital_doc = new_hospital.model_dump()
            hospital_doc['created_at'] = hospital_doc['created_at'].isoformat()
            hospital_doc['updated_at'] = hospital_doc['updated_at'].isoformat()
            
            await db.hospitals.insert_one(hospital_doc)
            hospital_id = new_hospital.id
            hospital_name = new_hospital.name
            
            logging.info(f"Created new hospital: {hospital_name} (ID: {hospital_id})")
    
    # Create user document
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": user_data.role,
        "user_type": user_data.user_type,
        
        # Professional Info
        "mobile": user_data.mobile,
        "specialization": user_data.specialization,
        "medical_license_number": user_data.medical_license_number,
        
        # Hospital/Institution
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        
        # Subscription
        "subscription_tier": user_data.subscription_tier,
        "subscription_status": "active",
        "subscription_start": datetime.now(timezone.utc).isoformat(),
        "subscription_end": None,
        
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    access_token = create_access_token(data={"sub": user_id})
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        user_type=user_data.user_type,
        mobile=user_data.mobile,
        specialization=user_data.specialization,
        medical_license_number=user_data.medical_license_number,
        hospital_id=hospital_id,
        hospital_name=hospital_name,
        subscription_tier=user_data.subscription_tier,
        subscription_status="active",
        created_at=datetime.fromisoformat(new_user["created_at"])
    )
    
    logging.info(f"User registered: {user_data.email} (Type: {user_data.user_type}, Role: {user_data.role})")
    
    return TokenResponse(access_token=access_token, user=user_response)


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """
    Register a new user (individual or institutional)
    Supports both individual doctors and hospital/institution accounts
    """
    return await register_user_internal(user_data)


@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserRegister):
    """
    Signup - Alias for register endpoint
    Same functionality as /auth/register
    """
    return await register_user_internal(user_data)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Login with email and password
    Returns access token and user profile
    """
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check subscription status
    subscription_status = user.get("subscription_status", "active")
    if subscription_status == "expired":
        raise HTTPException(
            status_code=403, 
            detail="Subscription expired. Please renew your subscription to continue."
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user.get("role", "resident"),
        user_type=user.get("user_type", "individual"),
        mobile=user.get("mobile"),
        specialization=user.get("specialization"),
        medical_license_number=user.get("medical_license_number"),
        hospital_id=user.get("hospital_id"),
        hospital_name=user.get("hospital_name"),
        subscription_tier=user.get("subscription_tier", "free"),
        subscription_status=subscription_status,
        subscription_end=datetime.fromisoformat(user["subscription_end"]) if user.get("subscription_end") else None,
        created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"],
        updated_at=datetime.fromisoformat(user["updated_at"]) if user.get("updated_at") and isinstance(user["updated_at"], str) else None
    )
    
    logging.info(f"User logged in: {credentials.email}")
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update user profile
    Users can update their professional info and hospital affiliation
    """
    update_data = profile_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If hospital_id is being updated, fetch hospital name
    if "hospital_id" in update_data and update_data["hospital_id"]:
        hospital = await db.hospitals.find_one({"id": update_data["hospital_id"]}, {"_id": 0})
        if hospital:
            update_data["hospital_name"] = hospital["name"]
        else:
            raise HTTPException(status_code=404, detail="Hospital not found")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_data}
    )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user.get("name", ""),
        role=updated_user.get("role", "resident"),
        user_type=updated_user.get("user_type", "individual"),
        mobile=updated_user.get("mobile"),
        specialization=updated_user.get("specialization"),
        medical_license_number=updated_user.get("medical_license_number"),
        hospital_id=updated_user.get("hospital_id"),
        hospital_name=updated_user.get("hospital_name"),
        subscription_tier=updated_user.get("subscription_tier", "free"),
        subscription_status=updated_user.get("subscription_status", "active"),
        subscription_end=datetime.fromisoformat(updated_user["subscription_end"]) if updated_user.get("subscription_end") else None,
        created_at=datetime.fromisoformat(updated_user["created_at"]) if isinstance(updated_user["created_at"], str) else updated_user["created_at"],
        updated_at=datetime.fromisoformat(updated_user["updated_at"]) if isinstance(updated_user["updated_at"], str) else None
    )

# ============================================
# HOSPITAL/INSTITUTION MANAGEMENT ENDPOINTS
# ============================================

@api_router.post("/hospitals", response_model=Hospital)
async def create_hospital(
    hospital_data: HospitalCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Create a new hospital/institution
    Only admins and hospital admins can create hospitals
    """
    if current_user.role not in ["admin", "hospital_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if hospital name already exists
    existing = await db.hospitals.find_one({"name": hospital_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Hospital name already exists")
    
    hospital = Hospital(**hospital_data.model_dump())
    
    hospital_doc = hospital.model_dump()
    hospital_doc['created_at'] = hospital_doc['created_at'].isoformat()
    hospital_doc['updated_at'] = hospital_doc['updated_at'].isoformat()
    
    await db.hospitals.insert_one(hospital_doc)
    
    logging.info(f"Hospital created: {hospital.name} by user {current_user.email}")
    
    return hospital

@api_router.get("/hospitals", response_model=List[Hospital])
async def get_hospitals(current_user: UserResponse = Depends(get_current_user)):
    """Get all hospitals"""
    hospitals = await db.hospitals.find({}, {"_id": 0}).to_list(1000)
    
    for hospital in hospitals:
        if isinstance(hospital.get('created_at'), str):
            hospital['created_at'] = datetime.fromisoformat(hospital['created_at'])
        if isinstance(hospital.get('updated_at'), str):
            hospital['updated_at'] = datetime.fromisoformat(hospital['updated_at'])
        if hospital.get('subscription_start') and isinstance(hospital['subscription_start'], str):
            hospital['subscription_start'] = datetime.fromisoformat(hospital['subscription_start'])
        if hospital.get('subscription_end') and isinstance(hospital['subscription_end'], str):
            hospital['subscription_end'] = datetime.fromisoformat(hospital['subscription_end'])
    
    return hospitals

@api_router.get("/hospitals/{hospital_id}", response_model=Hospital)
async def get_hospital(
    hospital_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific hospital"""
    hospital = await db.hospitals.find_one({"id": hospital_id}, {"_id": 0})
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    if isinstance(hospital.get('created_at'), str):
        hospital['created_at'] = datetime.fromisoformat(hospital['created_at'])
    if isinstance(hospital.get('updated_at'), str):
        hospital['updated_at'] = datetime.fromisoformat(hospital['updated_at'])
    if hospital.get('subscription_start') and isinstance(hospital['subscription_start'], str):
        hospital['subscription_start'] = datetime.fromisoformat(hospital['subscription_start'])
    if hospital.get('subscription_end') and isinstance(hospital['subscription_end'], str):
        hospital['subscription_end'] = datetime.fromisoformat(hospital['subscription_end'])
    
    return hospital

@api_router.put("/hospitals/{hospital_id}", response_model=Hospital)
async def update_hospital(
    hospital_id: str,
    hospital_update: HospitalUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update hospital information
    Only admins and hospital admins can update hospitals
    """
    if current_user.role not in ["admin", "hospital_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    hospital = await db.hospitals.find_one({"id": hospital_id})
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    update_data = hospital_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hospitals.update_one(
        {"id": hospital_id},
        {"$set": update_data}
    )
    
    updated_hospital = await db.hospitals.find_one({"id": hospital_id}, {"_id": 0})
    
    if isinstance(updated_hospital.get('created_at'), str):
        updated_hospital['created_at'] = datetime.fromisoformat(updated_hospital['created_at'])
    if isinstance(updated_hospital.get('updated_at'), str):
        updated_hospital['updated_at'] = datetime.fromisoformat(updated_hospital['updated_at'])
    if updated_hospital.get('subscription_start') and isinstance(updated_hospital['subscription_start'], str):
        updated_hospital['subscription_start'] = datetime.fromisoformat(updated_hospital['subscription_start'])
    if updated_hospital.get('subscription_end') and isinstance(updated_hospital['subscription_end'], str):
        updated_hospital['subscription_end'] = datetime.fromisoformat(updated_hospital['subscription_end'])
    
    return updated_hospital

@api_router.get("/hospitals/{hospital_id}/users")
async def get_hospital_users(
    hospital_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all users affiliated with a hospital"""
    if current_user.role not in ["admin", "hospital_admin"] and current_user.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    users = await db.users.find({"hospital_id": hospital_id}, {"_id": 0, "password": 0}).to_list(1000)
    
    return {"hospital_id": hospital_id, "users": users, "total": len(users)}

# ============================================
# SUBSCRIPTION MANAGEMENT ENDPOINTS
# ============================================

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """
    Get available subscription plans
    Returns pricing and features for all tiers
    """
    plans = [
        SubscriptionPlan(
            tier="free",
            name="Free Tier",
            price_monthly=0,
            price_yearly=0,
            max_users=5,
            max_cases_per_month=50,
            features=[
                "Basic case sheet management",
                "Triage system",
                "5 users maximum",
                "50 cases per month",
                "Community support"
            ],
            ai_credits_per_month=100,
            support_level="community"
        ),
        SubscriptionPlan(
            tier="basic",
            name="Basic Plan",
            price_monthly=999,
            price_yearly=9999,
            max_users=20,
            max_cases_per_month=500,
            features=[
                "All Free features",
                "20 users",
                "500 cases per month",
                "AI voice transcription",
                "Email support",
                "Data export"
            ],
            ai_credits_per_month=1000,
            support_level="email"
        ),
        SubscriptionPlan(
            tier="premium",
            name="Premium Plan",
            price_monthly=2999,
            price_yearly=29999,
            max_users=100,
            max_cases_per_month=2000,
            features=[
                "All Basic features",
                "100 users",
                "2000 cases per month",
                "Advanced AI features",
                "Priority support",
                "Custom integrations",
                "Analytics dashboard"
            ],
            ai_credits_per_month=5000,
            support_level="priority"
        ),
        SubscriptionPlan(
            tier="enterprise",
            name="Enterprise Plan",
            price_monthly=9999,
            price_yearly=99999,
            max_users=9999,
            max_cases_per_month=999999,
            features=[
                "All Premium features",
                "Unlimited users",
                "Unlimited cases",
                "Dedicated support",
                "Custom deployment",
                "On-premise option",
                "SLA guarantee",
                "Custom AI training"
            ],
            ai_credits_per_month=50000,
            support_level="dedicated"
        )
    ]
    
    return {"plans": [plan.model_dump() for plan in plans]}

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: UserResponse = Depends(get_current_user)):
    """Get current user's subscription status"""
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    
    subscription_info = {
        "tier": user.get("subscription_tier", "free"),
        "status": user.get("subscription_status", "active"),
        "start_date": user.get("subscription_start"),
        "end_date": user.get("subscription_end"),
        "user_type": user.get("user_type", "individual")
    }
    
    # If institutional user, get hospital subscription
    if user.get("hospital_id"):
        hospital = await db.hospitals.find_one({"id": user["hospital_id"]}, {"_id": 0})
        if hospital:
            subscription_info["hospital_subscription"] = {
                "tier": hospital.get("subscription_tier", "free"),
                "status": hospital.get("subscription_status", "active"),
                "max_users": hospital.get("max_users", 5),
                "start_date": hospital.get("subscription_start"),
                "end_date": hospital.get("subscription_end")
            }
    
    return subscription_info

# Triage calculation algorithm
def calculate_triage_priority(age_group: str, vitals: TriageVitals, symptoms: TriageSymptoms) -> Dict[str, Any]:
    """
    Calculate triage priority based on vitals and symptoms
    Returns: priority level (1-5), color, name, time_to_see, and reasons
    """
    reasons = []
    
    # Calculate GCS if components are available
    gcs_total = None
    if vitals.gcs_e and vitals.gcs_v and vitals.gcs_m:
        gcs_total = vitals.gcs_e + vitals.gcs_v + vitals.gcs_m
    
    # PRIORITY I - RED - IMMEDIATE (0 min)
    # Check for critical airway issues
    if symptoms.obstructed_airway or symptoms.facial_burns or symptoms.stridor:
        reasons.append("Critical airway compromise")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    # Check for critical breathing issues
    if symptoms.severe_respiratory_distress or symptoms.cyanosis or symptoms.apnea:
        reasons.append("Severe respiratory distress")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if vitals.rr and (vitals.rr < 10 or vitals.rr > 30):
        reasons.append(f"Critical respiratory rate: {vitals.rr}")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if vitals.spo2 and vitals.spo2 < 90:
        reasons.append(f"Critical SpO2: {vitals.spo2}%")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    # Check for critical circulation issues
    if symptoms.cardiac_arrest or symptoms.shock or symptoms.severe_bleeding:
        reasons.append("Critical circulatory compromise")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if vitals.bp_systolic and vitals.bp_systolic < 90:
        reasons.append(f"Hypotension: SBP {vitals.bp_systolic}")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if symptoms.chest_pain_with_hypotension:
        reasons.append("Chest pain with hemodynamic instability")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    # Check for critical neurological issues
    if gcs_total and gcs_total <= 8:
        reasons.append(f"Critically depressed consciousness: GCS {gcs_total}")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if symptoms.seizure_ongoing:
        reasons.append("Ongoing seizure")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if symptoms.lethargic_unconscious:
        reasons.append("Altered level of consciousness")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    # Check for other critical conditions
    if symptoms.major_trauma or symptoms.severe_burns or symptoms.anaphylaxis or symptoms.sepsis:
        reasons.append("Critical condition requiring immediate attention")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    if symptoms.suspected_stroke and symptoms.focal_deficits:
        reasons.append("Suspected acute stroke with deficits")
        return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    # Pediatric specific RED criteria
    if age_group == "pediatric":
        if symptoms.non_blanching_rash and symptoms.fever:
            reasons.append("Non-blanching rash with fever (suspected meningococcemia)")
            return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
        
        if symptoms.severe_dehydration:
            reasons.append("Severe dehydration")
            return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
        
        if vitals.capillary_refill and vitals.capillary_refill > 3:
            reasons.append(f"Prolonged capillary refill: {vitals.capillary_refill}s (shock)")
            return {"level": 1, "color": "red", "name": "IMMEDIATE", "time": "0 min", "reasons": reasons}
    
    # PRIORITY II - ORANGE - VERY URGENT (5 min)
    # Moderate respiratory issues
    if symptoms.moderate_respiratory_distress:
        reasons.append("Moderate respiratory distress")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    if vitals.rr and (21 <= vitals.rr <= 30):
        reasons.append(f"Elevated respiratory rate: {vitals.rr}")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    if vitals.spo2 and 90 <= vitals.spo2 <= 94:
        reasons.append(f"Low SpO2: {vitals.spo2}%")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    # Cardiovascular issues
    if symptoms.chest_pain and not symptoms.chest_pain_with_hypotension:
        reasons.append("Chest pain (possible ACS)")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    # Calculate MAP if BP available
    if vitals.bp_systolic and vitals.bp_diastolic:
        map_value = (vitals.bp_systolic + 2 * vitals.bp_diastolic) / 3
        if map_value < 65:
            reasons.append(f"Low MAP: {map_value:.0f}")
            return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    # Neurological issues
    if gcs_total and 9 <= gcs_total <= 12:
        reasons.append(f"Altered consciousness: GCS {gcs_total}")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    if symptoms.focal_deficits and not symptoms.suspected_stroke:
        reasons.append("New focal neurological deficit")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    if symptoms.confusion:
        reasons.append("Acute confusion")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    # Other urgent conditions
    if symptoms.moderate_trauma:
        reasons.append("Moderate trauma")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    if symptoms.gi_bleed and not symptoms.shock:
        reasons.append("GI bleed without shock")
        return {"level": 2, "color": "orange", "name": "VERY URGENT", "time": "5 min", "reasons": reasons}
    
    # PRIORITY III - YELLOW - URGENT (30 min)
    if symptoms.mild_respiratory_symptoms:
        reasons.append("Mild respiratory symptoms")
        return {"level": 3, "color": "yellow", "name": "URGENT", "time": "30 min", "reasons": reasons}
    
    if symptoms.fever and vitals.hr and vitals.hr > 100:
        reasons.append("Fever with tachycardia")
        return {"level": 3, "color": "yellow", "name": "URGENT", "time": "30 min", "reasons": reasons}
    
    if symptoms.moderate_dehydration:
        reasons.append("Moderate dehydration")
        return {"level": 3, "color": "yellow", "name": "URGENT", "time": "30 min", "reasons": reasons}
    
    if symptoms.seizure_controlled:
        reasons.append("Controlled seizures (post-ictal)")
        return {"level": 3, "color": "yellow", "name": "URGENT", "time": "30 min", "reasons": reasons}
    
    if symptoms.abdominal_pain_moderate:
        reasons.append("Moderate abdominal pain")
        return {"level": 3, "color": "yellow", "name": "URGENT", "time": "30 min", "reasons": reasons}
    
    if gcs_total and 13 <= gcs_total <= 14:
        reasons.append("Mild head injury with monitoring needed")
        return {"level": 3, "color": "yellow", "name": "URGENT", "time": "30 min", "reasons": reasons}
    
    # PRIORITY IV - GREEN - SEMI-URGENT (60 min)
    if symptoms.minor_injury:
        reasons.append("Minor injury")
        return {"level": 4, "color": "green", "name": "SEMI-URGENT", "time": "60 min", "reasons": reasons}
    
    if symptoms.fever and not (vitals.hr and vitals.hr > 100):
        reasons.append("Mild fever")
        return {"level": 4, "color": "green", "name": "SEMI-URGENT", "time": "60 min", "reasons": reasons}
    
    if symptoms.abdominal_pain_mild:
        reasons.append("Mild abdominal pain")
        return {"level": 4, "color": "green", "name": "SEMI-URGENT", "time": "60 min", "reasons": reasons}
    
    # PRIORITY V - BLUE - NON-URGENT (Time-permitted)
    # Default to blue if nothing else matched
    reasons.append("Stable condition, routine assessment")
    return {"level": 5, "color": "blue", "name": "NON-URGENT", "time": "Time-permitted", "reasons": reasons}

# Triage endpoints
@api_router.post("/triage", response_model=TriageAssessment)
async def create_triage(triage_data: TriageCreate, current_user: UserResponse = Depends(get_current_user)):
    """Create a triage assessment with automatic priority calculation"""
    
    # Calculate priority
    priority_result = calculate_triage_priority(
        triage_data.age_group,
        triage_data.vitals,
        triage_data.symptoms
    )
    
    # Create triage assessment
    triage = TriageAssessment(
        age_group=triage_data.age_group,
        vitals=triage_data.vitals,
        symptoms=triage_data.symptoms,
        mechanism=triage_data.mechanism,
        priority_level=priority_result["level"],
        priority_color=priority_result["color"],
        priority_name=priority_result["name"],
        time_to_see=priority_result["time"],
        triage_reason=priority_result["reasons"],
        triaged_by=triage_data.triaged_by
    )
    
    # Save to database
    doc = triage.model_dump()
    doc['triaged_at'] = doc['triaged_at'].isoformat()
    await db.triage_assessments.insert_one(doc)
    
    return triage

@api_router.get("/triage/{triage_id}", response_model=TriageAssessment)
async def get_triage(triage_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Get a specific triage assessment"""
    triage = await db.triage_assessments.find_one({"id": triage_id}, {"_id": 0})
    if not triage:
        raise HTTPException(status_code=404, detail="Triage assessment not found")
    
    if isinstance(triage['triaged_at'], str):
        triage['triaged_at'] = datetime.fromisoformat(triage['triaged_at'])
    
    return triage

@api_router.get("/triage", response_model=List[TriageAssessment])
async def get_all_triage(current_user: UserResponse = Depends(get_current_user)):
    """Get all triage assessments"""
    triages = await db.triage_assessments.find({}, {"_id": 0}).sort("triaged_at", -1).to_list(1000)
    
    for triage in triages:
        if isinstance(triage['triaged_at'], str):
            triage['triaged_at'] = datetime.fromisoformat(triage['triaged_at'])
    
    return triages

# Case Sheet endpoints
@api_router.post("/cases", response_model=CaseSheet)
async def create_case(case_data: CaseSheetCreate, current_user: UserResponse = Depends(get_current_user)):
    case_dict = case_data.model_dump()
    
    # Provide defaults for optional fields
    if case_dict.get('primary_assessment') is None:
        case_dict['primary_assessment'] = PrimaryAssessment().model_dump()
    if case_dict.get('history') is None:
        case_dict['history'] = History().model_dump()
    if case_dict.get('examination') is None:
        case_dict['examination'] = Examination().model_dump()
    if case_dict.get('investigations') is None:
        case_dict['investigations'] = Investigations().model_dump()
    if case_dict.get('treatment') is None:
        case_dict['treatment'] = Treatment().model_dump()
    
    case_obj = CaseSheet(**case_dict, created_by_user_id=current_user.id)
    
    doc = case_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.cases.insert_one(doc)
    return case_obj

@api_router.get("/cases", response_model=List[CaseSheet])
async def get_cases(current_user: UserResponse = Depends(get_current_user)):
    cases = await db.cases.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for case in cases:
        if isinstance(case['created_at'], str):
            case['created_at'] = datetime.fromisoformat(case['created_at'])
        if isinstance(case['updated_at'], str):
            case['updated_at'] = datetime.fromisoformat(case['updated_at'])
    
    return cases

@api_router.get("/cases/{case_id}", response_model=CaseSheet)
async def get_case(case_id: str, current_user: UserResponse = Depends(get_current_user)):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if isinstance(case['created_at'], str):
        case['created_at'] = datetime.fromisoformat(case['created_at'])
    if isinstance(case['updated_at'], str):
        case['updated_at'] = datetime.fromisoformat(case['updated_at'])
    
    return case

@api_router.put("/cases/{case_id}", response_model=CaseSheet)
async def update_case(
    case_id: str, 
    case_update: CaseSheetUpdate, 
    lock_case: bool = False, 
    custom_timestamp: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check if case is locked
    if case.get('is_locked', False):
        raise HTTPException(
            status_code=403, 
            detail="Case is locked and cannot be edited. This is for legal and audit compliance. Use addendum feature to add additional notes."
        )
    
    # Validate custom timestamp if provided
    save_timestamp = datetime.now(timezone.utc)
    if custom_timestamp:
        # Convert IST to UTC for storage
        from datetime import datetime as dt
        ist = timezone(timedelta(hours=5, minutes=30))
        try:
            custom_dt = dt.fromisoformat(custom_timestamp)
            if custom_dt.tzinfo is None:
                custom_dt = custom_dt.replace(tzinfo=ist)
            
            # Convert to UTC
            save_timestamp = custom_dt.astimezone(timezone.utc)
            
            # Validate it's not in future and within 2 hours
            now_utc = datetime.now(timezone.utc)
            if save_timestamp > now_utc:
                raise HTTPException(status_code=400, detail="Timestamp cannot be in the future")
            
            time_diff = now_utc - save_timestamp
            if time_diff > timedelta(hours=2):
                raise HTTPException(status_code=400, detail="Timestamp must be within 2 hours of current time")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {str(e)}")
    
    update_data = case_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = save_timestamp.isoformat()
    
    if custom_timestamp:
        update_data['custom_save_timestamp'] = save_timestamp.isoformat()
    
    # If lock_case is True, lock the case permanently
    if lock_case:
        update_data['is_locked'] = True
        update_data['locked_at'] = save_timestamp.isoformat()
        update_data['locked_by_user_id'] = current_user.id
    
    await db.cases.update_one({"id": case_id}, {"$set": update_data})
    
    updated_case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if isinstance(updated_case['created_at'], str):
        updated_case['created_at'] = datetime.fromisoformat(updated_case['created_at'])
    if isinstance(updated_case['updated_at'], str):
        updated_case['updated_at'] = datetime.fromisoformat(updated_case['updated_at'])
    if updated_case.get('locked_at') and isinstance(updated_case['locked_at'], str):
        updated_case['locked_at'] = datetime.fromisoformat(updated_case['locked_at'])
    if updated_case.get('custom_save_timestamp') and isinstance(updated_case['custom_save_timestamp'], str):
        updated_case['custom_save_timestamp'] = datetime.fromisoformat(updated_case['custom_save_timestamp'])
    
    return updated_case

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, current_user: UserResponse = Depends(get_current_user)):
    result = await db.cases.delete_one({"id": case_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case deleted successfully"}

# Pediatric Case Sheet Endpoints
@api_router.post("/cases-pediatric")
async def create_pediatric_case(data: dict, current_user: UserResponse = Depends(get_current_user)):
    """Create a new pediatric case sheet"""
    try:
        case_data = {
            **data,
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "case_type": "pediatric"
        }
        
        await db.cases_pediatric.insert_one(case_data)
        return {"id": case_data["id"], "message": "Pediatric case created successfully"}
    except Exception as e:
        logging.error(f"Error creating pediatric case: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cases-pediatric")
async def get_all_pediatric_cases(current_user: UserResponse = Depends(get_current_user)):
    """Get all pediatric cases"""
    cases = await db.cases_pediatric.find({}, {"_id": 0}).to_list(1000)
    return cases

@api_router.get("/cases-pediatric/{case_id}")
async def get_pediatric_case(case_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Get a specific pediatric case"""
    case = await db.cases_pediatric.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Pediatric case not found")
    return case

@api_router.put("/cases-pediatric/{case_id}")
async def update_pediatric_case(case_id: str, data: dict, current_user: UserResponse = Depends(get_current_user)):
    """Update a pediatric case"""
    case = await db.cases_pediatric.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Pediatric case not found")
    
    update_data = {
        **data,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.cases_pediatric.update_one(
        {"id": case_id},
        {"$set": update_data}
    )
    
    return {"message": "Pediatric case updated successfully"}

@api_router.delete("/cases-pediatric/{case_id}")
async def delete_pediatric_case(case_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Delete a pediatric case"""
    result = await db.cases_pediatric.delete_one({"id": case_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pediatric case not found")
    return {"message": "Pediatric case deleted successfully"}

# AI endpoints
@api_router.post("/ai/generate", response_model=AIResponse)
async def generate_ai_response(request: AIGenerateRequest, current_user: UserResponse = Depends(get_current_user)):
    case = await db.cases.find_one({"id": request.case_sheet_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if request.prompt_type == "discharge_summary":
        prompt = f"""
You are an emergency medicine AI assistant. Generate a comprehensive discharge summary based on the following case sheet data.

Patient Information:
- Name: {case['patient']['name']}
- Age/Sex: {case['patient']['age']}/{case['patient']['sex']}
- UHID: {case['patient'].get('uhid', 'N/A')}
- MLC: {'Yes' if case['patient'].get('mlc', False) else 'No'}

Vitals at Arrival:
- HR: {case['vitals_at_arrival'].get('hr', 'N/A')}
- BP: {case['vitals_at_arrival'].get('bp_systolic', 'N/A')}/{case['vitals_at_arrival'].get('bp_diastolic', 'N/A')}
- RR: {case['vitals_at_arrival'].get('rr', 'N/A')}
- SpO2: {case['vitals_at_arrival'].get('spo2', 'N/A')}%
- Temperature: {case['vitals_at_arrival'].get('temperature', 'N/A')}°C
- GCS: E{case['vitals_at_arrival'].get('gcs_e', '-')} V{case['vitals_at_arrival'].get('gcs_v', '-')} M{case['vitals_at_arrival'].get('gcs_m', '-')}

Presenting Complaint:
{case['presenting_complaint']['text']}
Duration: {case['presenting_complaint']['duration']}
Onset: {case['presenting_complaint']['onset_type']}

History:
{case['history'].get('hpi', 'Not documented')}

Past Medical History: {', '.join(case['history'].get('past_medical', ['None documented']))}

Primary Assessment (ABCDE):
- Airway: {case['primary_assessment'].get('airway_status', 'Not documented')}
- Breathing: RR {case['primary_assessment'].get('breathing_rr', 'N/A')}, SpO2 {case['primary_assessment'].get('breathing_spo2', 'N/A')}%
- Circulation: HR {case['primary_assessment'].get('circulation_hr', 'N/A')}, BP {case['primary_assessment'].get('circulation_bp_systolic', 'N/A')}/{case['primary_assessment'].get('circulation_bp_diastolic', 'N/A')}
- Disability: AVPU {case['primary_assessment'].get('disability_avpu', 'N/A')}, GCS E{case['primary_assessment'].get('disability_gcs_e', '-')}V{case['primary_assessment'].get('disability_gcs_v', '-')}M{case['primary_assessment'].get('disability_gcs_m', '-')}
- Exposure: Temperature {case['primary_assessment'].get('exposure_temperature', 'N/A')}°C

Examination:
{case['examination'].get('general_notes', 'Not documented')}

Investigations:
Panels: {', '.join(case['investigations'].get('panels_selected', ['None']))}

Treatment Given:
Interventions: {', '.join(case['treatment'].get('interventions', ['None documented']))}
{case['treatment'].get('intervention_notes', '')}

Provisional Diagnosis:
{', '.join(case['treatment'].get('provisional_diagnoses', ['Not documented']))}

Disposition:
{case.get('disposition', {}).get('type', 'Not documented') if case.get('disposition') else 'Not documented'}
Condition: {case.get('disposition', {}).get('condition_at_discharge', 'Not documented') if case.get('disposition') else 'Not documented'}

Please generate a professional, well-structured discharge summary in standard medical format.
"""
    elif request.prompt_type == "red_flags":
        prompt = f"""
You are an expert emergency medicine physician. Analyze this case for RED FLAGS and CRITICAL FINDINGS based on established medical guidelines.

=== PATIENT DATA ===
Vitals at Arrival:
• HR: {case['vitals_at_arrival'].get('hr', 'N/A')} bpm
• BP: {case['vitals_at_arrival'].get('bp_systolic', 'N/A')}/{case['vitals_at_arrival'].get('bp_diastolic', 'N/A')} mmHg
• RR: {case['vitals_at_arrival'].get('rr', 'N/A')} /min
• SpO2: {case['vitals_at_arrival'].get('spo2', 'N/A')}%
• Temperature: {case['vitals_at_arrival'].get('temperature', 'N/A')}°C
• GCS: E{case['vitals_at_arrival'].get('gcs_e', '-')} V{case['vitals_at_arrival'].get('gcs_v', '-')} M{case['vitals_at_arrival'].get('gcs_m', '-')}

Chief Complaint: {case['presenting_complaint']['text']}
Duration: {case['presenting_complaint'].get('duration', 'Not specified')}

Primary Survey:
• Airway: {case['primary_assessment'].get('airway_status', 'Not documented')}
• Breathing: {case['primary_assessment'].get('breathing_work', 'Not documented')}
• Circulation: {case['primary_assessment'].get('circulation_peripheral_pulses', 'Not documented')}

=== REQUIRED OUTPUT FORMAT ===
Provide a structured analysis with:

🚨 CRITICAL RED FLAGS (Life-threatening):
[List any immediately life-threatening findings]

⚠️ WARNING SIGNS (Urgent but stable):
[List concerning findings requiring close monitoring]

✅ REASSURING FEATURES:
[List any positive/stable findings]

📋 RECOMMENDED IMMEDIATE ACTIONS:
1. [Specific action items in priority order]
2. [Include tests, interventions, consultations needed]

🔍 THINGS TO WATCH FOR:
[What could deteriorate? What trends to monitor?]

📚 CLINICAL REFERENCES:
For each major finding or recommendation, cite the relevant clinical guideline or reference (e.g., "ACLS Guidelines 2020", "NICE Guidelines", "AHA/ASA Stroke Guidelines", etc.)

Be concise, specific, and clinically actionable. Focus on what the ER doctor should DO right now.
Base your analysis on evidence-based medicine and current clinical practice guidelines.
"""
    elif request.prompt_type == "diagnosis_suggestions":
        prompt = f"""
You are an expert emergency medicine physician. Provide evidence-based DIFFERENTIAL DIAGNOSIS suggestions for this case.

=== PATIENT PRESENTATION ===
Chief Complaint: {case['presenting_complaint']['text']}
Duration: {case['presenting_complaint'].get('duration', 'Not specified')}
Onset: {case['presenting_complaint'].get('onset_type', 'Not specified')}

Vital Signs:
• HR: {case['vitals_at_arrival'].get('hr', 'N/A')} bpm
• BP: {case['vitals_at_arrival'].get('bp_systolic', 'N/A')}/{case['vitals_at_arrival'].get('bp_diastolic', 'N/A')} mmHg  
• RR: {case['vitals_at_arrival'].get('rr', 'N/A')} /min
• SpO2: {case['vitals_at_arrival'].get('spo2', 'N/A')}%
• Temperature: {case['vitals_at_arrival'].get('temperature', 'N/A')}°C

History of Present Illness:
{case['history'].get('hpi', 'Not documented')}

Past Medical History: {', '.join(case['history'].get('past_medical', ['None documented']))}

Examination:
General: {case['examination'].get('general_notes', 'Not documented')}
Respiratory: {case['examination'].get('respiratory_summary', 'Not documented')}
CVS: {case['examination'].get('cvs_summary', 'Not documented')}
Abdomen: {case['examination'].get('abdomen_summary', 'Not documented')}

=== REQUIRED OUTPUT FORMAT ===

🎯 MOST LIKELY DIAGNOSES (in order of probability):

1. [Diagnosis Name]
   📌 Why: [Key supporting features]
   🔬 To confirm: [Specific tests/findings needed]
   ⚡ If this: [Key management step]
   📚 Reference: [Clinical guideline or study]

2. [Diagnosis Name]
   📌 Why: [Key supporting features]
   🔬 To confirm: [Specific tests/findings needed]
   ⚡ If this: [Key management step]
   📚 Reference: [Clinical guideline or study]

3. [Continue for 4-6 differential diagnoses, each with reference]

⚠️ DON'T MISS (Rule these out):
• [Dangerous diagnosis 1]: [Why to consider / How to rule out] [Reference guideline]
• [Dangerous diagnosis 2]: [Why to consider / How to rule out] [Reference guideline]

📊 NEXT DIAGNOSTIC STEPS (Priority order):
1. [Test/Exam]
2. [Test/Exam]
3. [Test/Exam]

💡 CLINICAL PEARLS:
[Any helpful clinical tips or patterns that apply to this case]

📚 KEY REFERENCES:
List the main clinical guidelines, studies, or protocols used in this analysis (e.g., "AHA/ACC Chest Pain Guidelines 2021", "NICE Guidelines", "UpToDate", etc.)

Be specific, practical, and help the ER doctor think through the case systematically. Base all recommendations on current evidence-based medicine and cite relevant guidelines.
"""
    else:
        raise HTTPException(status_code=400, detail="Invalid prompt type")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"case_{request.case_sheet_id}_{request.prompt_type}",
            system_message="You are an expert emergency medicine physician assistant. Always cite clinical guidelines and evidence-based references."
        ).with_model("openai", "gpt-5.1")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Generate relevant medical sources based on prompt type
        sources = []
        if request.prompt_type == "red_flags":
            sources = [
                AISource(
                    title="ACLS Guidelines - Advanced Cardiovascular Life Support",
                    url="https://www.heart.org/en/professional/quality-improvement/acls-ecc",
                    snippet="Evidence-based guidelines for emergency cardiovascular care and critical patient assessment"
                ),
                AISource(
                    title="ATLS Guidelines - Advanced Trauma Life Support",
                    url="https://www.facs.org/quality-programs/trauma/education/atls",
                    snippet="Systematic approach to trauma patient assessment and management"
                ),
                AISource(
                    title="Emergency Triage Manchester Triage System",
                    url="https://www.manchester triage.com",
                    snippet="Standardized clinical risk assessment for emergency departments"
                )
            ]
        elif request.prompt_type == "diagnosis_suggestions":
            sources = [
                AISource(
                    title="UpToDate - Clinical Decision Support",
                    url="https://www.uptodate.com",
                    snippet="Evidence-based clinical decision support resource for differential diagnosis"
                ),
                AISource(
                    title="NICE Guidelines - National Institute for Health and Care Excellence",
                    url="https://www.nice.org.uk/guidance",
                    snippet="Evidence-based recommendations for health and care in England"
                ),
                AISource(
                    title="AHA/ASA Stroke Guidelines",
                    url="https://www.stroke.org/en/professional/guidelines",
                    snippet="American Heart Association/American Stroke Association clinical practice guidelines"
                ),
                AISource(
                    title="Emergency Medicine Practice Guidelines",
                    url="https://www.ebmedicine.net",
                    snippet="Evidence-based emergency medicine clinical practice guidelines and reviews"
                )
            ]
        
        return AIResponse(response=response, case_sheet_id=request.case_sheet_id, sources=sources)
    except Exception as e:
        logging.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# Discharge Summary endpoints
@api_router.post("/discharge-summary", response_model=DischargeSummary)
async def create_discharge_summary(case_sheet_id: str, current_user: UserResponse = Depends(get_current_user)):
    # Generate AI summary first
    ai_request = AIGenerateRequest(case_sheet_id=case_sheet_id, prompt_type="discharge_summary")
    ai_response = await generate_ai_response(ai_request, current_user)
    
    summary = DischargeSummary(
        case_sheet_id=case_sheet_id,
        summary_text=ai_response.response
    )
    
    doc = summary.model_dump()
    doc['generated_at'] = doc['generated_at'].isoformat()
    
    await db.discharge_summaries.insert_one(doc)
    return summary

@api_router.get("/discharge-summary/{case_sheet_id}", response_model=DischargeSummary)
async def get_discharge_summary(case_sheet_id: str, current_user: UserResponse = Depends(get_current_user)):
    summary = await db.discharge_summaries.find_one({"case_sheet_id": case_sheet_id}, {"_id": 0})
    if not summary:
        raise HTTPException(status_code=404, detail="Discharge summary not found")
    
    if isinstance(summary['generated_at'], str):
        summary['generated_at'] = datetime.fromisoformat(summary['generated_at'])
    
    return summary

# Transcript Parsing for Auto-population
class TranscriptParseRequest(BaseModel):
    case_sheet_id: str
    transcript: str
    source_language: str

@api_router.post("/ai/parse-transcript")
async def parse_transcript(request: TranscriptParseRequest, current_user: UserResponse = Depends(get_current_user)):
    """Parse continuous voice transcript and extract structured case sheet data"""
    
    prompt = f"""You are an advanced medical AI with 3-STAGE PROCESSING capability.

STAGE 1 - CLEAN THE TRANSCRIPT:
Raw transcript (recorded in {request.source_language}):
"{request.transcript}"

First, clean this text by:
- Removing repeated words/phrases (e.g., "the the the patient" → "the patient")
- Removing filler words (um, uh, like, you know, operation operation)
- Removing incomplete words or noise artifacts
- Normalizing numbers and medical terms
- Converting non-English text to English
- Keeping ONLY medically relevant information

STAGE 2 - IDENTIFY MEDICAL DATA:
From the cleaned text, identify and extract:
- Patient demographics (name, age, gender)
- Chief complaint and duration
- History of present illness (HPI)
- Past medical history, surgical history, allergies
- Current medications
- Vital signs (HR, BP, RR, SpO2, Temp, GCS)
- Physical examination findings (general, CVS, respiratory, abdomen, CNS)
- Primary assessment (ABCDE)
- Treatment/interventions mentioned

STAGE 3 - STRUCTURE THE DATA:
Return ONLY a valid JSON object with this structure (omit fields not mentioned):

{{
  "patient_info": {{
    "name": "patient name if mentioned",
    "age": number or null,
    "gender": "male/female/other or null"
  }},
  "history": {{
    "hpi": "history of present illness",
    "signs_and_symptoms": "observed signs and symptoms",
    "past_medical": ["condition1", "condition2"],
    "allergies": ["allergy1", "allergy2"],
    "past_surgical": "surgical history",
    "drug_history": "current medications"
  }},
  "vitals": {{
    "hr": number or null,
    "bp_systolic": number or null,
    "bp_diastolic": number or null,
    "rr": number or null,
    "spo2": number or null,
    "temperature": number or null,
    "gcs_e": number or null,
    "gcs_v": number or null,
    "gcs_m": number or null
  }},
  "examination": {{
    "general_notes": "general findings",
    "general_pallor": boolean,
    "general_icterus": boolean,
    "cvs_status": "Normal or Abnormal",
    "cvs_additional_notes": "CVS findings",
    "respiratory_status": "Normal or Abnormal",
    "respiratory_additional_notes": "respiratory findings",
    "abdomen_status": "Normal or Abnormal",
    "abdomen_additional_notes": "abdominal findings",
    "cns_status": "Normal or Abnormal",
    "cns_additional_notes": "CNS findings"
  }},
  "presenting_complaint": {{
    "text": "chief complaint",
    "duration": "duration",
    "onset_type": "sudden or gradual"
  }},
  "primary_assessment": {{
    "airway_additional_notes": "airway assessment",
    "breathing_additional_notes": "breathing assessment",
    "circulation_additional_notes": "circulation assessment",
    "disability_additional_notes": "disability assessment",
    "exposure_additional_notes": "exposure findings"
  }},
  "treatment": {{
    "intervention_notes": "treatments given"
  }}
}}

CRITICAL RULES:
- Ignore any repeated/garbage words completely
- Extract ONLY explicitly mentioned information
- If uncertain, omit the field rather than guessing
- Use proper medical terminology
- Return ONLY the JSON object, no additional text
"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"transcript_parse_{request.case_sheet_id}",
            system_message="You are a medical transcription AI with 3-stage processing. Clean, extract, and structure medical data from doctor's notes. Return ONLY valid JSON."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        import json
        import re
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response
        
        parsed_data = json.loads(json_str)
        
        # Auto-calculate ABCDE and Red Flags based on vitals
        abcde_data = {}
        red_flags = []
        
        if 'vitals' in parsed_data and parsed_data['vitals']:
            vitals = parsed_data['vitals']
            
            # Calculate GCS total
            gcs_total = 0
            if vitals.get('gcs_e'): gcs_total += vitals['gcs_e']
            if vitals.get('gcs_v'): gcs_total += vitals['gcs_v']
            if vitals.get('gcs_m'): gcs_total += vitals['gcs_m']
            
            # AIRWAY Assessment
            if gcs_total > 0 and gcs_total <= 8:
                abcde_data['airway_status'] = 'Threatened'
                abcde_data['airway_additional_notes'] = f'Low GCS ({gcs_total}) - Airway may be compromised'
                red_flags.append(f'🚨 CRITICAL: GCS {gcs_total} - Consider airway protection')
            elif gcs_total >= 13:
                abcde_data['airway_status'] = 'Patent'
            
            # BREATHING Assessment
            rr = vitals.get('rr')
            spo2 = vitals.get('spo2')
            
            if rr and (rr < 10 or rr > 30):
                abcde_data['breathing_status'] = 'Abnormal'
                abcde_data['breathing_additional_notes'] = f'Abnormal RR: {rr}/min'
                if rr < 10:
                    red_flags.append(f'🚨 CRITICAL: Bradypnea (RR {rr}) - Consider ventilatory support')
                else:
                    red_flags.append(f'⚠️ Tachypnea (RR {rr}) - Assess for respiratory distress')
            
            if spo2 and spo2 < 90:
                abcde_data['breathing_status'] = 'Abnormal'
                abcde_data['breathing_additional_notes'] = f'Low SpO2: {spo2}%'
                if spo2 < 85:
                    red_flags.append(f'🚨 CRITICAL: Severe hypoxia (SpO2 {spo2}%) - Immediate oxygen/NIV required')
                else:
                    red_flags.append(f'⚠️ Hypoxia (SpO2 {spo2}%) - Consider oxygen supplementation')
            
            # CIRCULATION Assessment  
            bp_sys = vitals.get('bp_systolic')
            hr = vitals.get('hr')
            
            if bp_sys and bp_sys < 90:
                abcde_data['circulation_status'] = 'Compromised'
                abcde_data['circulation_additional_notes'] = f'Hypotension: {bp_sys} mmHg systolic'
                red_flags.append(f'🚨 CRITICAL: Hypotension (SBP {bp_sys}) - Possible shock, fluid resuscitation needed')
            elif bp_sys and bp_sys > 180:
                abcde_data['circulation_status'] = 'Abnormal'
                red_flags.append(f'⚠️ Severe Hypertension (SBP {bp_sys}) - Monitor for hypertensive emergency')
            
            if hr and hr < 40:
                red_flags.append(f'🚨 CRITICAL: Severe Bradycardia (HR {hr}) - Consider pacing/atropine')
            elif hr and hr > 130:
                red_flags.append(f'⚠️ Tachycardia (HR {hr}) - Assess for shock/sepsis/arrhythmia')
            
            # DISABILITY Assessment
            if gcs_total > 0:
                if gcs_total < 9:
                    abcde_data['disability_status'] = 'Severe impairment'
                    abcde_data['disability_additional_notes'] = f'GCS {gcs_total} (E{vitals.get("gcs_e","-")}V{vitals.get("gcs_v","-")}M{vitals.get("gcs_m","-")})'
                elif gcs_total < 13:
                    abcde_data['disability_status'] = 'Moderate impairment'
                    abcde_data['disability_additional_notes'] = f'GCS {gcs_total} (E{vitals.get("gcs_e","-")}V{vitals.get("gcs_v","-")}M{vitals.get("gcs_m","-")})'
                    red_flags.append(f'⚠️ Altered mental status (GCS {gcs_total})')
                else:
                    abcde_data['disability_status'] = 'Alert'
                    abcde_data['disability_additional_notes'] = f'GCS {gcs_total}'
            
            # EXPOSURE Assessment
            temp = vitals.get('temperature')
            if temp:
                if temp < 35:
                    abcde_data['exposure_status'] = 'Hypothermia'
                    abcde_data['exposure_additional_notes'] = f'Temperature: {temp}°C'
                    red_flags.append(f'⚠️ Hypothermia ({temp}°C) - Warming measures needed')
                elif temp > 38.5:
                    abcde_data['exposure_status'] = 'Fever'
                    abcde_data['exposure_additional_notes'] = f'Temperature: {temp}°C'
                    red_flags.append(f'⚠️ Fever ({temp}°C) - Consider sepsis workup')
        
        # Add ABCDE and red flags to primary assessment
        if abcde_data:
            if 'primary_assessment' not in parsed_data:
                parsed_data['primary_assessment'] = {}
            parsed_data['primary_assessment'].update(abcde_data)
        
        if red_flags:
            parsed_data['red_flags'] = red_flags
        
        return {
            "success": True,
            "parsed_data": parsed_data,
            "message": "Transcript parsed successfully. ABCDE assessment and red flags auto-calculated. Review and save.",
            "red_flags": red_flags
        }
    
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse AI response as JSON: {str(e)}",
            "raw_response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript parsing failed: {str(e)}")

# Addendum endpoints
class AddendumRequest(BaseModel):
    case_id: str
    note: str

@api_router.post("/transcribe-audio")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Transcribe audio using OpenAI Whisper API via emergentintegrations
    Supports continuous recording for medical dictation
    """
    try:
        # Save uploaded audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
        
        # Initialize Speech-to-Text with Emergent LLM key
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Transcribe using Whisper with optimized medical settings
        with open(temp_audio_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                language="en",
                response_format="text",
                temperature=0.0,  # Maximum accuracy for medical terminology
                prompt="Medical emergency room documentation. Patient vitals: heart rate, blood pressure, respiratory rate, temperature, SpO2, GCS. Clinical symptoms and findings."  # Medical context
            )
        
        # Clean up temp file
        os.unlink(temp_audio_path)
        
        return {
            "success": True,
            "transcription": response.text
        }
        
    except Exception as e:
        logging.error(f"Whisper transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

class ExtractTriageDataRequest(BaseModel):
    text: str

@api_router.post("/extract-triage-data")
async def extract_triage_data(
    request: ExtractTriageDataRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Extract structured medical data from transcribed text for triage
    Uses AI to parse vitals, symptoms, and other relevant information
    """
    try:
        # Create AI prompt with 3-STAGE EXTRACTION for noise immunity
        extraction_prompt = f"""You are an advanced medical data extraction AI with 3-stage processing.

STAGE 1 - CLEAN THE TRANSCRIPT:
Raw transcription: "{request.text}"

First, clean this text by:
- Removing repeated words/phrases (e.g., "operation operation operation" → remove)
- Removing filler words (um, uh, like, you know)
- Removing incomplete words or noise artifacts
- Normalizing numbers ("one forty over eighty" → "140/80", "one ten" → "110")
- Keeping ONLY medically relevant information

STAGE 2 - IDENTIFY MEDICAL ENTITIES:
From the cleaned text, identify:
- Heart Rate (HR): look for "heart rate", "HR", "pulse" followed by number
- Blood Pressure (BP): look for "BP", "blood pressure", "systolic/diastolic", "over" pattern
- Respiratory Rate (RR): look for "respiratory rate", "RR", "breathing" followed by number
- SpO2: look for "SpO2", "oxygen saturation", "sats" followed by number or percentage
- Temperature: look for "temperature", "temp", "fever" followed by number
- GCS: look for "GCS", "Glasgow", "E", "V", "M" followed by numbers 1-6
- Symptoms: chest pain, fever, seizure, respiratory distress, trauma, bleeding, etc.

STAGE 3 - STRUCTURE THE DATA:
Return ONLY a valid JSON object:
{{
  "vitals": {{
    "hr": number or null,
    "bp_systolic": number or null,
    "bp_diastolic": number or null,
    "rr": number or null,
    "spo2": number or null,
    "temperature": number or null,
    "gcs_e": number (1-4) or null,
    "gcs_v": number (1-5) or null,
    "gcs_m": number (1-6) or null,
    "capillary_refill": number or null
  }},
  "symptoms": {{
    "obstructed_airway": boolean,
    "facial_burns": boolean,
    "stridor": boolean,
    "severe_respiratory_distress": boolean,
    "moderate_respiratory_distress": boolean,
    "mild_respiratory_symptoms": boolean,
    "cyanosis": boolean,
    "apnea": boolean,
    "shock": boolean,
    "severe_bleeding": boolean,
    "cardiac_arrest": boolean,
    "chest_pain": boolean,
    "chest_pain_with_hypotension": boolean,
    "seizure_ongoing": boolean,
    "seizure_controlled": boolean,
    "confusion": boolean,
    "focal_deficits": boolean,
    "lethargic_unconscious": boolean,
    "major_trauma": boolean,
    "moderate_trauma": boolean,
    "minor_injury": boolean,
    "severe_burns": boolean,
    "anaphylaxis": boolean,
    "suspected_stroke": boolean,
    "sepsis": boolean,
    "gi_bleed": boolean,
    "fever": boolean,
    "non_blanching_rash": boolean,
    "severe_dehydration": boolean,
    "moderate_dehydration": boolean,
    "abdominal_pain_severe": boolean,
    "abdominal_pain_moderate": boolean,
    "abdominal_pain_mild": boolean
  }}
}}

CRITICAL RULES:
- Ignore any repeated/garbage words completely
- Extract ONLY explicitly mentioned medical values
- For symptoms: true if mentioned, false otherwise
- For vitals: extract numeric values only, ignore text noise
- GCS: E (Eye 1-4), V (Verbal 1-5), M (Motor 1-6)
- BP: extract systolic and diastolic separately
- If uncertain about a value, use null rather than guessing
- Return ONLY the JSON object, no additional text or explanation"""

        # Use emergentintegrations LlmChat for extraction
        import json
        
        # Initialize LlmChat with proper parameters
        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"triage_extraction_{current_user.id}",
            system_message="You are a medical data extraction AI. Extract structured data from medical transcriptions and return valid JSON."
        )
        
        # Set model to OpenAI GPT-4o-mini
        llm = llm.with_model(provider="openai", model="gpt-4o-mini")
        
        # Send extraction request
        response_text = await llm.send_message(UserMessage(text=extraction_prompt))
        
        # Parse the JSON response
        extracted_data = json.loads(response_text)
        
        return {
            "success": True,
            "data": extracted_data
        }
        
    except Exception as e:
        logging.error(f"Data extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

class ExtractCaseSheetDataRequest(BaseModel):
    text: str
    section: str  # 'history', 'examination', 'primary_assessment'

@api_router.post("/extract-casesheet-data")
async def extract_casesheet_data(
    request: ExtractCaseSheetDataRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Extract structured medical data from case sheet voice transcriptions
    Section-specific extraction for history, examination, and primary assessment
    """
    try:
        # Create section-specific prompts
        if request.section == 'history':
            extraction_prompt = f"""You are a medical data extraction AI. Extract structured history data from this transcription.

Transcription: "{request.text}"

Extract and return ONLY a valid JSON object:
{{
  "signs_and_symptoms": "extracted text or null",
  "allergies": ["list of allergies"] or [],
  "past_medical": ["list of conditions"] or [],
  "drug_history": "extracted medications text or null",
  "past_surgical": "extracted surgical history or null",
  "family_history": "extracted family history or null"
}}

Rules:
- Extract ONLY explicitly mentioned information
- For allergies: return array of allergy strings
- For past_medical: return array of condition strings  
- Return null for missing text fields
- Return empty arrays for missing list fields
- Return ONLY the JSON object, no additional text"""

        elif request.section == 'examination':
            extraction_prompt = f"""You are a medical data extraction AI. Extract structured examination findings from this transcription.

Transcription: "{request.text}"

Extract and return ONLY a valid JSON object:
{{
  "general_notes": "extracted general examination text or null",
  "cvs_findings": "extracted CVS examination text or null",
  "respiratory_findings": "extracted respiratory examination text or null",
  "abdomen_findings": "extracted abdominal examination text or null",
  "cns_findings": "extracted CNS examination text or null",
  "general_pallor": boolean,
  "general_icterus": boolean,
  "general_clubbing": boolean,
  "general_lymphadenopathy": boolean
}}

Rules:
- Extract physical examination findings mentioned
- For boolean fields: true if explicitly mentioned as present, false otherwise
- Return null for text fields with no relevant findings
- Return ONLY the JSON object, no additional text"""

        elif request.section == 'primary_assessment':
            extraction_prompt = f"""You are a medical data extraction AI. Extract ABCDE assessment data from this transcription.

Transcription: "{request.text}"

Extract and return ONLY a valid JSON object:
{{
  "airway_notes": "extracted airway assessment or null",
  "breathing_notes": "extracted breathing assessment or null",
  "circulation_notes": "extracted circulation assessment or null",
  "disability_notes": "extracted disability/neuro assessment or null",
  "exposure_local_exam_notes": "extracted exposure findings or null"
}}

Rules:
- Extract ABCDE primary survey findings
- Return null for sections not mentioned
- Return ONLY the JSON object, no additional text"""

        else:
            raise HTTPException(status_code=400, detail=f"Invalid section: {request.section}")

        # Use emergentintegrations LlmChat for extraction
        import json
        
        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"casesheet_extraction_{current_user.id}_{request.section}",
            system_message="You are a medical data extraction AI. Extract structured data from medical documentation and return valid JSON."
        )
        
        llm = llm.with_model(provider="openai", model="gpt-4o-mini")
        response_text = await llm.send_message(UserMessage(text=extraction_prompt))
        
        extracted_data = json.loads(response_text)
        
        return {
            "success": True,
            "section": request.section,
            "data": extracted_data
        }
        
    except Exception as e:
        logging.error(f"Case sheet extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

class ExtractCaseDataRequest(BaseModel):
    transcript: str
    is_pediatric: bool = False

@api_router.post("/extract-case-data")
async def extract_case_data(
    request: ExtractCaseDataRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Extract complete case sheet data from continuous voice transcript
    Includes cleaning, extraction, and ABCDE auto-calculation
    Similar to /extract-triage-data but for full case sheets
    """
    try:
        # Create comprehensive 3-STAGE extraction prompt (with pediatric support)
        if request.is_pediatric:
            extraction_prompt = f"""You are an advanced PEDIATRIC medical AI with 3-STAGE PROCESSING for pediatric case sheet documentation.

STAGE 1 - CLEAN THE TRANSCRIPT:
Raw transcript: "{request.transcript}"

Clean by:
- Removing repeated words/phrases (e.g., "han han han", "patient name patient name" → remove duplicates)
- Removing filler words (um, uh, like, you know, pahle, complete)
- Removing incomplete words or noise artifacts
- Normalizing numbers ("one forty over eighty" → "140/80")
- Converting non-English to English
- Keeping ONLY medically relevant information

STAGE 2 - IDENTIFY & EXTRACT PEDIATRIC MEDICAL DATA:
From the cleaned text, extract:
- Patient demographics (name, age with unit: days/months/years, gender)
- Growth parameters (weight in kg, height in cm, head circumference in cm)
- PAT (Pediatric Assessment Triangle): appearance, work of breathing, circulation to skin
- Chief complaint and HPI
- Birth history, immunization status, developmental milestones, feeding history
- Past medical/surgical history, allergies, medications
- Vital signs (HR, BP, RR, SpO2, Temp, GCS, Capillary Refill Time)
- Physical examination findings (dehydration status, all systems, skin)
- Primary assessment notes (ABCDE)
- Treatment/interventions

STAGE 3 - STRUCTURE THE DATA:
Return ONLY a valid JSON object:

{{
  "patient_info": {{
    "name": "string or null",
    "age": number or null,
    "age_unit": "years/months/days or null",
    "gender": "Male/Female/Other or null"
  }},
  "growth_parameters": {{
    "weight": number (kg) or null,
    "height": number (cm) or null,
    "head_circumference": number (cm) or null,
    "bmi": number or null
  }},
  "pat": {{
    "appearance": "Normal/Abnormal or null",
    "work_of_breathing": "Normal/Increased or null",
    "circulation_to_skin": "Normal/Abnormal or null",
    "overall_impression": "Stable/Sick/Critical or null"
  }},
  "vitals": {{
    "hr": number or null,
    "bp_systolic": number or null,
    "bp_diastolic": number or null,
    "rr": number or null,
    "spo2": number or null,
    "temperature": number or null,
    "gcs_e": number (1-4) or null,
    "gcs_v": number (1-5) or null,
    "gcs_m": number (1-6) or null,
    "capillary_refill": number (seconds) or null
  }},
  "history": {{
    "signs_and_symptoms": "string or null",
    "birth_history": "string or null",
    "immunization_status": "string or null",
    "developmental_milestones": "string or null",
    "feeding_history": "string or null",
    "past_medical": ["conditions"] or [],
    "allergies": ["allergies"] or [],
    "drug_history": "string or null",
    "past_surgical": "string or null",
    "family_history": "string or null"
  }},
  "examination": {{
    "general_notes": "string or null",
    "general_pallor": boolean,
    "general_icterus": boolean,
    "general_cyanosis": boolean,
    "general_dehydration": "None/Mild/Moderate/Severe or null",
    "cvs_additional_notes": "string or null",
    "respiratory_additional_notes": "string or null",
    "abdomen_additional_notes": "string or null",
    "cns_additional_notes": "string or null",
    "skin_notes": "string or null",
    "musculoskeletal_notes": "string or null"
  }},
  "primary_assessment": {{
    "airway_additional_notes": "string or null",
    "breathing_additional_notes": "string or null",
    "circulation_additional_notes": "string or null",
    "disability_additional_notes": "string or null",
    "exposure_additional_notes": "string or null"
  }},
  "presenting_complaint": {{
    "text": "string or null",
    "duration": "string or null",
    "onset_type": "Sudden/Gradual or null"
  }}
}}

CRITICAL RULES:
- Ignore repeated/garbage words completely
- Extract ONLY explicitly mentioned values
- Use null for missing data
- Return ONLY the JSON object, no other text
"""
        else:
            extraction_prompt = f"""You are an advanced medical AI with 3-STAGE PROCESSING for case sheet documentation.

STAGE 1 - CLEAN THE TRANSCRIPT:
Raw transcript: "{request.transcript}"

Clean by:
- Removing repeated words/phrases (e.g., "han han han", "patient name patient name" → remove duplicates)
- Removing filler words (um, uh, like, you know, pahle, complete)
- Removing incomplete words or noise artifacts
- Normalizing numbers ("one forty over eighty" → "140/80")
- Converting non-English to English
- Keeping ONLY medically relevant information

STAGE 2 - IDENTIFY & EXTRACT MEDICAL DATA:
From the cleaned text, extract:
- Patient demographics (name, age, gender)
- Chief complaint and HPI
- Past medical/surgical history, allergies, medications
- Vital signs (HR, BP, RR, SpO2, Temp, GCS)
- Physical examination findings (all systems)
- Primary assessment notes
- Treatment/interventions

STAGE 3 - STRUCTURE THE DATA:
Return ONLY a valid JSON object:

{{
  "patient_info": {{
    "name": "string or null",
    "age": number or null,
    "gender": "string or null"
  }},
  "vitals": {{
    "hr": number or null,
    "bp_systolic": number or null,
    "bp_diastolic": number or null,
    "rr": number or null,
    "spo2": number or null,
    "temperature": number or null,
    "gcs_e": number (1-4) or null,
    "gcs_v": number (1-5) or null,
    "gcs_m": number (1-6) or null
  }},
  "history": {{
    "signs_and_symptoms": "string or null",
    "past_medical": ["conditions"] or [],
    "allergies": ["allergies"] or [],
    "drug_history": "string or null",
    "past_surgical": "string or null",
    "family_history": "string or null"
  }},
  "examination": {{
    "general_notes": "string or null",
    "general_pallor": boolean,
    "general_icterus": boolean,
    "general_clubbing": boolean,
    "general_lymphadenopathy": boolean,
    "cvs_additional_notes": "string or null",
    "respiratory_additional_notes": "string or null",
    "abdomen_additional_notes": "string or null",
    "cns_additional_notes": "string or null"
  }},
  "primary_assessment": {{
    "airway_additional_notes": "string or null",
    "breathing_additional_notes": "string or null",
    "circulation_additional_notes": "string or null",
    "disability_additional_notes": "string or null",
    "exposure_additional_notes": "string or null"
  }}
}}

CRITICAL RULES:
- Ignore repeated/garbage words completely
- Extract ONLY explicitly mentioned values
- Use null for missing data
- Return ONLY the JSON object, no other text"""

        # Use LlmChat for extraction
        import json
        
        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"case_extraction_{current_user.id}",
            system_message="You are a medical case sheet AI. Clean transcripts, extract structured data, return valid JSON."
        )
        
        llm = llm.with_model(provider="openai", model="gpt-4o-mini")
        response_text = await llm.send_message(UserMessage(text=extraction_prompt))
        
        # Parse JSON
        extracted_data = json.loads(response_text)
        
        # Auto-calculate ABCDE and Red Flags
        abcde_data = {}
        red_flags = []
        
        if 'vitals' in extracted_data and extracted_data['vitals']:
            vitals = extracted_data['vitals']
            
            # Calculate GCS total
            gcs_total = 0
            if vitals.get('gcs_e'): gcs_total += vitals['gcs_e']
            if vitals.get('gcs_v'): gcs_total += vitals['gcs_v']
            if vitals.get('gcs_m'): gcs_total += vitals['gcs_m']
            
            # AIRWAY
            if gcs_total > 0 and gcs_total <= 8:
                abcde_data['airway_status'] = 'Threatened'
                red_flags.append(f'🚨 CRITICAL: GCS {gcs_total} - Consider airway protection')
            
            # BREATHING
            rr = vitals.get('rr')
            spo2 = vitals.get('spo2')
            
            if rr and (rr < 10 or rr > 30):
                if rr < 10:
                    red_flags.append(f'🚨 CRITICAL: Bradypnea (RR {rr})')
                else:
                    red_flags.append(f'⚠️ Tachypnea (RR {rr})')
            
            if spo2 and spo2 < 90:
                if spo2 < 85:
                    red_flags.append(f'🚨 CRITICAL: Severe hypoxia (SpO2 {spo2}%)')
                else:
                    red_flags.append(f'⚠️ Hypoxia (SpO2 {spo2}%)')
            
            # CIRCULATION
            bp_sys = vitals.get('bp_systolic')
            hr = vitals.get('hr')
            
            if bp_sys and bp_sys < 90:
                red_flags.append(f'🚨 CRITICAL: Hypotension (SBP {bp_sys})')
            
            if hr and hr < 40:
                red_flags.append(f'🚨 CRITICAL: Severe Bradycardia (HR {hr})')
            elif hr and hr > 130:
                red_flags.append(f'⚠️ Tachycardia (HR {hr})')
            
            # DISABILITY
            if gcs_total > 0 and gcs_total < 13:
                red_flags.append(f'⚠️ Altered mental status (GCS {gcs_total})')
            
            # EXPOSURE
            temp = vitals.get('temperature')
            if temp and temp > 38.5:
                red_flags.append(f'⚠️ Fever ({temp}°C) - Consider sepsis')
        
        # Add ABCDE to primary assessment
        if abcde_data and 'primary_assessment' not in extracted_data:
            extracted_data['primary_assessment'] = {}
        
        if abcde_data:
            extracted_data['primary_assessment'].update(abcde_data)
        
        if red_flags:
            extracted_data['red_flags'] = red_flags
        
        return {
            "success": True,
            "data": extracted_data,
            "red_flags": red_flags
        }
        
    except Exception as e:
        logging.error(f"Case data extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@api_router.post("/cases/{case_id}/addendum")
async def add_addendum(case_id: str, request: AddendumRequest, current_user: UserResponse = Depends(get_current_user)):
    """Add an addendum note to a locked case"""
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Only allow addendums on locked cases
    if not case.get('is_locked', False):
        raise HTTPException(status_code=400, detail="Addendums can only be added to locked cases. Please lock the case first.")
    
    # Create addendum with IST timestamp
    ist = timezone(timedelta(hours=5, minutes=30))
    addendum = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(ist).isoformat(),
        "added_by_user_id": current_user.id,
        "added_by_name": current_user.name,
        "note": request.note
    }
    
    # Add to addendums array
    await db.cases.update_one(
        {"id": case_id},
        {"$push": {"addendums": addendum}}
    )
    
    return {
        "message": "Addendum added successfully",
        "addendum": addendum
    }

@api_router.get("/cases/{case_id}/addendums")
async def get_addendums(case_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Get all addendums for a case"""
    case = await db.cases.find_one({"id": case_id}, {"addendums": 1, "_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return {"addendums": case.get("addendums", [])}

# Save to EMR endpoints
@api_router.post("/save-to-emr")
async def save_to_emr(case_sheet_id: str, save_type: str = "final", save_date: Optional[str] = None, notes: str = "", current_user: UserResponse = Depends(get_current_user)):
    """Save case to EMR with timestamp"""
    
    # Check if case exists
    case = await db.cases.find_one({"id": case_sheet_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Use provided date or current time
    if save_date:
        try:
            saved_at = datetime.fromisoformat(save_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        saved_at = datetime.now(timezone.utc)
    
    save_record = SaveToEMR(
        case_sheet_id=case_sheet_id,
        saved_at=saved_at,
        saved_by=current_user.name,
        save_type=save_type,
        notes=notes
    )
    
    doc = save_record.model_dump()
    doc['saved_at'] = doc['saved_at'].isoformat()
    
    await db.emr_saves.insert_one(doc)
    
    # Update case status
    await db.cases.update_one(
        {"id": case_sheet_id},
        {"$set": {"status": "completed" if save_type == "final" else "draft"}}
    )
    
    return {
        "message": "Case saved to EMR successfully",
        "save_id": save_record.id,
        "saved_at": doc['saved_at'],
        "save_type": save_type
    }

@api_router.get("/save-history/{case_sheet_id}")
async def get_save_history(case_sheet_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Get save history for a case"""
    saves = await db.emr_saves.find({"case_sheet_id": case_sheet_id}, {"_id": 0}).sort("saved_at", -1).to_list(100)
    
    for save in saves:
        if isinstance(save['saved_at'], str):
            save['saved_at'] = datetime.fromisoformat(save['saved_at'])
    
    return saves

# Include API router
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Health check endpoint (outside /api prefix)
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "ER-EMR Backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ER-EMR Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()