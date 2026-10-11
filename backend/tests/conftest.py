import os
import asyncio
from pathlib import Path
import pytest
from dotenv import dotenv_values, load_dotenv

# 1. Determine ROOT_DIR and real DB_NAME from .env
ROOT_DIR = Path(__file__).resolve().parent.parent
env_file = ROOT_DIR / ".env"
env_vars = dotenv_values(env_file)

REAL_DB_NAME = env_vars.get("DB_NAME", "wheelspa_dev").strip('"\'')
TEST_DB_NAME = f"{REAL_DB_NAME}_test"

# 2. Force test environment variables before ANY server or database module is loaded
os.environ["REAL_DB_NAME"] = REAL_DB_NAME
os.environ["DB_NAME"] = TEST_DB_NAME
os.environ["IS_TESTING"] = "true"

# Ensure other dotenv loads don't overwrite these test variables
load_dotenv(env_file, override=False)
os.environ["DB_NAME"] = TEST_DB_NAME
os.environ["IS_TESTING"] = "true"

# 3. Create a single persistent event loop for the test session
test_session_loop = asyncio.new_event_loop()
asyncio.set_event_loop(test_session_loop)

def run_async(coro):
    """Helper to run an async coroutine on the shared test event loop"""
    return test_session_loop.run_until_complete(coro)


@pytest.fixture(autouse=True, scope="session")
def enforce_test_db_safety():
    """
    Session-level safety check:
    Ensures tests NEVER run against the real production/dev database.
    If DB_NAME equals the real database or does not end with '_test', abort immediately.
    """
    current_db = os.environ.get("DB_NAME", "").strip('"\'')
    if current_db == REAL_DB_NAME or not current_db.endswith("_test"):
        pytest.exit(
            f"\n[SAFETY ABORT] Tests must NEVER run against real database '{REAL_DB_NAME}'. "
            f"Current DB_NAME is '{current_db}'. Must be set to a test database ending in '_test' (e.g. '{TEST_DB_NAME}').",
            returncode=1
        )

    # If an external server is specified via REACT_APP_BACKEND_URL, verify that the server is also running on a test db
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if base_url:
        try:
            import requests
            res = requests.get(f"{base_url}/api/system/db-info", timeout=3)
            if res.status_code == 200:
                server_db = res.json().get("db_name", "")
                if server_db == REAL_DB_NAME or not server_db.endswith("_test"):
                    pytest.exit(
                        f"\n[SAFETY ABORT] Server at {base_url} is connected to real database '{server_db}'. "
                        f"Tests must only run against a server connected to a test database ending with '_test'.",
                        returncode=1
                    )
        except Exception:
            pass


@pytest.fixture(scope="session", autouse=True)
def setup_test_db_owner():
    """
    Ensure the test database has the default owner user created so authentication tests work.
    Uses the persistent test_session_loop without closing it prematurely.
    """
    try:
        from server import db, get_password_hash
        import uuid
        from datetime import datetime, timezone

        async def ensure_owner():
            current_db_name = db.name
            if current_db_name == REAL_DB_NAME or not current_db_name.endswith("_test"):
                raise RuntimeError(f"Refusing to seed owner into non-test database: {current_db_name}")

            existing_owner = await db.users.find_one({"role": "owner"})
            if not existing_owner:
                owner_doc = {
                    "id": str(uuid.uuid4()),
                    "username": "owner",
                    "password_hash": get_password_hash("owner123"),
                    "role": "owner",
                    "name": "System Owner",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "is_active": True,
                    "must_change_password": False
                }
                await db.users.insert_one(owner_doc)

        run_async(ensure_owner())
    except Exception as e:
        print(f"Notice: Test db owner setup: {e}")
