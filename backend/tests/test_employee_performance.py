"""
Test suite for Employee Performance feature:
- Owner-only access to performance endpoints
- CRUD operations for performance reviews
- Score calculation and grade assignment
- Admin/Superadmin access restrictions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OWNER_CREDS = {"username": "owner", "password": "owner123"}
ADMIN_CREDS = {"username": "testadmin", "password": "admin123"}


class TestPerformanceOwnerAccess:
    """Test that only Owner can access performance endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get owner token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        assert response.status_code == 200, "Owner login failed"
        self.owner_token = response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        yield
    
    def test_owner_can_access_employees_for_review(self):
        """Owner can get list of employees for performance review"""
        response = requests.get(f"{BASE_URL}/api/performance/employees", headers=self.owner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of employees"
        # Employees should be admin or superadmin roles only
        for emp in data:
            assert emp["role"] in ["admin", "superadmin"], f"Employee role should be admin or superadmin, got {emp['role']}"
    
    def test_owner_can_access_performance_reviews(self):
        """Owner can get list of performance reviews"""
        response = requests.get(f"{BASE_URL}/api/performance/reviews", headers=self.owner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of reviews"
    
    def test_owner_can_access_performance_summary(self):
        """Owner can get performance summary statistics"""
        response = requests.get(f"{BASE_URL}/api/performance/summary", headers=self.owner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_employees" in data, "Summary should contain total_employees"
        assert "total_reviews" in data, "Summary should contain total_reviews"
        assert "employee_stats" in data, "Summary should contain employee_stats"


class TestPerformanceAdminRestriction:
    """Test that Admin cannot access performance endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        # First ensure testadmin exists
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        self.owner_token = owner_response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        
        # Try to login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["token"]
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            # Create testadmin if doesn't exist
            user_data = {
                "username": "testadmin",
                "password": "admin123",
                "name": "Test Admin",
                "role": "admin"
            }
            requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.owner_headers)
            admin_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
            if admin_response.status_code == 200:
                self.admin_token = admin_response.json()["token"]
                self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            else:
                self.admin_token = None
                self.admin_headers = {}
        yield
    
    def test_admin_cannot_access_employees_for_review(self):
        """Admin should NOT be able to access employees for review"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/performance/employees", headers=self.admin_headers)
        assert response.status_code == 403, f"Admin should get 403, got {response.status_code}"
    
    def test_admin_cannot_access_performance_reviews(self):
        """Admin should NOT be able to access performance reviews"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/performance/reviews", headers=self.admin_headers)
        assert response.status_code == 403, f"Admin should get 403, got {response.status_code}"
    
    def test_admin_cannot_access_performance_summary(self):
        """Admin should NOT be able to access performance summary"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/performance/summary", headers=self.admin_headers)
        assert response.status_code == 403, f"Admin should get 403, got {response.status_code}"
    
    def test_admin_cannot_create_performance_review(self):
        """Admin should NOT be able to create performance reviews"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        review_data = {
            "employee_id": "fake-id",
            "employee_name": "Test Employee",
            "review_period": "January 2025",
            "sincerity": 8,
            "target_achievement": 7,
            "personality_improvement": 6,
            "communication": 8,
            "leadership": 7
        }
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.admin_headers)
        assert response.status_code == 403, f"Admin should get 403, got {response.status_code}"


class TestPerformanceSuperadminRestriction:
    """Test that Superadmin cannot access performance endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get superadmin token for authenticated requests"""
        # Get owner token
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        self.owner_token = owner_response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        
        # Create test superadmin
        user_data = {
            "username": "testsuperadmin_perf",
            "password": "super123",
            "name": "Test Superadmin Perf",
            "role": "superadmin"
        }
        requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.owner_headers)
        
        # Login as superadmin
        superadmin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testsuperadmin_perf",
            "password": "super123"
        })
        if superadmin_response.status_code == 200:
            self.superadmin_token = superadmin_response.json()["token"]
            self.superadmin_headers = {"Authorization": f"Bearer {self.superadmin_token}"}
        else:
            self.superadmin_token = None
            self.superadmin_headers = {}
        
        yield
        
        # Cleanup
        try:
            response = requests.get(f"{BASE_URL}/api/users", headers=self.owner_headers)
            if response.status_code == 200:
                users = response.json()
                for user in users:
                    if user["username"] == "testsuperadmin_perf":
                        requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.owner_headers)
        except Exception:
            pass
    
    def test_superadmin_cannot_access_employees_for_review(self):
        """Superadmin should NOT be able to access employees for review"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        response = requests.get(f"{BASE_URL}/api/performance/employees", headers=self.superadmin_headers)
        assert response.status_code == 403, f"Superadmin should get 403, got {response.status_code}"
    
    def test_superadmin_cannot_access_performance_reviews(self):
        """Superadmin should NOT be able to access performance reviews"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        response = requests.get(f"{BASE_URL}/api/performance/reviews", headers=self.superadmin_headers)
        assert response.status_code == 403, f"Superadmin should get 403, got {response.status_code}"
    
    def test_superadmin_cannot_create_performance_review(self):
        """Superadmin should NOT be able to create performance reviews"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        review_data = {
            "employee_id": "fake-id",
            "employee_name": "Test Employee",
            "review_period": "January 2025",
            "sincerity": 8,
            "target_achievement": 7,
            "personality_improvement": 6,
            "communication": 8,
            "leadership": 7
        }
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.superadmin_headers)
        assert response.status_code == 403, f"Superadmin should get 403, got {response.status_code}"


class TestPerformanceReviewCRUD:
    """Test CRUD operations for performance reviews - Owner only"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get owner token and create test employee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        assert response.status_code == 200, "Owner login failed"
        self.owner_token = response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        
        # Create a test employee (admin) for reviews
        user_data = {
            "username": "testemp_perf_crud",
            "password": "emp123",
            "name": "Test Employee CRUD",
            "role": "admin"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.owner_headers)
        if create_response.status_code in [200, 201]:
            self.test_employee = create_response.json()
        else:
            # Employee might already exist, get from list
            users_response = requests.get(f"{BASE_URL}/api/users", headers=self.owner_headers)
            users = users_response.json()
            self.test_employee = next((u for u in users if u["username"] == "testemp_perf_crud"), None)
        
        self.created_review_ids = []
        yield
        
        # Cleanup reviews
        for review_id in self.created_review_ids:
            try:
                requests.delete(f"{BASE_URL}/api/performance/reviews/{review_id}", headers=self.owner_headers)
            except Exception:
                pass
        
        # Cleanup test employee
        if self.test_employee:
            try:
                requests.delete(f"{BASE_URL}/api/users/{self.test_employee['id']}", headers=self.owner_headers)
            except Exception:
                pass
    
    def test_create_performance_review(self):
        """Owner can create a performance review with all 5 criteria"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "January 2025",
            "sincerity": 8,
            "target_achievement": 7,
            "personality_improvement": 6,
            "communication": 9,
            "leadership": 5
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        # Verify all fields
        assert data["employee_id"] == self.test_employee["id"]
        assert data["employee_name"] == self.test_employee["name"]
        assert data["review_period"] == "January 2025"
        assert data["sincerity"] == 8
        assert data["target_achievement"] == 7
        assert data["personality_improvement"] == 6
        assert data["communication"] == 9
        assert data["leadership"] == 5
        
        # Verify calculated fields
        expected_total = 8 + 7 + 6 + 9 + 5  # 35
        expected_average = expected_total / 5  # 7.0
        assert data["total_score"] == expected_total, f"Expected total {expected_total}, got {data['total_score']}"
        assert data["average_score"] == expected_average, f"Expected average {expected_average}, got {data['average_score']}"
    
    def test_grade_calculation_outstanding(self):
        """Grade should be 'Outstanding' for average >= 9"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Outstanding Test",
            "sincerity": 10,
            "target_achievement": 9,
            "personality_improvement": 9,
            "communication": 9,
            "leadership": 9
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        # Average = (10+9+9+9+9)/5 = 9.2
        assert data["grade"] == "Outstanding", f"Expected 'Outstanding', got {data['grade']}"
    
    def test_grade_calculation_excellent(self):
        """Grade should be 'Excellent' for average >= 7 and < 9"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Excellent Test",
            "sincerity": 8,
            "target_achievement": 8,
            "personality_improvement": 7,
            "communication": 8,
            "leadership": 7
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        # Average = (8+8+7+8+7)/5 = 7.6
        assert data["grade"] == "Excellent", f"Expected 'Excellent', got {data['grade']}"
    
    def test_grade_calculation_good(self):
        """Grade should be 'Good' for average >= 5 and < 7"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Good Test",
            "sincerity": 6,
            "target_achievement": 5,
            "personality_improvement": 6,
            "communication": 6,
            "leadership": 5
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        # Average = (6+5+6+6+5)/5 = 5.6
        assert data["grade"] == "Good", f"Expected 'Good', got {data['grade']}"
    
    def test_grade_calculation_needs_improvement(self):
        """Grade should be 'Needs Improvement' for average >= 3 and < 5"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Needs Improvement Test",
            "sincerity": 4,
            "target_achievement": 3,
            "personality_improvement": 4,
            "communication": 4,
            "leadership": 3
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        # Average = (4+3+4+4+3)/5 = 3.6
        assert data["grade"] == "Needs Improvement", f"Expected 'Needs Improvement', got {data['grade']}"
    
    def test_grade_calculation_poor(self):
        """Grade should be 'Poor' for average < 3"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Poor Test",
            "sincerity": 2,
            "target_achievement": 2,
            "personality_improvement": 2,
            "communication": 3,
            "leadership": 2
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        # Average = (2+2+2+3+2)/5 = 2.2
        assert data["grade"] == "Poor", f"Expected 'Poor', got {data['grade']}"
    
    def test_create_review_with_salary_recommendation(self):
        """Owner can create review with salary recommendation"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Salary Test",
            "sincerity": 8,
            "target_achievement": 8,
            "personality_improvement": 8,
            "communication": 8,
            "leadership": 8,
            "salary_recommendation": "10% Hike",
            "comments": "Great performance this quarter"
        }
        
        response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        self.created_review_ids.append(data["id"])
        
        assert data["salary_recommendation"] == "10% Hike"
        assert data["comments"] == "Great performance this quarter"
    
    def test_get_single_review(self):
        """Owner can get a specific review by ID"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        # First create a review
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Get Single Test",
            "sincerity": 7,
            "target_achievement": 7,
            "personality_improvement": 7,
            "communication": 7,
            "leadership": 7
        }
        
        create_response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert create_response.status_code in [200, 201]
        review_id = create_response.json()["id"]
        self.created_review_ids.append(review_id)
        
        # Get the review
        get_response = requests.get(f"{BASE_URL}/api/performance/reviews/{review_id}", headers=self.owner_headers)
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["id"] == review_id
        assert data["review_period"] == "Get Single Test"
    
    def test_update_performance_review(self):
        """Owner can update a performance review"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        # First create a review
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Update Test",
            "sincerity": 5,
            "target_achievement": 5,
            "personality_improvement": 5,
            "communication": 5,
            "leadership": 5
        }
        
        create_response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert create_response.status_code in [200, 201]
        review_id = create_response.json()["id"]
        self.created_review_ids.append(review_id)
        
        # Update the review
        update_data = {
            "sincerity": 8,
            "target_achievement": 8,
            "personality_improvement": 8,
            "communication": 8,
            "leadership": 8,
            "salary_recommendation": "15% Hike"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/performance/reviews/{review_id}", json=update_data, headers=self.owner_headers)
        assert update_response.status_code == 200
        
        # Verify update by getting the review
        get_response = requests.get(f"{BASE_URL}/api/performance/reviews/{review_id}", headers=self.owner_headers)
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["sincerity"] == 8
        assert data["average_score"] == 8.0  # All scores are 8
        assert data["grade"] == "Excellent"  # 8.0 average
        assert data["salary_recommendation"] == "15% Hike"
    
    def test_delete_performance_review(self):
        """Owner can delete a performance review"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        # First create a review
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Delete Test",
            "sincerity": 5,
            "target_achievement": 5,
            "personality_improvement": 5,
            "communication": 5,
            "leadership": 5
        }
        
        create_response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert create_response.status_code in [200, 201]
        review_id = create_response.json()["id"]
        
        # Delete the review
        delete_response = requests.delete(f"{BASE_URL}/api/performance/reviews/{review_id}", headers=self.owner_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/performance/reviews/{review_id}", headers=self.owner_headers)
        assert get_response.status_code == 404
    
    def test_filter_reviews_by_employee(self):
        """Owner can filter reviews by employee_id"""
        if not self.test_employee:
            pytest.skip("Test employee not available")
        
        # Create a review
        review_data = {
            "employee_id": self.test_employee["id"],
            "employee_name": self.test_employee["name"],
            "review_period": "Filter Test",
            "sincerity": 7,
            "target_achievement": 7,
            "personality_improvement": 7,
            "communication": 7,
            "leadership": 7
        }
        
        create_response = requests.post(f"{BASE_URL}/api/performance/reviews", json=review_data, headers=self.owner_headers)
        assert create_response.status_code in [200, 201]
        self.created_review_ids.append(create_response.json()["id"])
        
        # Filter by employee_id
        filter_response = requests.get(
            f"{BASE_URL}/api/performance/reviews?employee_id={self.test_employee['id']}", 
            headers=self.owner_headers
        )
        assert filter_response.status_code == 200
        
        data = filter_response.json()
        assert isinstance(data, list)
        # All reviews should be for the test employee
        for review in data:
            assert review["employee_id"] == self.test_employee["id"]


class TestPerformanceSummary:
    """Test performance summary endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get owner token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        assert response.status_code == 200, "Owner login failed"
        self.owner_token = response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        yield
    
    def test_summary_structure(self):
        """Summary should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/performance/summary", headers=self.owner_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_employees" in data
        assert "total_reviews" in data
        assert "employee_stats" in data
        assert isinstance(data["employee_stats"], list)
    
    def test_summary_employee_stats_structure(self):
        """Employee stats should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/performance/summary", headers=self.owner_headers)
        assert response.status_code == 200
        
        data = response.json()
        for emp_stat in data["employee_stats"]:
            assert "employee_id" in emp_stat
            assert "employee_name" in emp_stat
            assert "role" in emp_stat
            assert "total_reviews" in emp_stat
            assert "latest_grade" in emp_stat
            assert "latest_score" in emp_stat


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
