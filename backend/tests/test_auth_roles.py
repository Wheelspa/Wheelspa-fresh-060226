"""
Test suite for Wheelspa 3-tier authentication system:
- Owner: Full access + manage users
- Superadmin: Can approve requests, view users
- Admin: Needs approval to edit, limited access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OWNER_CREDS = {"username": "owner", "password": "owner123"}
TEST_ADMIN_CREDS = {"username": "testadmin_pytest", "password": "admin123"}
TEST_SUPERADMIN_CREDS = {"username": "testsuperadmin_pytest", "password": "super123"}


class TestOwnerLogin:
    """Test owner login functionality"""
    
    def test_owner_login_success(self):
        """Owner can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "owner", f"Expected role 'owner', got {data['user']['role']}"
        assert data["user"]["username"] == "owner"
    
    def test_owner_login_invalid_password(self):
        """Owner login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "owner",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_owner_login_invalid_username(self):
        """Login fails with non-existent username"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "nonexistent",
            "password": "owner123"
        })
        assert response.status_code == 401


class TestUserManagement:
    """Test user management - Owner only functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get owner token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        assert response.status_code == 200, "Owner login failed"
        self.owner_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.owner_token}"}
        yield
        # Cleanup: Delete test users created during tests
        self._cleanup_test_users()
    
    def _cleanup_test_users(self):
        """Delete test users created during tests"""
        try:
            response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
            if response.status_code == 200:
                users = response.json()
                for user in users:
                    if user["username"].startswith("test") and user["username"].endswith("_pytest"):
                        requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.headers)
        except Exception:
            pass
    
    def test_owner_can_create_admin_user(self):
        """Owner can create a new admin user with custom credentials"""
        user_data = {
            "username": "testadmin_pytest",
            "password": "admin123",
            "name": "Test Admin",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201, f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["username"] == "testadmin_pytest"
        assert data["role"] == "admin"
        assert data["name"] == "Test Admin"
        assert "id" in data
    
    def test_owner_can_create_superadmin_user(self):
        """Owner can create a superadmin user"""
        user_data = {
            "username": "testsuperadmin_pytest",
            "password": "super123",
            "name": "Test Superadmin",
            "role": "superadmin"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201, f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["username"] == "testsuperadmin_pytest"
        assert data["role"] == "superadmin"
    
    def test_owner_can_list_users(self):
        """Owner can view all users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
        # Should at least have the owner
        assert len(users) >= 1
        
        # Verify owner is in the list
        owner_found = any(u["role"] == "owner" for u in users)
        assert owner_found, "Owner should be in the users list"
    
    def test_owner_can_toggle_user_status(self):
        """Owner can enable/disable users"""
        # First create a test user
        user_data = {
            "username": "testtoggle_pytest",
            "password": "toggle123",
            "name": "Toggle Test",
            "role": "admin"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        user_id = create_response.json()["id"]
        
        # Toggle status (disable)
        toggle_response = requests.put(f"{BASE_URL}/api/users/{user_id}/toggle-status", headers=self.headers)
        assert toggle_response.status_code == 200
        
        data = toggle_response.json()
        assert "is_active" in data
        assert data["is_active"] == False, "User should be disabled after toggle"
        
        # Toggle again (enable)
        toggle_response2 = requests.put(f"{BASE_URL}/api/users/{user_id}/toggle-status", headers=self.headers)
        assert toggle_response2.status_code == 200
        assert toggle_response2.json()["is_active"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.headers)
    
    def test_owner_can_delete_user(self):
        """Owner can delete users"""
        # First create a test user
        user_data = {
            "username": "testdelete_pytest",
            "password": "delete123",
            "name": "Delete Test",
            "role": "admin"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        user_id = create_response.json()["id"]
        
        # Delete the user
        delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify user is deleted - should not be in list
        list_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = list_response.json()
        deleted_user = [u for u in users if u["id"] == user_id]
        assert len(deleted_user) == 0, "Deleted user should not be in the list"
    
    def test_duplicate_username_rejected(self):
        """Cannot create user with existing username"""
        # Try to create another owner
        user_data = {
            "username": "owner",
            "password": "newpass",
            "name": "Duplicate Owner",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
        assert response.status_code == 400, "Should reject duplicate username"


class TestAdminRoleAccess:
    """Test admin role - limited access, needs approval"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test admin and get tokens"""
        # Get owner token
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        self.owner_token = owner_response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        
        # Create test admin
        user_data = {
            "username": "testadmin_access_pytest",
            "password": "admin123",
            "name": "Test Admin Access",
            "role": "admin"
        }
        requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.owner_headers)
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testadmin_access_pytest",
            "password": "admin123"
        })
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["token"]
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            self.admin_token = None
            self.admin_headers = {}
        
        yield
        
        # Cleanup
        try:
            response = requests.get(f"{BASE_URL}/api/users", headers=self.owner_headers)
            if response.status_code == 200:
                users = response.json()
                for user in users:
                    if user["username"] == "testadmin_access_pytest":
                        requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.owner_headers)
        except Exception:
            pass
    
    def test_admin_login_success(self):
        """Admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testadmin_access_pytest",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
    
    def test_admin_cannot_manage_users(self):
        """Admin should NOT be able to create users"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        user_data = {
            "username": "unauthorized_user",
            "password": "test123",
            "name": "Unauthorized",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.admin_headers)
        assert response.status_code == 403, f"Admin should not be able to create users, got {response.status_code}"
    
    def test_admin_cannot_delete_users(self):
        """Admin should NOT be able to delete users"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # Get users list first
        response = requests.get(f"{BASE_URL}/api/users", headers=self.owner_headers)
        users = response.json()
        if len(users) > 0:
            user_id = users[0]["id"]
            delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.admin_headers)
            assert delete_response.status_code == 403, "Admin should not be able to delete users"
    
    def test_admin_cannot_edit_booking_directly(self):
        """Admin should NOT be able to edit bookings directly"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # Try to update a booking (should fail with 403)
        response = requests.put(
            f"{BASE_URL}/api/bookings/fake-id",
            json={"status": "completed"},
            headers=self.admin_headers
        )
        # Should be 403 (forbidden) or 404 (not found)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"


class TestSuperadminRoleAccess:
    """Test superadmin role - can approve, view users, but not manage users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test superadmin and get tokens"""
        # Get owner token
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        self.owner_token = owner_response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        
        # Create test superadmin
        user_data = {
            "username": "testsuperadmin_access_pytest",
            "password": "super123",
            "name": "Test Superadmin Access",
            "role": "superadmin"
        }
        requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.owner_headers)
        
        # Login as superadmin
        superadmin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testsuperadmin_access_pytest",
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
                    if user["username"] == "testsuperadmin_access_pytest":
                        requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.owner_headers)
        except Exception:
            pass
    
    def test_superadmin_login_success(self):
        """Superadmin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testsuperadmin_access_pytest",
            "password": "super123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "superadmin"
    
    def test_superadmin_can_view_users(self):
        """Superadmin can view users list"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        response = requests.get(f"{BASE_URL}/api/users", headers=self.superadmin_headers)
        assert response.status_code == 200, f"Superadmin should be able to view users, got {response.status_code}"
    
    def test_superadmin_cannot_create_users(self):
        """Superadmin should NOT be able to create users"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        user_data = {
            "username": "unauthorized_user_super",
            "password": "test123",
            "name": "Unauthorized",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.superadmin_headers)
        assert response.status_code == 403, f"Superadmin should not be able to create users, got {response.status_code}"
    
    def test_superadmin_can_view_approval_requests(self):
        """Superadmin can view approval requests"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        response = requests.get(f"{BASE_URL}/api/approval-requests", headers=self.superadmin_headers)
        assert response.status_code == 200
    
    def test_superadmin_can_view_pending_count(self):
        """Superadmin can see pending approval count"""
        if not self.superadmin_token:
            pytest.skip("Superadmin token not available")
        
        response = requests.get(f"{BASE_URL}/api/approval-requests/pending-count", headers=self.superadmin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data


class TestApprovalSystem:
    """Test approval request system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for testing"""
        # Get owner token
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        self.owner_token = owner_response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        yield
    
    def test_owner_can_view_approval_requests(self):
        """Owner can view all approval requests"""
        response = requests.get(f"{BASE_URL}/api/approval-requests", headers=self.owner_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_owner_can_view_pending_count(self):
        """Owner can see pending approval count"""
        response = requests.get(f"{BASE_URL}/api/approval-requests/pending-count", headers=self.owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)


class TestDisabledUserAccess:
    """Test that disabled users cannot login"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create and disable a test user"""
        # Get owner token
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        self.owner_token = owner_response.json()["token"]
        self.owner_headers = {"Authorization": f"Bearer {self.owner_token}"}
        
        # Create test user
        user_data = {
            "username": "testdisabled_pytest",
            "password": "disabled123",
            "name": "Disabled Test",
            "role": "admin"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.owner_headers)
        if create_response.status_code in [200, 201]:
            self.test_user_id = create_response.json()["id"]
        else:
            self.test_user_id = None
        
        yield
        
        # Cleanup
        if self.test_user_id:
            requests.delete(f"{BASE_URL}/api/users/{self.test_user_id}", headers=self.owner_headers)
    
    def test_disabled_user_cannot_login(self):
        """Disabled user should not be able to login"""
        if not self.test_user_id:
            pytest.skip("Test user not created")
        
        # Disable the user
        toggle_response = requests.put(
            f"{BASE_URL}/api/users/{self.test_user_id}/toggle-status",
            headers=self.owner_headers
        )
        assert toggle_response.status_code == 200
        assert toggle_response.json()["is_active"] == False
        
        # Try to login as disabled user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testdisabled_pytest",
            "password": "disabled123"
        })
        assert login_response.status_code == 401, "Disabled user should not be able to login"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
