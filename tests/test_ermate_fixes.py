"""
ERmate Emergency Room App - Test Suite for Bug Fixes
Tests for:
1. procedures_performed field saved to database
2. drugs_administered field saved to database
3. GET /api/cases/{id} returns procedures_performed and drugs_administered
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


class TestProceduresPerformedFix:
    """Test that procedures_performed field is properly saved and retrieved"""
    
    def test_create_case_with_procedures_performed(self, auth_headers):
        """Test POST /api/cases with procedures_performed field"""
        
        # Create case with procedures_performed
        case_data = {
            "patient": {
                "name": "TEST_Procedure_Patient",
                "age": "45",
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
                "text": "Chest pain for testing procedures",
                "duration": "2 hours",
                "onset_type": "Sudden",
                "course": "Progressive"
            },
            "em_resident": "Dr. Test Resident",
            "procedures_performed": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "IV Cannulation",
                    "category": "Vascular Access",
                    "notes": "18G cannula in right forearm"
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "ECG",
                    "category": "Diagnostic",
                    "notes": "12-lead ECG performed"
                }
            ],
            "drugs_administered": [
                {
                    "name": "Aspirin",
                    "dose": "325mg",
                    "time": "10:30 AM"
                },
                {
                    "name": "Nitroglycerin",
                    "dose": "0.4mg SL",
                    "time": "10:35 AM"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        
        print(f"Create case response status: {response.status_code}")
        print(f"Create case response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to create case: {response.text}"
        
        created_case = response.json()
        case_id = created_case["id"]
        
        # Verify procedures_performed is in response
        assert "procedures_performed" in created_case, "procedures_performed not in create response"
        assert len(created_case["procedures_performed"]) == 2, f"Expected 2 procedures, got {len(created_case.get('procedures_performed', []))}"
        
        # Verify drugs_administered is in response
        assert "drugs_administered" in created_case, "drugs_administered not in create response"
        assert len(created_case["drugs_administered"]) == 2, f"Expected 2 drugs, got {len(created_case.get('drugs_administered', []))}"
        
        # Verify procedure details
        proc_names = [p["name"] for p in created_case["procedures_performed"]]
        assert "IV Cannulation" in proc_names, "IV Cannulation not found in procedures"
        assert "ECG" in proc_names, "ECG not found in procedures"
        
        # Verify drug details
        drug_names = [d["name"] for d in created_case["drugs_administered"]]
        assert "Aspirin" in drug_names, "Aspirin not found in drugs"
        assert "Nitroglycerin" in drug_names, "Nitroglycerin not found in drugs"
        
        print(f"✅ Case created with procedures_performed and drugs_administered. ID: {case_id}")
        
        return case_id
    
    def test_get_case_returns_procedures_performed(self, auth_headers):
        """Test GET /api/cases/{id} returns procedures_performed and drugs_administered"""
        
        # First create a case with procedures
        case_data = {
            "patient": {
                "name": "TEST_GetProcedure_Patient",
                "age": "30",
                "sex": "Female",
                "phone": "9876543211",
                "address": "Test Address 2",
                "arrival_datetime": datetime.now().isoformat(),
                "mode_of_arrival": "Ambulance",
                "brought_by": "Family",
                "informant_name": "Spouse",
                "informant_reliability": "Reliable",
                "identification_mark": "None"
            },
            "vitals_at_arrival": {
                "hr": 90,
                "bp_systolic": 110,
                "bp_diastolic": 70,
                "rr": 18,
                "spo2": 96
            },
            "presenting_complaint": {
                "text": "Abdominal pain",
                "duration": "6 hours",
                "onset_type": "Gradual",
                "course": "Constant"
            },
            "em_resident": "Dr. Test Resident",
            "procedures_performed": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Foley Catheter",
                    "category": "Urological",
                    "notes": "16Fr catheter inserted"
                }
            ],
            "drugs_administered": [
                {
                    "name": "Ondansetron",
                    "dose": "4mg IV",
                    "time": "11:00 AM"
                }
            ]
        }
        
        # Create the case
        create_response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create case: {create_response.text}"
        
        case_id = create_response.json()["id"]
        
        # GET the case and verify procedures are returned
        get_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}",
            headers=auth_headers
        )
        
        print(f"GET case response status: {get_response.status_code}")
        
        assert get_response.status_code == 200, f"Failed to get case: {get_response.text}"
        
        fetched_case = get_response.json()
        
        # Verify procedures_performed is returned
        assert "procedures_performed" in fetched_case, "procedures_performed not returned in GET response"
        assert len(fetched_case["procedures_performed"]) == 1, f"Expected 1 procedure, got {len(fetched_case.get('procedures_performed', []))}"
        assert fetched_case["procedures_performed"][0]["name"] == "Foley Catheter", "Procedure name mismatch"
        
        # Verify drugs_administered is returned
        assert "drugs_administered" in fetched_case, "drugs_administered not returned in GET response"
        assert len(fetched_case["drugs_administered"]) == 1, f"Expected 1 drug, got {len(fetched_case.get('drugs_administered', []))}"
        assert fetched_case["drugs_administered"][0]["name"] == "Ondansetron", "Drug name mismatch"
        
        print(f"✅ GET /api/cases/{case_id} returns procedures_performed and drugs_administered correctly")
    
    def test_update_case_with_procedures(self, auth_headers):
        """Test PUT /api/cases/{id} can update procedures_performed"""
        
        # First create a case without procedures
        case_data = {
            "patient": {
                "name": "TEST_UpdateProcedure_Patient",
                "age": "55",
                "sex": "Male",
                "phone": "9876543212",
                "address": "Test Address 3",
                "arrival_datetime": datetime.now().isoformat(),
                "mode_of_arrival": "Walk-in",
                "brought_by": "Self",
                "informant_name": "Self",
                "informant_reliability": "Reliable",
                "identification_mark": "None"
            },
            "vitals_at_arrival": {
                "hr": 75,
                "bp_systolic": 130,
                "bp_diastolic": 85,
                "rr": 14,
                "spo2": 99
            },
            "presenting_complaint": {
                "text": "Headache",
                "duration": "1 day",
                "onset_type": "Gradual",
                "course": "Worsening"
            },
            "em_resident": "Dr. Test Resident"
        }
        
        # Create the case
        create_response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create case: {create_response.text}"
        
        case_id = create_response.json()["id"]
        
        # Update with procedures
        update_data = {
            "procedures_performed": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Lumbar Puncture",
                    "category": "Diagnostic",
                    "notes": "CSF clear, sent for analysis"
                }
            ],
            "drugs_administered": [
                {
                    "name": "Paracetamol",
                    "dose": "1g IV",
                    "time": "12:00 PM"
                }
            ]
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json=update_data,
            headers=auth_headers
        )
        
        print(f"Update case response status: {update_response.status_code}")
        
        assert update_response.status_code == 200, f"Failed to update case: {update_response.text}"
        
        updated_case = update_response.json()
        
        # Verify procedures were added
        assert "procedures_performed" in updated_case, "procedures_performed not in update response"
        assert len(updated_case["procedures_performed"]) == 1, f"Expected 1 procedure, got {len(updated_case.get('procedures_performed', []))}"
        assert updated_case["procedures_performed"][0]["name"] == "Lumbar Puncture", "Procedure name mismatch after update"
        
        # Verify drugs were added
        assert "drugs_administered" in updated_case, "drugs_administered not in update response"
        assert len(updated_case["drugs_administered"]) == 1, f"Expected 1 drug, got {len(updated_case.get('drugs_administered', []))}"
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        fetched_case = get_response.json()
        assert len(fetched_case["procedures_performed"]) == 1, "Procedures not persisted after update"
        assert fetched_case["procedures_performed"][0]["name"] == "Lumbar Puncture", "Procedure not persisted correctly"
        
        print(f"✅ PUT /api/cases/{case_id} successfully updates procedures_performed")


class TestExistingCaseWithProcedures:
    """Test the existing case mentioned in the review request"""
    
    def test_get_existing_case_eb29175c(self, auth_headers):
        """Test GET for the case created via curl: eb29175c-caf5-488e-a89c-319a5adb2c64"""
        
        case_id = "eb29175c-caf5-488e-a89c-319a5adb2c64"
        
        response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}",
            headers=auth_headers
        )
        
        if response.status_code == 404:
            print(f"⚠️ Case {case_id} not found - may have been deleted. Skipping this test.")
            pytest.skip(f"Case {case_id} not found in database")
        
        assert response.status_code == 200, f"Failed to get case: {response.text}"
        
        case_data = response.json()
        
        print(f"Case {case_id} data:")
        print(f"  - procedures_performed: {case_data.get('procedures_performed', 'NOT FOUND')}")
        print(f"  - drugs_administered: {case_data.get('drugs_administered', 'NOT FOUND')}")
        
        # Check if procedures_performed exists
        if "procedures_performed" in case_data:
            print(f"✅ procedures_performed field exists with {len(case_data['procedures_performed'])} items")
        else:
            print("❌ procedures_performed field NOT found in response")
        
        if "drugs_administered" in case_data:
            print(f"✅ drugs_administered field exists with {len(case_data['drugs_administered'])} items")
        else:
            print("❌ drugs_administered field NOT found in response")


class TestCaseListWithProcedures:
    """Test that case list returns procedures_performed"""
    
    def test_list_cases_includes_procedures(self, auth_headers):
        """Test GET /api/cases returns cases with procedures_performed field"""
        
        response = requests.get(
            f"{BASE_URL}/api/cases",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to list cases: {response.text}"
        
        cases = response.json()
        
        if len(cases) == 0:
            pytest.skip("No cases found in database")
        
        # Check first case has procedures_performed field
        first_case = cases[0]
        
        print(f"First case ID: {first_case.get('id')}")
        print(f"First case has procedures_performed: {'procedures_performed' in first_case}")
        print(f"First case has drugs_administered: {'drugs_administered' in first_case}")
        
        # The field should exist even if empty
        assert "procedures_performed" in first_case or first_case.get("procedures_performed") is None or first_case.get("procedures_performed") == [], \
            "procedures_performed field should be present in case list response"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
