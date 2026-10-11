import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

OWNER_CREDENTIALS_OPTIONS = [
    {"username": "localowner", "password": "Test@12345"},
    {"username": "owner", "password": "owner123"}
]


@pytest.fixture(scope="module")
def owner_headers():
    # Safety check: Verify the target server is NOT running against the real database
    try:
        db_res = requests.get(f"{BASE_URL}/api/system/db-info", timeout=3)
        if db_res.status_code == 200:
            info = db_res.json()
            server_db = info.get("db_name", "")
            if not info.get("is_test_db") or not server_db.endswith("_test"):
                pytest.exit(
                    f"\n[SAFETY ABORT] Server at {BASE_URL} is running on non-test database '{server_db}'. "
                    f"Tests must NEVER run against real databases! Start server with DB_NAME ending in '_test'.",
                    returncode=1
                )
    except Exception:
        pass

    token = None
    for creds in OWNER_CREDENTIALS_OPTIONS:
        try:
            res = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=5)
            if res.status_code == 200:
                token = res.json().get("token")
                break
        except Exception:
            pass

    assert token is not None, "Failed to authenticate with owner credentials"
    return {"Authorization": f"Bearer {token}"}


class TestRejectedBookingFreesSlot:
    """Test that a rejected booking frees its slot and permits re-booking"""

    def test_rejected_booking_frees_slot(self, owner_headers):
        # Generate a random test date to avoid conflicts with previous runs
        unique_suffix = uuid.uuid4().hex[:4]
        test_date = f"2027-01-15"
        test_slot = "03:00 PM"

        created_ids = []

        try:
            # 1. Create initial booking on slot
            booking_payload_1 = {
                "id": f"CLIENT-ID-{unique_suffix}",
                "customerName": "Test Customer",
                "phone": "9876543210",
                "service": "foam-wash",
                "serviceName": "Royal Foam Wash",
                "carBrand": "Hyundai",
                "carNumber": "MH12AB9999",
                "appointmentDate": test_date,
                "appointment_date": test_date,
                "timeSlot": test_slot,
                "time_slot": test_slot,
                "status": "pending"
            }
            create_res = requests.post(f"{BASE_URL}/api/bookings", json=booking_payload_1)
            assert create_res.status_code == 200, f"Initial booking failed: {create_res.text}"
            booking_1 = create_res.json()
            actual_id_1 = booking_1["id"]
            assert actual_id_1.startswith("WS-BK-"), f"Expected ID prefix WS-BK-, got {actual_id_1}"
            created_ids.append(actual_id_1)

            # 2. Verify duplicate booking is blocked with 409 Conflict
            conflict_res = requests.post(
                f"{BASE_URL}/api/bookings",
                json={**booking_payload_1, "id": f"ANOTHER-CLIENT-ID-{unique_suffix}"}
            )
            assert conflict_res.status_code == 409, (
                f"Expected 409 Conflict while booking active slot, got {conflict_res.status_code}"
            )

            # 3. Verify slot availability endpoint shows slot as booked
            slots_res = requests.get(f"{BASE_URL}/api/bookings/slots/{test_date}")
            assert slots_res.status_code == 200
            slot_item = next(
                (s for s in slots_res.json().get("slots", []) if s["time"] == test_slot),
                None
            )
            assert slot_item is not None
            assert slot_item["status"] != "available"

            # 4. Reject the booking via admin/owner status endpoint
            reject_res = requests.put(
                f"{BASE_URL}/api/bookings/{actual_id_1}/status",
                json={"status": "rejected"},
                headers=owner_headers
            )
            assert reject_res.status_code == 200, f"Reject booking failed: {reject_res.text}"
            assert reject_res.json()["status"] == "rejected"

            # 5. Verify slot availability endpoint now marks slot as available
            slots_after_reject = requests.get(f"{BASE_URL}/api/bookings/slots/{test_date}")
            assert slots_after_reject.status_code == 200
            slot_item_after = next(
                (s for s in slots_after_reject.json().get("slots", []) if s["time"] == test_slot),
                None
            )
            assert slot_item_after is not None
            assert slot_item_after["status"] == "available", (
                f"Expected slot to be 'available' after rejection, got {slot_item_after['status']}"
            )

            # 6. Verify get_booking_slots (general slot endpoint) does not block slot
            general_slots_res = requests.get(f"{BASE_URL}/api/bookings/slots?date={test_date}")
            assert general_slots_res.status_code == 200
            slot_key = f"{test_date}_{test_slot}"
            slot_map = general_slots_res.json().get("slot_map", {})
            assert slot_key not in slot_map, "Rejected booking should not be present in slot_map"

            # 7. Same slot must now be bookable again with 200 OK
            booking_payload_2 = {
                **booking_payload_1,
                "id": f"CLIENT-ID-2-{unique_suffix}",
                "customerName": "Second Customer"
            }
            rebook_res = requests.post(f"{BASE_URL}/api/bookings", json=booking_payload_2)
            assert rebook_res.status_code == 200, (
                f"Expected slot to be re-bookable after rejection, got {rebook_res.status_code}: {rebook_res.text}"
            )
            booking_2 = rebook_res.json()
            actual_id_2 = booking_2["id"]
            assert actual_id_2.startswith("WS-BK-")
            created_ids.append(actual_id_2)

        finally:
            # Cleanup test bookings
            for b_id in created_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/bookings/{b_id}", headers=owner_headers)
                except Exception:
                    pass


class TestBookingStatusTransitions:
    """Test state machine transitions on PUT /api/bookings/{booking_id}/status"""

    def test_valid_and_invalid_transitions(self, owner_headers):
        test_date = f"2027-01-16"
        test_slot = "04:00 PM"
        created_ids = []

        try:
            # Create a pending booking
            res = requests.post(f"{BASE_URL}/api/bookings", json={
                "customerName": "Transition Test",
                "phone": "9876543210",
                "service": "foam-wash",
                "serviceName": "Royal Foam Wash",
                "carBrand": "Honda",
                "carNumber": "MH12XY1111",
                "appointmentDate": test_date,
                "timeSlot": test_slot,
                "status": "pending"
            })
            assert res.status_code == 200, f"Booking creation failed: {res.text}"
            booking = res.json()
            b_id = booking["id"]
            assert b_id.startswith("WS-BK-")
            created_ids.append(b_id)

            # 1. Invalid status value
            bad_val_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "invalid_status"},
                headers=owner_headers
            )
            assert bad_val_res.status_code == 400

            # 2. pending -> completed is NOT allowed (must return 409)
            illegal_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "completed"},
                headers=owner_headers
            )
            assert illegal_res.status_code == 409

            # 3. pending -> cancelled is NOT allowed (must return 409)
            illegal_cancel = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "cancelled"},
                headers=owner_headers
            )
            assert illegal_cancel.status_code == 409

            # 4. pending -> confirmed is ALLOWED (200)
            confirm_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "confirmed"},
                headers=owner_headers
            )
            assert confirm_res.status_code == 200
            assert confirm_res.json()["status"] == "confirmed"

            # 5. confirmed -> rejected is NOT allowed (409)
            conf_to_rej = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "rejected"},
                headers=owner_headers
            )
            assert conf_to_rej.status_code == 409

            # 6. confirmed -> completed is ALLOWED (200)
            complete_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "completed"},
                headers=owner_headers
            )
            assert complete_res.status_code == 200
            assert complete_res.json()["status"] == "completed"

            # 7. completed is terminal -> cannot transition to cancelled (409)
            terminal_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id}/status",
                json={"status": "cancelled"},
                headers=owner_headers
            )
            assert terminal_res.status_code == 409

            # Now create a second booking to test pending -> rejected
            res2 = requests.post(f"{BASE_URL}/api/bookings", json={
                "customerName": "Reject Test",
                "phone": "9876543210",
                "service": "foam-wash",
                "serviceName": "Royal Foam Wash",
                "carBrand": "Tata",
                "carNumber": "MH12XY2222",
                "appointmentDate": test_date,
                "timeSlot": "05:00 PM",
                "status": "pending"
            })
            assert res2.status_code == 200, f"Second booking creation failed: {res2.text}"
            b_id2 = res2.json()["id"]
            created_ids.append(b_id2)

            # pending -> rejected is ALLOWED (200)
            rej_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id2}/status",
                json={"status": "rejected"},
                headers=owner_headers
            )
            assert rej_res.status_code == 200
            assert rej_res.json()["status"] == "rejected"

            # rejected is terminal -> cannot transition to confirmed (409)
            rej_terminal = requests.put(
                f"{BASE_URL}/api/bookings/{b_id2}/status",
                json={"status": "confirmed"},
                headers=owner_headers
            )
            assert rej_terminal.status_code == 409

            # Now create a third booking to test confirmed -> cancelled
            res3 = requests.post(f"{BASE_URL}/api/bookings", json={
                "customerName": "Cancel Test",
                "phone": "9876543210",
                "service": "foam-wash",
                "serviceName": "Royal Foam Wash",
                "carBrand": "Mahindra",
                "carNumber": "MH12XY3333",
                "appointmentDate": test_date,
                "timeSlot": "01:00 PM",
                "status": "pending"
            })
            assert res3.status_code == 200
            b_id3 = res3.json()["id"]
            created_ids.append(b_id3)

            # pending -> confirmed
            c_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id3}/status",
                json={"status": "confirmed"},
                headers=owner_headers
            )
            assert c_res.status_code == 200

            # confirmed -> cancelled is ALLOWED (200)
            canc_res = requests.put(
                f"{BASE_URL}/api/bookings/{b_id3}/status",
                json={"status": "cancelled"},
                headers=owner_headers
            )
            assert canc_res.status_code == 200
            assert canc_res.json()["status"] == "cancelled"

            # cancelled is terminal -> cannot transition to completed (409)
            canc_term = requests.put(
                f"{BASE_URL}/api/bookings/{b_id3}/status",
                json={"status": "completed"},
                headers=owner_headers
            )
            assert canc_term.status_code == 409

        finally:
            for b_id in created_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/bookings/{b_id}", headers=owner_headers)
                except Exception:
                    pass


class TestTimeSlotsAndOptionalCarBrand:
    """Test 06:00 PM slot availability and booking creation with optional car brand/model"""

    def test_slots_include_06_pm(self):
        test_date = "2027-02-01"
        res = requests.get(f"{BASE_URL}/api/bookings/slots/{test_date}")
        assert res.status_code == 200
        slots = res.json().get("slots", [])
        slot_times = [s["time"] for s in slots]
        assert "06:00 PM" in slot_times, f"Expected 06:00 PM in slots, got {slot_times}"
        assert len(slots) == 10, f"Expected 10 slots (09:00 AM to 06:00 PM), got {len(slots)}"

    def test_booking_with_optional_car_brand_and_06_pm_slot(self, owner_headers):
        test_date = "2027-02-02"
        test_slot = "06:00 PM"
        created_id = None

        try:
            # Booking with empty carBrand and carModel on 06:00 PM slot
            payload = {
                "customerName": "Optional Brand Test",
                "phone": "9876543210",
                "service": "royal-foam-wash",
                "serviceName": "Royal Foam Wash",
                "carBrand": "",
                "carModel": "",
                "carNumber": "MH12AB1234",
                "appointmentDate": test_date,
                "timeSlot": test_slot,
                "status": "pending"
            }
            res = requests.post(f"{BASE_URL}/api/bookings", json=payload)
            assert res.status_code == 200, f"Failed to book with empty brand/model on 06:00 PM: {res.text}"
            booking = res.json()
            assert booking["id"].startswith("WS-BK-")
            assert booking["timeSlot"] == "06:00 PM"
            created_id = booking["id"]

            # Verify slot is marked booked
            slots_res = requests.get(f"{BASE_URL}/api/bookings/slots/{test_date}")
            assert slots_res.status_code == 200
            slot_item = next((s for s in slots_res.json().get("slots", []) if s["time"] == test_slot), None)
            assert slot_item is not None
            assert slot_item["status"] != "available"

        finally:
            if created_id:
                try:
                    requests.delete(f"{BASE_URL}/api/bookings/{created_id}", headers=owner_headers)
                except Exception:
                    pass

