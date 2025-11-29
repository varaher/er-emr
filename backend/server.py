from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str = "resident"  # resident, consultant, admin

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

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
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        
        return UserResponse(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Auth endpoints
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    access_token = create_access_token(data={"sub": user_id})
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        created_at=datetime.fromisoformat(new_user["created_at"])
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

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
async def update_case(case_id: str, case_update: CaseSheetUpdate, current_user: UserResponse = Depends(get_current_user)):
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    update_data = case_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.cases.update_one({"id": case_id}, {"$set": update_data})
    
    updated_case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if isinstance(updated_case['created_at'], str):
        updated_case['created_at'] = datetime.fromisoformat(updated_case['created_at'])
    if isinstance(updated_case['updated_at'], str):
        updated_case['updated_at'] = datetime.fromisoformat(updated_case['updated_at'])
    
    return updated_case

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, current_user: UserResponse = Depends(get_current_user)):
    result = await db.cases.delete_one({"id": case_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case deleted successfully"}

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
    
    prompt = f"""
You are an expert emergency medicine physician assistant. A doctor has recorded a patient encounter in {request.source_language}.

TRANSCRIPT:
{request.transcript}

Your task is to extract structured information from this transcript and map it to the appropriate case sheet fields.

Return ONLY a valid JSON object with the following structure (include only fields that have relevant information from the transcript):

{{
  "history": {{
    "hpi": "extracted history of present illness",
    "signs_and_symptoms": "observed signs and symptoms",
    "past_medical": ["condition1", "condition2"],
    "allergies": ["allergy1", "allergy2"],
    "past_surgical": "surgical history text",
    "drug_history": "current medications"
  }},
  "examination": {{
    "general_notes": "general examination findings",
    "cvs_status": "Normal" or "Abnormal",
    "cvs_s1_s2": "if abnormal",
    "respiratory_status": "Normal" or "Abnormal",
    "abdomen_status": "Normal" or "Abnormal",
    "cns_status": "Normal" or "Abnormal"
  }},
  "presenting_complaint": {{
    "text": "chief complaint",
    "duration": "duration text",
    "onset_type": "sudden/gradual"
  }},
  "primary_assessment": {{
    "airway_notes": "airway assessment notes",
    "breathing_notes": "breathing assessment notes",
    "circulation_notes": "circulation notes"
  }},
  "treatment": {{
    "intervention_notes": "treatments mentioned"
  }}
}}

IMPORTANT:
- Extract only information explicitly mentioned in the transcript
- If a field is not mentioned, omit it from the JSON
- Be accurate and precise
- Convert non-English text to English in the output
- Use medical terminology appropriately
"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"transcript_parse_{request.case_sheet_id}",
            system_message="You are a medical transcription AI. Extract structured data from doctor's notes and return ONLY valid JSON."
        ).with_model("openai", "gpt-5.1")
        
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
        
        return {
            "success": True,
            "parsed_data": parsed_data,
            "message": "Transcript parsed successfully. Review and save the auto-populated fields."
        }
    
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse AI response as JSON: {str(e)}",
            "raw_response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript parsing failed: {str(e)}")

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
        "message": f"Case saved to EMR successfully",
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()