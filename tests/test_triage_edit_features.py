"""
Test suite for ErMate new features:
1. Triage analyze endpoint - POST /api/triage/analyze (Priority I-V based on vitals)
2. Case edit status endpoint - GET /api/cases/{case_id}/edit-status
3. Case update with edit count increment - PUT /api/cases/{case_id}
4. Login and authentication flow - POST /api/auth/login
"""

import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "Test123!"


class TestAuthentication:
    """Test authentication flow - POST /api/auth/login"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == TEST_EMAIL
        assert "subscription_tier" in data["user"]
        print(f"✓ Login successful for {TEST_EMAIL}")
        print(f"  - User ID: {data['user']['id']}")
        print(f"  - Subscription tier: {data['user']['subscription_tier']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")


class TestTriageAnalyze:
    """Test triage analyze endpoint - POST /api/triage/analyze"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_triage_priority_red_spo2_critical(self):
        """Test Priority I (RED) for SpO2 < 90 - severe hypoxia"""
        payload = {
            "age": 45,
            "age_unit": "years",
            "hr": 100,
            "rr": 20,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "spo2": 85,  # Critical - should trigger RED
            "temperature": 37.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "RED", f"Expected RED priority for SpO2 85%, got {data['priority']}"
        assert data["priority_level"] == 1, f"Expected priority_level 1, got {data['priority_level']}"
        assert data["priority_color"] == "red"
        assert "hypoxia" in data["comment"].lower() or "spo" in data["comment"].lower()
        print(f"✓ SpO2 85% correctly identified as Priority I (RED)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_priority_red_gcs_critical(self):
        """Test Priority I (RED) for GCS <= 8 - coma"""
        payload = {
            "age": 55,
            "age_unit": "years",
            "hr": 90,
            "rr": 18,
            "bp_systolic": 110,
            "bp_diastolic": 70,
            "spo2": 96,
            "gcs_e": 2,  # Eye
            "gcs_v": 2,  # Verbal
            "gcs_m": 3   # Motor - Total GCS = 7 (critical)
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "RED", f"Expected RED priority for GCS 7, got {data['priority']}"
        assert data["priority_level"] == 1
        assert "gcs" in data["comment"].lower() or "coma" in data["comment"].lower()
        print(f"✓ GCS 7 correctly identified as Priority I (RED)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_priority_red_bp_critical(self):
        """Test Priority I (RED) for BP systolic < 80 - shock range"""
        payload = {
            "age": 60,
            "age_unit": "years",
            "hr": 120,
            "rr": 22,
            "bp_systolic": 70,  # Critical - shock range
            "bp_diastolic": 40,
            "spo2": 94
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "RED", f"Expected RED priority for BP 70/40, got {data['priority']}"
        assert data["priority_level"] == 1
        assert "bp" in data["comment"].lower() or "shock" in data["comment"].lower()
        print(f"✓ BP 70/40 correctly identified as Priority I (RED)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_priority_red_rr_critical(self):
        """Test Priority I (RED) for RR < 8 or > 35 - critical respiratory rate"""
        payload = {
            "age": 40,
            "age_unit": "years",
            "hr": 100,
            "rr": 6,  # Critical - too low
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "spo2": 95
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "RED", f"Expected RED priority for RR 6, got {data['priority']}"
        assert data["priority_level"] == 1
        print(f"✓ RR 6/min correctly identified as Priority I (RED)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_priority_orange_moderate_hypoxia(self):
        """Test Priority II (ORANGE) for SpO2 90-92 - moderate hypoxia"""
        payload = {
            "age": 50,
            "age_unit": "years",
            "hr": 95,
            "rr": 20,
            "bp_systolic": 115,
            "bp_diastolic": 75,
            "spo2": 91  # Moderate hypoxia - should trigger ORANGE
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "ORANGE", f"Expected ORANGE priority for SpO2 91%, got {data['priority']}"
        assert data["priority_level"] == 2
        print(f"✓ SpO2 91% correctly identified as Priority II (ORANGE)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_priority_yellow_mild_hypoxia(self):
        """Test Priority III (YELLOW) for SpO2 92-94 - mild hypoxia"""
        payload = {
            "age": 45,
            "age_unit": "years",
            "hr": 85,
            "rr": 18,
            "bp_systolic": 125,
            "bp_diastolic": 80,
            "spo2": 93  # Mild hypoxia - should trigger YELLOW
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "YELLOW", f"Expected YELLOW priority for SpO2 93%, got {data['priority']}"
        assert data["priority_level"] == 3
        print(f"✓ SpO2 93% correctly identified as Priority III (YELLOW)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_priority_green_stable_vitals(self):
        """Test Priority IV (GREEN) for stable vitals"""
        payload = {
            "age": 35,
            "age_unit": "years",
            "hr": 75,
            "rr": 16,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "spo2": 98,
            "temperature": 36.8
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "GREEN", f"Expected GREEN priority for stable vitals, got {data['priority']}"
        assert data["priority_level"] == 4
        print(f"✓ Stable vitals correctly identified as Priority IV (GREEN)")
        print(f"  - Comment: {data['comment']}")
    
    def test_triage_pediatric_age_detection(self):
        """Test pediatric age group detection for age < 14 years"""
        payload = {
            "age": 8,
            "age_unit": "years",
            "hr": 100,
            "rr": 22,
            "bp_systolic": 100,
            "bp_diastolic": 65,
            "spo2": 97
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["age_group"] == "pediatric", f"Expected pediatric age group for 8 years, got {data['age_group']}"
        print(f"✓ 8-year-old correctly identified as pediatric")
    
    def test_triage_adult_age_detection(self):
        """Test adult age group detection for age >= 14 years"""
        payload = {
            "age": 25,
            "age_unit": "years",
            "hr": 80,
            "rr": 16,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "spo2": 98
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Triage analyze failed: {response.text}"
        
        data = response.json()
        assert data["age_group"] == "adult", f"Expected adult age group for 25 years, got {data['age_group']}"
        print(f"✓ 25-year-old correctly identified as adult")


class TestCaseEditStatus:
    """Test case edit status endpoint - GET /api/cases/{case_id}/edit-status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and create a test case"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            self.user = response.json()["user"]
        else:
            pytest.skip("Authentication failed")
    
    def test_edit_status_new_case(self):
        """Test edit status for a newly created case (edit_count=0)"""
        # First create a test case
        case_payload = {
            "patient": {
                "name": "TEST_EditStatus_Patient",
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
                "text": "Test complaint for edit status",
                "duration": "2 hours",
                "onset_type": "Sudden",
                "course": "Progressive"
            },
            "em_resident": "Dr. Test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_payload,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Case creation failed: {create_response.text}"
        case_id = create_response.json()["id"]
        
        # Now check edit status
        status_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}/edit-status",
            headers=self.headers
        )
        
        assert status_response.status_code == 200, f"Edit status failed: {status_response.text}"
        
        data = status_response.json()
        assert data["case_id"] == case_id
        assert data["edit_count"] == 0, f"Expected edit_count 0 for new case, got {data['edit_count']}"
        assert data["can_edit"] == True, "New case should be editable"
        assert "edits_remaining" in data
        assert "free_edit_limit" in data
        assert data["free_edit_limit"] == 2
        assert data["upgrade_required"] == False
        
        print(f"✓ Edit status for new case correct")
        print(f"  - edit_count: {data['edit_count']}")
        print(f"  - edits_remaining: {data['edits_remaining']}")
        print(f"  - can_edit: {data['can_edit']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=self.headers)
    
    def test_edit_status_not_found(self):
        """Test edit status for non-existent case returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/cases/non-existent-case-id/edit-status",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent case correctly returns 404")


class TestCaseUpdateEditCount:
    """Test case update with edit count increment - PUT /api/cases/{case_id}"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            self.user = response.json()["user"]
        else:
            pytest.skip("Authentication failed")
    
    def test_edit_count_increments_on_update(self):
        """Test that edit_count increments when case is updated"""
        # Create a test case
        case_payload = {
            "patient": {
                "name": "TEST_EditCount_Patient",
                "age": "50",
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
                "hr": 85,
                "bp_systolic": 130,
                "bp_diastolic": 85,
                "rr": 18,
                "spo2": 97
            },
            "presenting_complaint": {
                "text": "Test complaint for edit count",
                "duration": "1 day",
                "onset_type": "Gradual",
                "course": "Static"
            },
            "em_resident": "Dr. Test2"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_payload,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Case creation failed: {create_response.text}"
        case_id = create_response.json()["id"]
        
        # Check initial edit status
        status_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}/edit-status",
            headers=self.headers
        )
        initial_edit_count = status_response.json()["edit_count"]
        assert initial_edit_count == 0, f"Initial edit_count should be 0, got {initial_edit_count}"
        
        # Update the case
        update_payload = {
            "em_consultant": "Dr. Consultant Test"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json=update_payload,
            headers=self.headers
        )
        
        assert update_response.status_code == 200, f"Case update failed: {update_response.text}"
        
        # Check edit status after update
        status_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}/edit-status",
            headers=self.headers
        )
        
        new_edit_count = status_response.json()["edit_count"]
        assert new_edit_count == 1, f"Edit count should be 1 after first update, got {new_edit_count}"
        
        print(f"✓ Edit count correctly incremented from 0 to 1")
        
        # Update again
        update_payload2 = {
            "em_resident": "Dr. Test Updated"
        }
        
        update_response2 = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json=update_payload2,
            headers=self.headers
        )
        
        assert update_response2.status_code == 200, f"Second update failed: {update_response2.text}"
        
        # Check edit status after second update
        status_response2 = requests.get(
            f"{BASE_URL}/api/cases/{case_id}/edit-status",
            headers=self.headers
        )
        
        final_edit_count = status_response2.json()["edit_count"]
        assert final_edit_count == 2, f"Edit count should be 2 after second update, got {final_edit_count}"
        
        print(f"✓ Edit count correctly incremented from 1 to 2")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=self.headers)
    
    def test_free_user_edit_limit_enforcement(self):
        """Test that free users are blocked after 2 edits"""
        # Skip if user is not on free tier
        if self.user.get("subscription_tier") != "free":
            pytest.skip("Test requires free tier user")
        
        # Create a test case
        case_payload = {
            "patient": {
                "name": "TEST_EditLimit_Patient",
                "age": "30",
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
                "bp_systolic": 115,
                "bp_diastolic": 75,
                "rr": 14,
                "spo2": 99
            },
            "presenting_complaint": {
                "text": "Test complaint for edit limit",
                "duration": "30 minutes",
                "onset_type": "Sudden",
                "course": "Static"
            },
            "em_resident": "Dr. Test3"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/cases",
            json=case_payload,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Case creation failed: {create_response.text}"
        case_id = create_response.json()["id"]
        
        # First edit (should succeed)
        update1 = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json={"em_consultant": "Dr. A"},
            headers=self.headers
        )
        assert update1.status_code == 200, "First edit should succeed"
        print("✓ First edit succeeded (edit_count now 1)")
        
        # Second edit (should succeed)
        update2 = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json={"em_consultant": "Dr. B"},
            headers=self.headers
        )
        assert update2.status_code == 200, "Second edit should succeed"
        print("✓ Second edit succeeded (edit_count now 2)")
        
        # Third edit (should fail for free users)
        update3 = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json={"em_consultant": "Dr. C"},
            headers=self.headers
        )
        
        assert update3.status_code == 403, f"Third edit should be blocked with 403, got {update3.status_code}"
        
        error_data = update3.json()
        assert "detail" in error_data
        if isinstance(error_data["detail"], dict):
            assert error_data["detail"].get("upgrade_required") == True
            assert error_data["detail"].get("error") == "edit_limit_reached"
        
        print("✓ Third edit correctly blocked with 403 (edit limit reached)")
        
        # Check edit status shows upgrade_required
        status_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}/edit-status",
            headers=self.headers
        )
        
        status_data = status_response.json()
        assert status_data["can_edit"] == False
        assert status_data["upgrade_required"] == True
        assert status_data["edits_remaining"] == 0
        
        print("✓ Edit status correctly shows upgrade_required=True")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=self.headers)


class TestTriageResponseStructure:
    """Test triage response structure and fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_triage_response_has_all_required_fields(self):
        """Test that triage response contains all required fields"""
        payload = {
            "age": 40,
            "age_unit": "years",
            "hr": 80,
            "rr": 16,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "spo2": 98
        }
        
        response = requests.post(
            f"{BASE_URL}/api/triage/analyze",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all required fields
        required_fields = [
            "age_group",
            "priority",
            "priority_color",
            "priority_level",
            "priority_name",
            "time_to_see",
            "comment",
            "vitals"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate field types
        assert isinstance(data["priority_level"], int)
        assert data["priority_level"] in [1, 2, 3, 4, 5]
        assert data["priority_color"] in ["red", "orange", "yellow", "green", "blue"]
        assert data["priority"] in ["RED", "ORANGE", "YELLOW", "GREEN", "BLUE"]
        assert data["age_group"] in ["adult", "pediatric"]
        
        print("✓ Triage response contains all required fields with correct types")
        print(f"  - Fields: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
