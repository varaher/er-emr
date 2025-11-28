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
    
    breathing_rr: Optional[float] = None
    breathing_spo2: Optional[float] = None
    breathing_oxygen_device: str = ""
    breathing_oxygen_flow: Optional[float] = None
    breathing_work: str = ""
    breathing_air_entry: List[str] = []
    breathing_adjuncts: List[str] = []
    breathing_notes: str = ""
    
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
    
    disability_avpu: str = ""
    disability_gcs_e: Optional[int] = None
    disability_gcs_v: Optional[int] = None
    disability_gcs_m: Optional[int] = None
    disability_pupils_size: str = ""
    disability_pupils_reaction: str = ""
    disability_grbs: Optional[float] = None
    disability_seizure: bool = False
    disability_notes: str = ""
    
    exposure_temperature: Optional[float] = None
    exposure_logroll_findings: List[str] = []
    exposure_local_exam_notes: str = ""

class History(BaseModel):
    hpi: str = ""
    secondary_survey_neuro: List[str] = []
    secondary_survey_resp: List[str] = []
    secondary_survey_cardiac: List[str] = []
    secondary_survey_gi: List[str] = []
    secondary_survey_gu: List[str] = []
    secondary_survey_msk: List[str] = []
    secondary_survey_notes: str = ""
    
    past_medical: List[str] = []
    past_surgical: str = ""
    drug_history: str = ""
    family_history: str = ""
    gyn_history: str = ""
    lmp: str = ""
    allergies: List[str] = []

class Examination(BaseModel):
    general_pallor: bool = False
    general_icterus: bool = False
    general_clubbing: bool = False
    general_lymphadenopathy: bool = False
    general_thyroid: str = ""
    general_varicose_veins: bool = False
    general_notes: str = ""
    
    respiratory_summary: str = ""
    cvs_summary: str = ""
    abdomen_summary: str = ""
    cns_summary: str = ""
    extremities_summary: str = ""

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
    em_resident: Optional[str] = None
    em_consultant: Optional[str] = None
    status: Optional[str] = None

class DischargeSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_sheet_id: str
    summary_text: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIGenerateRequest(BaseModel):
    case_sheet_id: str
    prompt_type: str  # discharge_summary, red_flags, diagnosis_suggestions

class AIResponse(BaseModel):
    response: str
    case_sheet_id: str

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
You are an emergency medicine AI assistant. Analyze the following vitals and clinical data for red flags and critical findings.

Vitals:
- HR: {case['vitals_at_arrival'].get('hr', 'N/A')}
- BP: {case['vitals_at_arrival'].get('bp_systolic', 'N/A')}/{case['vitals_at_arrival'].get('bp_diastolic', 'N/A')}
- RR: {case['vitals_at_arrival'].get('rr', 'N/A')}
- SpO2: {case['vitals_at_arrival'].get('spo2', 'N/A')}%
- Temperature: {case['vitals_at_arrival'].get('temperature', 'N/A')}°C
- GCS: E{case['vitals_at_arrival'].get('gcs_e', '-')} V{case['vitals_at_arrival'].get('gcs_v', '-')} M{case['vitals_at_arrival'].get('gcs_m', '-')}

Presenting Complaint:
{case['presenting_complaint']['text']}

Primary Assessment:
- Airway: {case['primary_assessment'].get('airway_status', 'Not documented')}
- Breathing: {case['primary_assessment'].get('breathing_work', 'Not documented')}
- Circulation: {case['primary_assessment'].get('circulation_peripheral_pulses', 'Not documented')}

Identify any red flags, critical findings, or areas requiring immediate attention. Be concise and actionable.
"""
    elif request.prompt_type == "diagnosis_suggestions":
        prompt = f"""
You are an emergency medicine AI assistant. Suggest differential diagnoses based on the following case data.

Presenting Complaint:
{case['presenting_complaint']['text']}
Duration: {case['presenting_complaint']['duration']}

Vitals:
- HR: {case['vitals_at_arrival'].get('hr', 'N/A')}, BP: {case['vitals_at_arrival'].get('bp_systolic', 'N/A')}/{case['vitals_at_arrival'].get('bp_diastolic', 'N/A')}
- RR: {case['vitals_at_arrival'].get('rr', 'N/A')}, SpO2: {case['vitals_at_arrival'].get('spo2', 'N/A')}%
- Temperature: {case['vitals_at_arrival'].get('temperature', 'N/A')}°C

History:
{case['history'].get('hpi', 'Not documented')}

Past Medical History: {', '.join(case['history'].get('past_medical', ['None']))}

Examination Findings:
{case['examination'].get('general_notes', 'Not documented')}

Provide a list of likely differential diagnoses in order of probability, with brief rationale for each.
"""
    else:
        raise HTTPException(status_code=400, detail="Invalid prompt type")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"case_{request.case_sheet_id}_{request.prompt_type}",
            system_message="You are an expert emergency medicine physician assistant."
        ).with_model("openai", "gpt-5.1")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return AIResponse(response=response, case_sheet_id=request.case_sheet_id)
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