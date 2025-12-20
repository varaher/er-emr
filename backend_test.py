import requests
import sys
import json
from datetime import datetime

class EREmrAPITester:
    def __init__(self, base_url="https://er-emr-smart.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.test_user_email = "resident@hospital.com"
        self.test_user_password = "password123"
        self.test_case_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_login(self):
        """Test login with existing user"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_auth_register(self):
        """Test user registration with new email"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@hospital.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Dr. Test User",
                "role": "resident"
            }
        )
        return success

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_case(self):
        """Test case creation"""
        case_data = {
            "patient": {
                "name": "Test Patient",
                "age": "35",
                "sex": "Male",
                "phone": "9876543210",
                "address": "Test Address",
                "arrival_datetime": datetime.now().isoformat(),
                "mode_of_arrival": "Walk-in",
                "brought_by": "Relative",
                "informant_name": "Test Informant",
                "informant_reliability": "Good",
                "identification_mark": "Scar on left hand",
                "mlc": False
            },
            "vitals_at_arrival": {
                "hr": 80,
                "bp_systolic": 120,
                "bp_diastolic": 80,
                "rr": 18,
                "spo2": 98,
                "temperature": 98.6,
                "gcs_e": 4,
                "gcs_v": 5,
                "gcs_m": 6,
                "grbs": 110,
                "pain_score": 3
            },
            "presenting_complaint": {
                "text": "Chest pain for 2 hours",
                "duration": "2 hours",
                "onset_type": "Sudden",
                "course": "Worsening"
            },
            "em_resident": "Dr. Test Resident"
        }
        
        success, response = self.run_test(
            "Create Case",
            "POST",
            "cases",
            200,
            data=case_data
        )
        
        if success and 'id' in response:
            self.test_case_id = response['id']
            print(f"   ✅ Case created with ID: {self.test_case_id}")
            return True
        return False

    def test_get_cases(self):
        """Test get all cases"""
        success, response = self.run_test(
            "Get All Cases",
            "GET",
            "cases",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} cases")
            return True
        return False

    def test_get_case_by_id(self):
        """Test get specific case"""
        if not self.test_case_id:
            self.log_test("Get Case by ID", False, "No test case ID available")
            return False
            
        success, response = self.run_test(
            "Get Case by ID",
            "GET",
            f"cases/{self.test_case_id}",
            200
        )
        return success

    def test_update_case(self):
        """Test case update"""
        if not self.test_case_id:
            self.log_test("Update Case", False, "No test case ID available")
            return False
            
        update_data = {
            "primary_assessment": {
                "airway_status": "Patent",
                "breathing_rr": 20,
                "breathing_spo2": 97,
                "circulation_hr": 85,
                "circulation_bp_systolic": 125,
                "circulation_bp_diastolic": 85,
                "disability_avpu": "A",
                "disability_gcs_e": 4,
                "disability_gcs_v": 5,
                "disability_gcs_m": 6
            },
            "status": "completed"
        }
        
        success, response = self.run_test(
            "Update Case",
            "PUT",
            f"cases/{self.test_case_id}",
            200,
            data=update_data
        )
        return success

    def test_ai_generate_red_flags(self):
        """Test AI red flags generation"""
        if not self.test_case_id:
            self.log_test("AI Red Flags", False, "No test case ID available")
            return False
            
        success, response = self.run_test(
            "AI Generate Red Flags",
            "POST",
            "ai/generate",
            200,
            data={
                "case_sheet_id": self.test_case_id,
                "prompt_type": "red_flags"
            }
        )
        
        if success and 'response' in response:
            print(f"   ✅ AI Response length: {len(response['response'])} characters")
            return True
        return False

    def test_ai_generate_diagnosis(self):
        """Test AI diagnosis suggestions"""
        if not self.test_case_id:
            self.log_test("AI Diagnosis", False, "No test case ID available")
            return False
            
        success, response = self.run_test(
            "AI Generate Diagnosis",
            "POST",
            "ai/generate",
            200,
            data={
                "case_sheet_id": self.test_case_id,
                "prompt_type": "diagnosis_suggestions"
            }
        )
        
        if success and 'response' in response:
            print(f"   ✅ AI Response length: {len(response['response'])} characters")
            return True
        return False

    def test_create_discharge_summary(self):
        """Test discharge summary creation"""
        if not self.test_case_id:
            self.log_test("Create Discharge Summary", False, "No test case ID available")
            return False
            
        success, response = self.run_test(
            "Create Discharge Summary",
            "POST",
            f"discharge-summary?case_sheet_id={self.test_case_id}",
            200
        )
        
        if success and 'summary_text' in response:
            print(f"   ✅ Summary generated, length: {len(response['summary_text'])} characters")
            return True
        return False

    def test_get_discharge_summary(self):
        """Test get discharge summary"""
        if not self.test_case_id:
            self.log_test("Get Discharge Summary", False, "No test case ID available")
            return False
            
        success, response = self.run_test(
            "Get Discharge Summary",
            "GET",
            f"discharge-summary/{self.test_case_id}",
            200
        )
        return success

    def test_existing_case(self):
        """Test with existing case ID from context"""
        existing_case_id = "1b804ae5-9395-4edd-be6f-6b49a8b1e3b8"
        
        success, response = self.run_test(
            "Get Existing Case",
            "GET",
            f"cases/{existing_case_id}",
            200
        )
        
        if success:
            self.test_case_id = existing_case_id
            print(f"   ✅ Using existing case: {existing_case_id}")
            return True
        return False

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting ER-EMR API Test Suite")
        print("=" * 50)
        
        # Test authentication
        print("\n📋 AUTHENTICATION TESTS")
        print("-" * 30)
        
        if not self.test_auth_login():
            print("❌ Login failed, cannot proceed with authenticated tests")
            return False
            
        self.test_auth_me()
        self.test_auth_register()
        
        # Test case management
        print("\n📋 CASE MANAGEMENT TESTS")
        print("-" * 30)
        
        # Try existing case first, then create new one
        if not self.test_existing_case():
            self.test_create_case()
            
        self.test_get_cases()
        self.test_get_case_by_id()
        self.test_update_case()
        
        # Test AI features
        print("\n📋 AI INTEGRATION TESTS")
        print("-" * 30)
        
        self.test_ai_generate_red_flags()
        self.test_ai_generate_diagnosis()
        
        # Test discharge summary
        print("\n📋 DISCHARGE SUMMARY TESTS")
        print("-" * 30)
        
        self.test_create_discharge_summary()
        self.test_get_discharge_summary()
        
        # Print final results
        print("\n" + "=" * 50)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EREmrAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())