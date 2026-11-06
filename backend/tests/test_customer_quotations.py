import pytest
import asyncio
import os
import re
from pathlib import Path
from dotenv import dotenv_values
from fastapi import HTTPException
from starlette.requests import Request
from datetime import datetime, timezone, timedelta

# Safety check: ensure testing strictly on test database
ROOT_DIR = Path(__file__).resolve().parent.parent
env_vars = dotenv_values(ROOT_DIR / ".env")
REAL_DB_NAME = env_vars.get("DB_NAME", "wheelspa_dev").strip('"\'')
TEST_DB_NAME = f"{REAL_DB_NAME}_test"

os.environ["REAL_DB_NAME"] = REAL_DB_NAME
os.environ["DB_NAME"] = TEST_DB_NAME
os.environ["IS_TESTING"] = "true"

from server import (
    calculate_customer_quotation_totals,
    format_customer_quotation_number,
    get_next_customer_quotation_seq,
    create_customer_quotation,
    update_customer_quotation,
    get_public_customer_quotation,
    respond_to_public_customer_quotation,
    get_customer_quotation_share_link,
    regenerate_customer_quotation_share_link,
    toggle_customer_quotation_share_link,
    CustomerQuotationCreate,
    CustomerQuotationUpdate,
    CustomerQuotationRespond,
    CustomerServiceItem,
    ShareLinkToggleRequest,
    get_client_ip,
    check_customer_public_rate_limit,
    db
)

if db.name == REAL_DB_NAME or not db.name.endswith("_test"):
    raise RuntimeError(
        f"SAFETY ABORT: test_customer_quotations.py would connect to real database '{db.name}'. "
        f"Must connect to a test database ending in '_test' (e.g. '{TEST_DB_NAME}')."
    )

from tests.conftest import run_async, TEST_DB_NAME, REAL_DB_NAME


class TestCustomerQuotationServerCalculations:
    """Tests for server-side total calculation: services - discount, GST, and min 0 clamp"""

    def test_calculation_with_services_and_discount(self):
        services = [
            {"key": "paint_protection_film", "label": "Paint Protection Film (PPF)", "selected": True, "amount": 40000.0, "detail": "Garware Plus TPU"},
            {"key": "window_filming", "label": "Window Filming", "selected": False, "amount": 8000.0},
            {"key": "ceramic_coating", "label": "Ceramic Coating", "selected": True, "amount": 10000.0},
            {"key": "sunroof_ppf", "label": "Sunroof PPF", "selected": True, "amount": 5000.0}
        ]
        # selected services = 40000 + 10000 + 5000 = 55000, discount = 5000
        # subtotal = 50000
        # gst = 18% of 50000 = 9000
        # final = 59000
        totals = calculate_customer_quotation_totals(
            services=services,
            discount=5000.0,
            gst_rate=18.0
        )
        assert totals["subtotal"] == 50000.0
        assert totals["gst_amount"] == 9000.0
        assert totals["final_price"] == 59000.0

    def test_calculation_without_discount_optional(self):
        services = [
            {"key": "ceramic_coating", "label": "Ceramic Coating", "selected": True, "amount": 20000.0}
        ]
        totals = calculate_customer_quotation_totals(services=services)
        assert totals["subtotal"] == 20000.0
        assert totals["gst_amount"] == 3600.0
        assert totals["final_price"] == 23600.0

    def test_unselected_service_amount_ignored(self):
        services = [
            {"key": "paint_protection_film", "label": "Paint Protection Film (PPF)", "selected": False, "amount": 60000.0},
            {"key": "window_filming", "label": "Window Filming", "selected": True, "amount": 12000.0}
        ]
        totals = calculate_customer_quotation_totals(services=services, discount=2000.0)
        assert totals["subtotal"] == 10000.0
        assert totals["gst_amount"] == 1800.0
        assert totals["final_price"] == 11800.0

    def test_subtotal_never_below_zero_when_discount_exceeds(self):
        services = [
            {"key": "sunroof_ppf", "label": "Sunroof PPF", "selected": True, "amount": 2000.0}
        ]
        totals = calculate_customer_quotation_totals(
            services=services,
            discount=5000.0,
            gst_rate=18.0
        )
        assert totals["subtotal"] == 0.0
        assert totals["gst_amount"] == 0.0
        assert totals["final_price"] == 0.0


class TestCustomerQuotationLifecycleAndSecurity:
    """Full tests for create, update, 422 validation, backward compatibility, whitelist, atomic response, token regeneration and rate limits"""

    def _get_mock_request(self, client_ip: str = "127.0.0.1", forwarded_for: str = None):
        headers = [(b"host", b"testserver")]
        if forwarded_for:
            headers.append((b"x-forwarded-for", forwarded_for.encode("utf-8")))
        return Request({
            "type": "http",
            "client": (client_ip, 50000),
            "headers": headers
        })

    def test_create_customer_quotation_and_server_side_calc(self):
        """Create quotation with custom services and discount; verify client numbers are ignored and server calculates"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}

            payload = CustomerQuotationCreate(
                customer_name="Aarav Kapoor",
                mobile="9876543210",
                vehicle_model="Audi A6",
                services=[
                    CustomerServiceItem(key="paint_protection_film", label="Paint Protection Film (PPF)", selected=True, amount=50000.0, detail="Garware Premium TPU"),
                    CustomerServiceItem(key="sunroof_ppf", label="Sunroof PPF", selected=True, amount=6000.0),
                    CustomerServiceItem(key="ceramic_coating", label="Ceramic Coating", selected=True, amount=14000.0),
                    CustomerServiceItem(key="window_filming", label="Window Filming", selected=False, amount=8000.0)
                ],
                discount=10000.0
            )

            created = await create_customer_quotation(payload, admin_user)
            q_id = created["id"]
            token = created["share_token"]

            try:
                assert created["quotation_no"].startswith("WSCQ-")
                assert created["status"] == "pending"
                assert len(token) >= 22

                # Server calc: 50000 + 6000 + 14000 - 10000 = 60000 subtotal (unselected window_filming ignored)
                # gst = 10800, final = 70800
                assert created["subtotal"] == 60000.0
                assert created["gst_amount"] == 10800.0
                assert created["final_price"] == 70800.0
            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_create_without_any_selected_service_raises_422(self):
        """Require at least one selected service with amount > 0; returns HTTP 422 if none selected"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}

            # 1. Empty services
            payload1 = CustomerQuotationCreate(
                customer_name="Rohit Sharma",
                mobile="9876543210",
                vehicle_model="Tata Safari",
                services=[]
            )
            with pytest.raises(HTTPException) as exc1:
                await create_customer_quotation(payload1, admin_user)
            assert exc1.value.status_code == 422

            # 2. Service selected but amount 0
            payload2 = CustomerQuotationCreate(
                customer_name="Rohit Sharma",
                mobile="9876543210",
                vehicle_model="Tata Safari",
                services=[
                    CustomerServiceItem(key="ceramic_coating", selected=True, amount=0.0)
                ]
            )
            with pytest.raises(HTTPException) as exc2:
                await create_customer_quotation(payload2, admin_user)
            assert exc2.value.status_code == 422

            # 3. Service with amount > 0 but selected is False
            payload3 = CustomerQuotationCreate(
                customer_name="Rohit Sharma",
                mobile="9876543210",
                vehicle_model="Tata Safari",
                services=[
                    CustomerServiceItem(key="ceramic_coating", selected=False, amount=15000.0)
                ]
            )
            with pytest.raises(HTTPException) as exc3:
                await create_customer_quotation(payload3, admin_user)
            assert exc3.value.status_code == 422

        run_async(run_test())

    def test_backward_compatibility_old_format_quotation(self):
        """Old saved quotations with ppf_package / ppf_price must still load and display correctly on public endpoint"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            import uuid
            q_id = str(uuid.uuid4())
            token = f"legacy_token_{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            # Insert legacy-format document directly into MongoDB
            legacy_doc = {
                "id": q_id,
                "quotation_no": "WSCQ-001",
                "quotation_date": "2026-10-15",
                "customer_name": "Legacy Customer",
                "mobile": "9812345678",
                "vehicle_model": "BMW 530d",
                "ppf_package": "Garware Plus TPU",
                "ppf_price": 65000.0,
                "services": [
                    {"key": "sunroof_ppf", "label": "Sunroof PPF", "selected": True, "amount": 6000.0}
                ],
                "discount": 5000.0,
                "subtotal": 66000.0,
                "gst_rate": 18.0,
                "gst_amount": 11880.0,
                "final_price": 77880.0,
                "status": "pending",
                "share_token": token,
                "link_disabled": False,
                "created_at": now_iso
            }
            await db.customer_quotations.insert_one(legacy_doc)

            try:
                req = self._get_mock_request("10.0.1.99")
                res = await get_public_customer_quotation(token, req)

                assert res["quotation_no"] == "WSCQ-001"
                assert res["customer_name"] == "Legacy Customer"
                assert res["mobile"] == "98XXXXX678"
                assert res["subtotal"] == 66000.0
                assert res["final_price"] == 77880.0

                # Legacy PPF must appear as first service line "Paint Protection Film" with ppf_package as detail
                assert len(res["services"]) == 2
                assert res["services"][0]["label"] == "Paint Protection Film"
                assert res["services"][0]["amount"] == 65000.0
                assert res["services"][0]["detail"] == "Garware Plus TPU"

                assert res["services"][1]["label"] == "Sunroof PPF"
                assert res["services"][1]["amount"] == 6000.0
            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_public_endpoint_hides_internal_fields_and_masks_mobile(self):
        """Customer public GET returns whitelist only, masks mobile (98XXXXX210), hides internal _id and created_by"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}

            payload = CustomerQuotationCreate(
                customer_name="Sneha Patil",
                mobile="9812345678",
                vehicle_model="Mercedes C-Class",
                services=[
                    CustomerServiceItem(key="paint_protection_film", label="Paint Protection Film (PPF)", selected=True, amount=60000.0, detail="Avery Dennison Supreme"),
                    CustomerServiceItem(key="window_filming", label="Window Filming", selected=True, amount=8000.0)
                ],
                discount=3000.0
            )

            created = await create_customer_quotation(payload, admin_user)
            q_id = created["id"]
            token = created["share_token"]

            try:
                req = self._get_mock_request("10.0.1.1")
                res = await get_public_customer_quotation(token, req)

                # 1. Whitelist verification
                assert res["quotation_no"] == created["quotation_no"]
                assert res["customer_name"] == "Sneha Patil"
                assert res["vehicle_model"] == "Mercedes C-Class"
                assert res["mobile"] == "98XXXXX678"  # masked format
                assert len(res["services"]) == 2
                assert res["services"][0]["label"] == "Paint Protection Film (PPF)"
                assert res["services"][0]["detail"] == "Avery Dennison Supreme"
                assert res["services"][0]["amount"] == 60000.0
                assert res["services"][1]["label"] == "Window Filming"
                assert res["services"][1]["amount"] == 8000.0
                assert res["subtotal"] == 65000.0
                assert res["status"] == "pending"

                # 2. Assert no internal fields leak
                forbidden = [
                    "_id", "id", "created_by", "created_by_name",
                    "sequence_number", "link_disabled"
                ]
                for key in forbidden:
                    assert key not in res, f"Forbidden internal key '{key}' leaked in public customer quotation response!"

            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_unknown_disabled_and_regenerated_token_returns_404(self):
        """404 on unknown token, disabled link, and old link after token regeneration"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}
            req = self._get_mock_request("10.0.1.2")

            # 1. Unknown token -> 404
            with pytest.raises(HTTPException) as exc_unknown:
                await get_public_customer_quotation("unknown_token_99999", req)
            assert exc_unknown.value.status_code == 404

            # 2. Create quotation
            payload = CustomerQuotationCreate(
                customer_name="Rajesh Verma",
                mobile="9823456789",
                vehicle_model="Toyota Innova",
                services=[
                    CustomerServiceItem(key="ceramic_coating", label="Ceramic Coating", selected=True, amount=30000.0)
                ]
            )
            created = await create_customer_quotation(payload, admin_user)
            q_id = created["id"]
            old_token = created["share_token"]

            try:
                # Initially works
                ok_res = await get_public_customer_quotation(old_token, req)
                assert ok_res["customer_name"] == "Rajesh Verma"

                # 3. Disable link -> 404
                await toggle_customer_quotation_share_link(
                    q_id, ShareLinkToggleRequest(disabled=True), admin_user
                )
                with pytest.raises(HTTPException) as exc_disabled:
                    await get_public_customer_quotation(old_token, req)
                assert exc_disabled.value.status_code == 404

                # Re-enable
                await toggle_customer_quotation_share_link(
                    q_id, ShareLinkToggleRequest(disabled=False), admin_user
                )
                ok_again = await get_public_customer_quotation(old_token, req)
                assert ok_again["customer_name"] == "Rajesh Verma"

                # 4. Regenerate token -> old token returns 404, new token works
                regen = await regenerate_customer_quotation_share_link(q_id, admin_user)
                new_token = regen["share_token"]
                assert new_token != old_token
                assert regen["relative_path"] == f"/q2/{new_token}"

                # Old token 404
                with pytest.raises(HTTPException) as exc_old:
                    await get_public_customer_quotation(old_token, req)
                assert exc_old.value.status_code == 404

                # New token 200
                new_ok = await get_public_customer_quotation(new_token, req)
                assert new_ok["customer_name"] == "Rajesh Verma"

            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_approve_works_once_then_second_respond_returns_409(self):
        """Atomic response: approve transitions status to 'approved', second call returns 409 Conflict"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}
            req = self._get_mock_request("10.0.1.3")

            payload = CustomerQuotationCreate(
                customer_name="Anita Deshmukh",
                mobile="9834567890",
                vehicle_model="Kia Seltos",
                services=[
                    CustomerServiceItem(key="graphene_coating", label="Graphene Coating", selected=True, amount=25000.0)
                ]
            )
            created = await create_customer_quotation(payload, admin_user)
            q_id = created["id"]
            token = created["share_token"]

            try:
                # 1. First approval -> succeeds
                res1 = await respond_to_public_customer_quotation(
                    token, CustomerQuotationRespond(decision="approved"), req
                )
                assert res1["status"] == "approved"
                assert res1["status_updated_at"] is not None

                # Verify in database
                doc = await db.customer_quotations.find_one({"id": q_id})
                assert doc["status"] == "approved"

                # 2. Second respond attempt (whether approved or rejected) -> 409 Conflict
                with pytest.raises(HTTPException) as exc_409:
                    await respond_to_public_customer_quotation(
                        token, CustomerQuotationRespond(decision="rejected", reason="changed mind"), req
                    )
                assert exc_409.value.status_code == 409
                assert "already been approved" in exc_409.value.detail

            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_update_blocked_after_decision_returns_409(self):
        """Admin update is strictly forbidden once status is not 'pending' (returns 409)"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}
            req = self._get_mock_request("10.0.1.4")

            payload = CustomerQuotationCreate(
                customer_name="Kishore Kumar",
                mobile="9845678901",
                vehicle_model="Skoda Kushaq",
                services=[
                    CustomerServiceItem(key="ceramic_coating", label="Ceramic Coating", selected=True, amount=20000.0)
                ]
            )
            created = await create_customer_quotation(payload, admin_user)
            q_id = created["id"]
            token = created["share_token"]

            try:
                # 1. Update while pending -> succeeds
                update_payload = CustomerQuotationUpdate(
                    customer_name="Kishore Kumar Updated",
                    services=[
                        CustomerServiceItem(key="ceramic_coating", label="Ceramic Coating", selected=True, amount=22000.0)
                    ]
                )
                updated = await update_customer_quotation(q_id, update_payload, admin_user)
                assert updated["customer_name"] == "Kishore Kumar Updated"
                assert updated["subtotal"] == 22000.0

                # 2. Reject quotation
                await respond_to_public_customer_quotation(
                    token, CustomerQuotationRespond(decision="rejected", reason="Budget exceeded"), req
                )

                # 3. Attempt update now -> 409 Conflict
                with pytest.raises(HTTPException) as exc_blocked:
                    await update_customer_quotation(q_id, CustomerQuotationUpdate(customer_name="Hack"), admin_user)
                assert exc_blocked.value.status_code == 409
                assert "Please create a revised quotation" in exc_blocked.value.detail

            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_expired_quotation_cannot_be_approved_returns_410(self):
        """Expired customer quotations cannot be approved (returns HTTP 410 Gone)"""
        async def run_test():
            assert db.name == TEST_DB_NAME
            admin_user = {"username": "admin", "role": "admin", "name": "Admin User"}
            req = self._get_mock_request("10.0.1.5")

            # Create quotation with date 30 days in the past
            past_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            payload = CustomerQuotationCreate(
                customer_name="Expired Test User",
                mobile="9856789012",
                vehicle_model="Tata Nexon",
                quotation_date=past_date,
                services=[
                    CustomerServiceItem(key="ceramic_coating", label="Ceramic Coating", selected=True, amount=18000.0)
                ]
            )
            created = await create_customer_quotation(payload, admin_user)
            q_id = created["id"]
            token = created["share_token"]

            try:
                # Attempt to approve expired quotation -> 410
                with pytest.raises(HTTPException) as exc_410:
                    await respond_to_public_customer_quotation(
                        token, CustomerQuotationRespond(decision="approved"), req
                    )
                assert exc_410.value.status_code == 410
                assert "expired" in exc_410.value.detail.lower()

            finally:
                await db.customer_quotations.delete_one({"id": q_id})

        run_async(run_test())

    def test_rate_limit_uses_first_x_forwarded_for_address(self):
        """Rate limiting correctly extracts the FIRST IP in Render's X-Forwarded-For header"""
        # Test helper directly
        req_proxy = self._get_mock_request(
            client_ip="10.200.0.1",
            forwarded_for="198.51.100.42, 10.0.0.1, 172.16.0.1"
        )
        assert get_client_ip(req_proxy) == "198.51.100.42"

        # Verify rate limiting tracks based on this first IP
        test_ip = "198.51.100.42"
        for i in range(30):
            assert check_customer_public_rate_limit(test_ip, limit=30, window_seconds=60) is True

        # Request 31 from this same client must be blocked
        assert check_customer_public_rate_limit(test_ip, limit=30, window_seconds=60) is False

        # Request from another client is still allowed
        assert check_customer_public_rate_limit("198.51.100.43", limit=30, window_seconds=60) is True
