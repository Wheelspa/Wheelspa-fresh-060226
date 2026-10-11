import pytest
import asyncio
import os
from pathlib import Path
from dotenv import dotenv_values
from fastapi import HTTPException

# 1. Safety check: ensure we are operating strictly on test database
ROOT_DIR = Path(__file__).resolve().parent.parent
env_vars = dotenv_values(ROOT_DIR / ".env")
REAL_DB_NAME = env_vars.get("DB_NAME", "wheelspa_dev").strip('"\'')
TEST_DB_NAME = f"{REAL_DB_NAME}_test"

os.environ["REAL_DB_NAME"] = REAL_DB_NAME
os.environ["DB_NAME"] = TEST_DB_NAME
os.environ["IS_TESTING"] = "true"

from server import (
    calculate_quotation_totals,
    format_quotation_number,
    get_next_quotation_seq,
    peek_next_quotation_seq,
    create_quotation,
    delete_quotation,
    QuotationCreate,
    db
)

# Safety check assertion on the imported db instance
if db.name == REAL_DB_NAME or not db.name.endswith("_test"):
    raise RuntimeError(
        f"SAFETY ABORT: test_quotations.py would connect to real database '{db.name}'. "
        f"Must connect to a test database ending in '_test' (e.g. '{TEST_DB_NAME}')."
    )

from tests.conftest import run_async, TEST_DB_NAME, REAL_DB_NAME


class TestPPFQuotationCalculations:
    """Tests for PPF Quotation calculations matching the Excel specification"""

    def test_quotation_calculation_example(self):
        """
        Verify the exact calculation example from requirement:
        Basic 10000, Installer 2000, Detailing 1000, margin 30%, GST 18%
        -> Total 13000, Margin 3900, incl. margin 16900, GST 3042, Final 19942
        """
        totals = calculate_quotation_totals(
            basic_cost=10000.0,
            installer_charges=2000.0,
            detailing_charges=1000.0,
            margin_percentage=30.0,
            gst_percentage=18.0
        )

        assert totals["total_cost"] == 13000.0, f"Expected total_cost 13000.0, got {totals['total_cost']}"
        assert totals["margin_amount"] == 3900.0, f"Expected margin_amount 3900.0, got {totals['margin_amount']}"
        assert totals["total_cost_incl_margin"] == 16900.0, f"Expected total_cost_incl_margin 16900.0, got {totals['total_cost_incl_margin']}"
        assert totals["gst_amount"] == 3042.0, f"Expected gst_amount 3042.0, got {totals['gst_amount']}"
        assert totals["final_quotation_value"] == 19942.0, f"Expected final_quotation_value 19942.0, got {totals['final_quotation_value']}"

    def test_quotation_calculation_with_zero_costs(self):
        """Verify calculations when all costs are 0"""
        totals = calculate_quotation_totals(
            basic_cost=0.0,
            installer_charges=0.0,
            detailing_charges=0.0,
            margin_percentage=30.0,
            gst_percentage=18.0
        )

        assert totals["total_cost"] == 0.0
        assert totals["margin_amount"] == 0.0
        assert totals["total_cost_incl_margin"] == 0.0
        assert totals["gst_amount"] == 0.0
        assert totals["final_quotation_value"] == 0.0

    def test_quotation_calculation_rounding(self):
        """Verify rounding to 2 decimal places with fractional percentages"""
        totals = calculate_quotation_totals(
            basic_cost=15250.50,
            installer_charges=3500.0,
            detailing_charges=1250.25,
            margin_percentage=25.5,
            gst_percentage=18.0
        )

        assert totals["total_cost"] == 20000.75
        assert totals["margin_amount"] == 5100.19
        assert totals["total_cost_incl_margin"] == 25100.94
        assert totals["gst_amount"] == 4518.17
        assert totals["final_quotation_value"] == 29619.11


class TestPPFQuotationNumberIncrement:
    """Tests for Quotation number formatting and atomic sequence increment"""

    def test_quotation_number_formatting(self):
        """Verify sequence formatting WSPPF-001 up to and past 999"""
        assert format_quotation_number(1) == "WSPPF-001"
        assert format_quotation_number(2) == "WSPPF-002"
        assert format_quotation_number(42) == "WSPPF-042"
        assert format_quotation_number(999) == "WSPPF-999"
        # Grows past 999 naturally
        assert format_quotation_number(1000) == "WSPPF-1000"
        assert format_quotation_number(1001) == "WSPPF-1001"
        assert format_quotation_number(12500) == "WSPPF-12500"

    def test_atomic_sequence_increment(self):
        """Verify atomic increment in MongoDB counters collection on test database"""
        async def run_sequence_test():
            # Double check database safety
            assert db.name == TEST_DB_NAME, f"Must use test DB {TEST_DB_NAME}, got {db.name}"

            seq1 = await get_next_quotation_seq()
            seq2 = await get_next_quotation_seq()
            assert seq2 == seq1 + 1, f"Expected sequential increment, got {seq1} then {seq2}"
            num1 = format_quotation_number(seq1)
            num2 = format_quotation_number(seq2)
            assert num1.startswith("WSPPF-")
            assert num2.startswith("WSPPF-")
            peeked = await peek_next_quotation_seq()
            assert peeked == seq2 + 1

        run_async(run_sequence_test())


class TestPPFQuotationEndpointLogic:
    """Tests for POST /api/quotations validation, recalculation, and ignoring client quotation numbers"""

    def test_recalculates_totals_and_ignores_client_number(self):
        """Verify backend recalculates all totals, ignores client number, and cleans up created document"""
        async def run_create_test():
            assert db.name == TEST_DB_NAME, f"Safety check failed: db is {db.name}"
            mock_user = {"username": "testadmin", "role": "admin", "name": "Test Admin"}
            payload = QuotationCreate(
                quotation_no="CLIENT-FAKE-9999",  # Should be ignored
                quotation_date="2026-10-11",
                customer_name="Rohan Sharma",
                mobile_number="9876543210",
                vehicle_model="Toyota Fortuner",
                ppf_package="Garware Plus TPU 5-Year",
                basic_cost=10000.0,
                installer_charges=2000.0,
                detailing_charges=1000.0,
                margin_percentage=30.0,
                gst_percentage=18.0,
                total_cost=999.0,
                final_quotation_value=1.0
            )

            created_id = None
            try:
                result = await create_quotation(payload, mock_user)
                created_id = result["id"]

                # Check that client's quotation_no was completely ignored
                assert result["quotation_number"] != "CLIENT-FAKE-9999"
                assert result["quotation_number"].startswith("WSPPF-")

                # Check backend recalculated totals exactly as required
                assert result["total_cost"] == 13000.0
                assert result["margin_amount"] == 3900.0
                assert result["total_cost_incl_margin"] == 16900.0
                assert result["gst_amount"] == 3042.0
                assert result["final_quotation_value"] == 19942.0

                # Verify persisted in test database
                saved = await db.quotations.find_one({"id": created_id})
                assert saved is not None
                assert saved["customer_name"] == "Rohan Sharma"
                assert saved["final_quotation_value"] == 19942.0
            finally:
                # Clean up created document
                if created_id:
                    await db.quotations.delete_one({"id": created_id})

        run_async(run_create_test())

    def test_validates_required_fields_and_costs(self):
        """Verify validation errors for missing fields, invalid phone, and negative costs"""
        async def run_validation_tests():
            assert db.name == TEST_DB_NAME, f"Safety check failed: db is {db.name}"
            mock_user = {"username": "testadmin", "role": "admin", "name": "Test Admin"}

            # Missing customer name
            with pytest.raises(HTTPException) as exc_info:
                await create_quotation(
                    QuotationCreate(customer_name="", mobile_number="9876543210", vehicle_model="Car", ppf_package="PPF"),
                    mock_user
                )
            assert exc_info.value.status_code == 400
            assert "Customer Name is required" in exc_info.value.detail

            # Invalid mobile number (not 10 digits)
            with pytest.raises(HTTPException) as exc_info:
                await create_quotation(
                    QuotationCreate(customer_name="Name", mobile_number="12345", vehicle_model="Car", ppf_package="PPF"),
                    mock_user
                )
            assert exc_info.value.status_code == 400
            assert "10 digits" in exc_info.value.detail

            # Negative cost rejected
            with pytest.raises(HTTPException) as exc_info:
                await create_quotation(
                    QuotationCreate(customer_name="Name", mobile_number="9876543210", vehicle_model="Car", ppf_package="PPF", basic_cost=-500.0),
                    mock_user
                )
            assert exc_info.value.status_code == 400
            assert "Cost values must be numbers >= 0" in exc_info.value.detail

        run_async(run_validation_tests())


class TestPPFQuotationDelete:
    """Tests for DELETE /api/quotations/{id} functionality and safety"""

    def test_delete_roles_and_counter_preservation(self):
        """
        Verify:
        1. Owner and Superadmin can delete quotation.
        2. Admin role is forbidden (403).
        3. 404 is returned when quotation does not exist.
        4. Quotation counter is NEVER decremented or reset upon deletion.
        5. Created document is cleaned up.
        """
        async def run_delete_test():
            assert db.name == TEST_DB_NAME, f"Safety check failed: db is {db.name}"
            owner_user = {"username": "owner", "role": "owner", "name": "System Owner"}
            superadmin_user = {"username": "superadmin", "role": "superadmin", "name": "Super Admin"}
            admin_user = {"username": "admin", "role": "admin", "name": "Regular Admin"}

            # Create quotation to delete
            payload = QuotationCreate(
                customer_name="Delete Test Customer",
                mobile_number="9876543210",
                vehicle_model="BMW 3 Series",
                ppf_package="Garware Matte",
                basic_cost=20000.0
            )
            created = await create_quotation(payload, owner_user)
            q_id = created["id"]
            q_num = created["quotation_number"]

            # Record counter value after creation
            counter_doc_before = await db.counters.find_one({"_id": "quotation_number"})
            seq_before = counter_doc_before.get("seq")

            try:
                # 1. Admin user must NOT be allowed to delete (403 Forbidden)
                with pytest.raises(HTTPException) as exc_admin:
                    await delete_quotation(q_id, admin_user)
                assert exc_admin.value.status_code == 403
                assert "Insufficient permissions" in exc_admin.value.detail

                # Verify quotation still exists
                existing = await db.quotations.find_one({"id": q_id})
                assert existing is not None

                # 2. Superadmin or Owner CAN delete
                delete_res = await delete_quotation(q_id, superadmin_user)
                assert delete_res["id"] == q_id
                assert "deleted successfully" in delete_res["message"]

                # Verify quotation is gone from test database
                deleted_check = await db.quotations.find_one({"id": q_id})
                assert deleted_check is None

                # 3. Second delete must return 404 Not Found
                with pytest.raises(HTTPException) as exc_404:
                    await delete_quotation(q_id, owner_user)
                assert exc_404.value.status_code == 404
                assert "Quotation not found" in exc_404.value.detail

                # 4. Verify counter was NEVER decremented or reset
                counter_doc_after = await db.counters.find_one({"_id": "quotation_number"})
                seq_after = counter_doc_after.get("seq")
                assert seq_after == seq_before, f"Counter seq changed from {seq_before} to {seq_after}! Counter must never be decremented."

                # Verify next quotation continues sequentially
                next_created = await create_quotation(payload, owner_user)
                next_seq = next_created["sequence_number"]
                assert next_seq == seq_before + 1, f"Expected next seq {seq_before + 1}, got {next_seq}"
                # Cleanup next_created
                await db.quotations.delete_one({"id": next_created["id"]})

            finally:
                # Ensure cleanup
                await db.quotations.delete_one({"id": q_id})

        run_async(run_delete_test())
