"""
ERmate - Test Suite for Examination Field Type Validation
Tests for the Save Case Sheet feature fix - data type mismatches

Issue: Backend rejects payloads because:
1. Boolean fields (general_pallor, general_icterus, general_clubbing, general_lymphadenopathy) 
   receive strings like 'Absent' instead of booleans
2. cvs_pulse_rate receives empty string instead of null/integer
3. cvs_precordial_heave receives boolean instead of string

This test verifies the backend accepts correct types after the mobile app fix.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


def create_base_case_data():
    """Create base case data with required fields"""
    return {
        "patient": {
            "name": f"TEST_TypeValidation_{uuid.uuid4().hex[:8]}",
            "age": "35",
            "sex": "Male",
            "phone": "9876543210",
            "address": "Test Address",
            "arrival_datetime": datetime.now().isoformat(),
            "mode_of_arrival": "Walk-in",
            "brought_by": "Self",
            "informant_name": "Self",
            "informant_reliability": "Reliable",
            "identification_mark": "None"
        },
        "vitals_at_arrival": {
            "hr": 80,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "rr": 16,
            "spo2": 98,
            "temperature": 37.0
        },
        "presenting_complaint": {
            "text": "Test complaint for type validation",
            "duration": "2 hours",
            "onset_type": "Sudden",
            "course": "Progressive"
        },
        "em_resident": "Dr. Test Resident"
    }


class TestExaminationBooleanFields:
    """Test that boolean fields accept true/false values correctly"""
    
    def test_boolean_fields_as_false(self, auth_headers):
        """Test POST /api/cases with boolean examination fields set to false"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": False,
            "general_icterus": False,
            "general_clubbing": False,
            "general_lymphadenopathy": False,
            "general_thyroid": "Normal",
            "general_varicose_veins": False,
            "cvs_status": "Normal",
            "cvs_pulse_rate": None,
            "cvs_precordial_heave": "Normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Failed to create case with boolean=false: {response.text}"
        
        created_case = response.json()
        exam = created_case.get("examination", {})
        
        # Verify boolean fields are correctly stored as false
        assert exam.get("general_pallor") == False, f"general_pallor should be False, got {exam.get('general_pallor')}"
        assert exam.get("general_icterus") == False, f"general_icterus should be False, got {exam.get('general_icterus')}"
        assert exam.get("general_clubbing") == False, f"general_clubbing should be False, got {exam.get('general_clubbing')}"
        assert exam.get("general_lymphadenopathy") == False, f"general_lymphadenopathy should be False, got {exam.get('general_lymphadenopathy')}"
        
        print(f"✅ Boolean fields (false) accepted correctly. Case ID: {created_case['id']}")
        return created_case['id']
    
    def test_boolean_fields_as_true(self, auth_headers):
        """Test POST /api/cases with boolean examination fields set to true"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": True,
            "general_icterus": True,
            "general_clubbing": True,
            "general_lymphadenopathy": True,
            "general_thyroid": "Enlarged",
            "general_varicose_veins": True,
            "cvs_status": "Abnormal",
            "cvs_pulse_rate": 72,
            "cvs_precordial_heave": "Present"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Failed to create case with boolean=true: {response.text}"
        
        created_case = response.json()
        exam = created_case.get("examination", {})
        
        # Verify boolean fields are correctly stored as true
        assert exam.get("general_pallor") == True, f"general_pallor should be True, got {exam.get('general_pallor')}"
        assert exam.get("general_icterus") == True, f"general_icterus should be True, got {exam.get('general_icterus')}"
        assert exam.get("general_clubbing") == True, f"general_clubbing should be True, got {exam.get('general_clubbing')}"
        assert exam.get("general_lymphadenopathy") == True, f"general_lymphadenopathy should be True, got {exam.get('general_lymphadenopathy')}"
        
        print(f"✅ Boolean fields (true) accepted correctly. Case ID: {created_case['id']}")
        return created_case['id']


class TestCvsPulseRateField:
    """Test cvs_pulse_rate field accepts integer and null values"""
    
    def test_cvs_pulse_rate_as_integer(self, auth_headers):
        """Test POST /api/cases with cvs_pulse_rate as integer"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": False,
            "general_icterus": False,
            "general_clubbing": False,
            "general_lymphadenopathy": False,
            "cvs_status": "Normal",
            "cvs_pulse_rate": 72,  # Integer value
            "cvs_precordial_heave": "Normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Failed to create case with cvs_pulse_rate=72: {response.text}"
        
        created_case = response.json()
        exam = created_case.get("examination", {})
        
        assert exam.get("cvs_pulse_rate") == 72, f"cvs_pulse_rate should be 72, got {exam.get('cvs_pulse_rate')}"
        
        print(f"✅ cvs_pulse_rate=72 (integer) accepted correctly. Case ID: {created_case['id']}")
        return created_case['id']
    
    def test_cvs_pulse_rate_as_null(self, auth_headers):
        """Test POST /api/cases with cvs_pulse_rate as null"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": False,
            "general_icterus": False,
            "general_clubbing": False,
            "general_lymphadenopathy": False,
            "cvs_status": "Normal",
            "cvs_pulse_rate": None,  # Null value
            "cvs_precordial_heave": "Normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Failed to create case with cvs_pulse_rate=null: {response.text}"
        
        created_case = response.json()
        exam = created_case.get("examination", {})
        
        assert exam.get("cvs_pulse_rate") is None, f"cvs_pulse_rate should be None, got {exam.get('cvs_pulse_rate')}"
        
        print(f"✅ cvs_pulse_rate=null accepted correctly. Case ID: {created_case['id']}")
        return created_case['id']
    
    def test_cvs_pulse_rate_various_integers(self, auth_headers):
        """Test cvs_pulse_rate with various integer values"""
        
        test_values = [60, 80, 100, 120, 150]
        
        for pulse_rate in test_values:
            case_data = create_base_case_data()
            case_data["examination"] = {
                "general_pallor": False,
                "cvs_pulse_rate": pulse_rate,
                "cvs_precordial_heave": "Normal"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/cases",
                json=case_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Failed with cvs_pulse_rate={pulse_rate}: {response.text}"
            
            created_case = response.json()
            exam = created_case.get("examination", {})
            assert exam.get("cvs_pulse_rate") == pulse_rate, f"Expected {pulse_rate}, got {exam.get('cvs_pulse_rate')}"
            
            print(f"✅ cvs_pulse_rate={pulse_rate} accepted")
        
        print(f"✅ All integer values for cvs_pulse_rate accepted correctly")


class TestCvsPrecordialHeaveField:
    """Test cvs_precordial_heave field accepts string values"""
    
    def test_cvs_precordial_heave_as_string(self, auth_headers):
        """Test POST /api/cases with cvs_precordial_heave as string"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": False,
            "general_icterus": False,
            "general_clubbing": False,
            "general_lymphadenopathy": False,
            "cvs_status": "Normal",
            "cvs_pulse_rate": 72,
            "cvs_precordial_heave": "Normal"  # String value
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Failed to create case with cvs_precordial_heave='Normal': {response.text}"
        
        created_case = response.json()
        exam = created_case.get("examination", {})
        
        assert exam.get("cvs_precordial_heave") == "Normal", f"cvs_precordial_heave should be 'Normal', got {exam.get('cvs_precordial_heave')}"
        
        print(f"✅ cvs_precordial_heave='Normal' (string) accepted correctly. Case ID: {created_case['id']}")
        return created_case['id']
    
    def test_cvs_precordial_heave_various_strings(self, auth_headers):
        """Test cvs_precordial_heave with various string values"""
        
        test_values = ["Normal", "Present", "Absent", "Not assessed", ""]
        
        for heave_value in test_values:
            case_data = create_base_case_data()
            case_data["examination"] = {
                "general_pallor": False,
                "cvs_pulse_rate": None,
                "cvs_precordial_heave": heave_value
            }
            
            response = requests.post(
                f"{BASE_URL}/api/cases",
                json=case_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Failed with cvs_precordial_heave='{heave_value}': {response.text}"
            
            created_case = response.json()
            exam = created_case.get("examination", {})
            assert exam.get("cvs_precordial_heave") == heave_value, f"Expected '{heave_value}', got '{exam.get('cvs_precordial_heave')}'"
            
            print(f"✅ cvs_precordial_heave='{heave_value}' accepted")
        
        print(f"✅ All string values for cvs_precordial_heave accepted correctly")


class TestUpdateCaseWithCorrectTypes:
    """Test PUT /api/cases/{id} with correct examination field types"""
    
    def test_update_examination_with_correct_types(self, auth_headers):
        """Test updating a case with correct examination field types"""
        
        # First create a case
        case_data = create_base_case_data()
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create case: {response.text}"
        case_id = response.json()["id"]
        
        # Now update with examination data using correct types
        update_data = {
            "examination": {
                "general_pallor": True,
                "general_icterus": False,
                "general_clubbing": True,
                "general_lymphadenopathy": False,
                "general_thyroid": "Enlarged",
                "general_varicose_veins": False,
                "cvs_status": "Abnormal",
                "cvs_pulse_rate": 88,
                "cvs_precordial_heave": "Present",
                "cvs_s1_s2": "Normal",
                "cvs_murmurs": "None"
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json=update_data,
            headers=auth_headers
        )
        
        print(f"Update response status: {update_response.status_code}")
        if update_response.status_code != 200:
            print(f"Update response body: {update_response.text}")
        
        assert update_response.status_code == 200, f"Failed to update case: {update_response.text}"
        
        updated_case = update_response.json()
        exam = updated_case.get("examination", {})
        
        # Verify all fields
        assert exam.get("general_pallor") == True, "general_pallor should be True"
        assert exam.get("general_icterus") == False, "general_icterus should be False"
        assert exam.get("general_clubbing") == True, "general_clubbing should be True"
        assert exam.get("general_lymphadenopathy") == False, "general_lymphadenopathy should be False"
        assert exam.get("cvs_pulse_rate") == 88, "cvs_pulse_rate should be 88"
        assert exam.get("cvs_precordial_heave") == "Present", "cvs_precordial_heave should be 'Present'"
        
        print(f"✅ PUT /api/cases/{case_id} with correct types succeeded")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        fetched_case = get_response.json()
        fetched_exam = fetched_case.get("examination", {})
        
        assert fetched_exam.get("general_pallor") == True, "Persisted general_pallor should be True"
        assert fetched_exam.get("cvs_pulse_rate") == 88, "Persisted cvs_pulse_rate should be 88"
        assert fetched_exam.get("cvs_precordial_heave") == "Present", "Persisted cvs_precordial_heave should be 'Present'"
        
        print(f"✅ GET /api/cases/{case_id} confirms data persisted correctly")


class TestInvalidTypesRejected:
    """Test that invalid types are properly rejected by the backend"""
    
    def test_string_for_boolean_field_rejected(self, auth_headers):
        """Test that string values for boolean fields are rejected"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": "Absent",  # WRONG: Should be boolean, not string
            "general_icterus": False,
            "general_clubbing": False,
            "general_lymphadenopathy": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status for string boolean: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # This should fail with 422 Unprocessable Entity
        assert response.status_code == 422, f"Expected 422 for string in boolean field, got {response.status_code}"
        
        print(f"✅ String value 'Absent' for boolean field correctly rejected with 422")
    
    def test_empty_string_for_integer_field_rejected(self, auth_headers):
        """Test that empty string for integer field is rejected"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": False,
            "cvs_pulse_rate": "",  # WRONG: Should be integer or null, not empty string
            "cvs_precordial_heave": "Normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status for empty string integer: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # This should fail with 422 Unprocessable Entity
        assert response.status_code == 422, f"Expected 422 for empty string in integer field, got {response.status_code}"
        
        print(f"✅ Empty string for cvs_pulse_rate correctly rejected with 422")
    
    def test_boolean_for_string_field_behavior(self, auth_headers):
        """Test behavior when boolean is sent for string field"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            "general_pallor": False,
            "cvs_pulse_rate": 72,
            "cvs_precordial_heave": True  # WRONG: Should be string, not boolean
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status for boolean in string field: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # Pydantic may coerce boolean to string or reject it
        # Document the actual behavior
        if response.status_code == 422:
            print(f"✅ Boolean value for string field correctly rejected with 422")
        elif response.status_code == 200:
            # Pydantic coerced boolean to string
            created_case = response.json()
            exam = created_case.get("examination", {})
            print(f"⚠️ Boolean was coerced to string: cvs_precordial_heave = '{exam.get('cvs_precordial_heave')}'")


class TestFullExaminationPayload:
    """Test complete examination payload with all fields correctly typed"""
    
    def test_complete_examination_payload(self, auth_headers):
        """Test POST /api/cases with complete examination section"""
        
        case_data = create_base_case_data()
        case_data["examination"] = {
            # General examination - boolean fields
            "general_pallor": False,
            "general_icterus": False,
            "general_clubbing": False,
            "general_lymphadenopathy": False,
            "general_thyroid": "Normal",
            "general_varicose_veins": False,
            "general_notes": "Patient appears well",
            "general_additional_notes": "",
            
            # CVS examination
            "cvs_status": "Normal",
            "cvs_s1_s2": "Normal",
            "cvs_pulse": "Regular",
            "cvs_pulse_rate": 72,  # Integer
            "cvs_apex_beat": "Normal position",
            "cvs_precordial_heave": "Absent",  # String
            "cvs_added_sounds": "None",
            "cvs_murmurs": "None",
            "cvs_additional_notes": "",
            
            # Respiratory examination
            "respiratory_status": "Normal",
            "respiratory_expansion": "Equal bilateral",
            "respiratory_percussion": "Resonant",
            "respiratory_breath_sounds": "Vesicular",
            "respiratory_vocal_resonance": "Normal",
            "respiratory_added_sounds": "None",
            "respiratory_additional_notes": "",
            
            # Abdomen examination
            "abdomen_status": "Normal",
            "abdomen_umbilical": "Normal",
            "abdomen_organomegaly": "None",
            "abdomen_percussion": "Tympanic",
            "abdomen_bowel_sounds": "Present",
            "abdomen_external_genitalia": "Normal",
            "abdomen_hernial_orifices": "Intact",
            "abdomen_per_rectal": "Not done",
            "abdomen_per_vaginal": "Not applicable",
            "abdomen_additional_notes": "",
            
            # CNS examination
            "cns_status": "Normal",
            "cns_higher_mental": "Intact",
            "cns_cranial_nerves": "Intact",
            "cns_sensory_system": "Normal",
            "cns_motor_system": "Normal",
            "cns_reflexes": "Normal",
            "cns_romberg_sign": "Negative",
            "cns_cerebellar_signs": "Absent",
            "cns_additional_notes": "",
            
            # Extremities
            "extremities_status": "Normal",
            "extremities_findings": "No edema",
            "extremities_additional_notes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Failed to create case with complete examination: {response.text}"
        
        created_case = response.json()
        exam = created_case.get("examination", {})
        
        # Verify key fields
        assert exam.get("general_pallor") == False
        assert exam.get("general_icterus") == False
        assert exam.get("general_clubbing") == False
        assert exam.get("general_lymphadenopathy") == False
        assert exam.get("cvs_pulse_rate") == 72
        assert exam.get("cvs_precordial_heave") == "Absent"
        assert exam.get("cvs_status") == "Normal"
        assert exam.get("respiratory_status") == "Normal"
        assert exam.get("abdomen_status") == "Normal"
        assert exam.get("cns_status") == "Normal"
        
        print(f"✅ Complete examination payload accepted. Case ID: {created_case['id']}")
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/cases/{created_case['id']}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        fetched_exam = get_response.json().get("examination", {})
        
        assert fetched_exam.get("general_pallor") == False
        assert fetched_exam.get("cvs_pulse_rate") == 72
        assert fetched_exam.get("cvs_precordial_heave") == "Absent"
        
        print(f"✅ Complete examination data persisted and retrieved correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
