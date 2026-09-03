from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('JWT_SECRET', 'wheelspa-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "admin"  # admin, superadmin, owner
    name: str = ""

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    role: str
    name: str
    created_at: str
    is_active: bool = True
    must_change_password: bool = False

class ApprovalRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_type: str  # edit, delete
    data_type: str  # booking, entry, installer_payment, service
    data_id: str
    requested_by: str  # username
    requested_by_name: str
    original_data: dict
    new_data: Optional[dict] = None  # None for delete requests
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    notes: Optional[str] = None

class ApprovalRequestCreate(BaseModel):
    request_type: str
    data_type: str
    data_id: str
    original_data: dict
    new_data: Optional[dict] = None
    notes: Optional[str] = None

class ApprovalAction(BaseModel):
    action: str  # approve, reject
    notes: Optional[str] = None

class ContactEnquiryCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    enquiry_type: Optional[str] = ""
    subject: Optional[str] = ""
    message: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

# ============== HELPER FUNCTIONS ==============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_role(allowed_roles: List[str], user: dict):
    if user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

# ============== AUTH ROUTES ==============

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "name": user["name"],
            "must_change_password": user.get("must_change_password", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "name": user["name"],
        "must_change_password": user.get("must_change_password", False)
    }

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not verify_password(data.old_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    
    new_hash = get_password_hash(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash, "must_change_password": False}}
    )
    return {"message": "Password updated successfully"}

# ============== USER MANAGEMENT (Owner Only) ==============

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    await require_role(["owner"], current_user)
    
    # Check if username exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate role
    if user_data.role not in ["admin", "superadmin", "owner"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": user_data.username,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "name": user_data.name or user_data.username,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_doc["id"],
        username=user_doc["username"],
        role=user_doc["role"],
        name=user_doc["name"],
        created_at=user_doc["created_at"],
        is_active=True
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    await require_role(["owner", "superadmin"], current_user)
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await require_role(["owner"], current_user)
    
    # Prevent self-deletion
    if current_user["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    await require_role(["owner"], current_user)
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully", "is_active": new_status}

# ============== APPROVAL REQUESTS ==============

@api_router.post("/approval-requests")
async def create_approval_request(request_data: ApprovalRequestCreate, current_user: dict = Depends(get_current_user)):
    # Only admins need to create approval requests
    if current_user["role"] != "admin":
        raise HTTPException(status_code=400, detail="Only admins need approval for edits")
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "request_type": request_data.request_type,
        "data_type": request_data.data_type,
        "data_id": request_data.data_id,
        "requested_by": current_user["username"],
        "requested_by_name": current_user["name"],
        "original_data": request_data.original_data,
        "new_data": request_data.new_data,
        "status": "pending",
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notes": request_data.notes
    }
    
    await db.approval_requests.insert_one(request_doc)
    
    # Remove _id before returning
    request_doc.pop("_id", None)
    return request_doc

@api_router.get("/approval-requests")
async def get_approval_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Admins can see their own requests, superadmin/owner can see all
    query = {}
    if current_user["role"] == "admin":
        query["requested_by"] = current_user["username"]
    
    if status:
        query["status"] = status
    
    requests = await db.approval_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.get("/approval-requests/pending-count")
async def get_pending_count(current_user: dict = Depends(get_current_user)):
    # Only superadmin and owner see the pending count
    if current_user["role"] not in ["superadmin", "owner"]:
        return {"count": 0}
    
    count = await db.approval_requests.count_documents({"status": "pending"})
    return {"count": count}

@api_router.put("/approval-requests/{request_id}")
async def process_approval_request(
    request_id: str,
    action_data: ApprovalAction,
    current_user: dict = Depends(get_current_user)
):
    await require_role(["superadmin", "owner"], current_user)
    
    request = await db.approval_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    update_data = {
        "status": "approved" if action_data.action == "approve" else "rejected",
        "reviewed_by": current_user["username"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "notes": action_data.notes or request.get("notes")
    }
    
    await db.approval_requests.update_one({"id": request_id}, {"$set": update_data})
    
    # If approved, apply the change
    if action_data.action == "approve":
        collection_map = {
            "booking": "bookings",
            "entry": "entries",
            "installer_payment": "installer_payments",
            "service": "services",
            "installer": "installers"
        }
        
        collection_name = collection_map.get(request["data_type"])
        if collection_name:
            if request["request_type"] == "delete":
                await db[collection_name].delete_one({"id": request["data_id"]})
            elif request["request_type"] == "edit":
                # Update with new data
                new_data = request["new_data"]
                new_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                await db[collection_name].update_one(
                    {"id": request["data_id"]},
                    {"$set": new_data}
                )
    
    return {"message": f"Request {action_data.action}d successfully"}

# ============== DATA ROUTES (with role-based access) ==============

# Contact Enquiries
@api_router.post("/contact")
async def create_contact_enquiry(enquiry: ContactEnquiryCreate):
    enquiry_doc = {
        "id": str(uuid.uuid4()),
        "name": enquiry.name,
        "phone": enquiry.phone,
        "email": enquiry.email or "",
        "enquiry_type": enquiry.enquiry_type or "",
        "subject": enquiry.subject or "",
        "message": enquiry.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contact_enquiries.insert_one(enquiry_doc)
    enquiry_doc.pop("_id", None)
    return enquiry_doc

# Bookings
@api_router.get("/bookings")
async def get_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings

@api_router.post("/bookings")
async def create_booking(booking: dict):
    # Public endpoint - no auth required
    booking["id"] = booking.get("id", str(uuid.uuid4()))
    booking["created_at"] = datetime.now(timezone.utc).isoformat()
    booking["status"] = booking.get("status", "pending")
    booking["payment_status"] = booking.get("payment_status", "unpaid")  # unpaid, paid
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return booking

@api_router.get("/bookings/slots")
async def get_booking_slots(date: Optional[str] = None):
    """Get booking slots with availability status - Public endpoint"""
    # Define available time slots
    time_slots = [
        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
    ]
    
    # Get bookings for the specified date or all upcoming
    query = {}
    if date:
        query["appointment_date"] = date
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(100)
    
    # Create slot status map
    slot_map = {}
    for booking in bookings:
        key = f"{booking.get('appointment_date')}_{booking.get('time_slot')}"
        payment_status = booking.get('payment_status', 'unpaid')
        booking_status = booking.get('status', 'pending')
        
        # Determine slot status
        if booking_status == 'cancelled':
            continue  # Cancelled bookings don't block slots
        elif payment_status == 'paid':
            slot_map[key] = {
                "status": "booked_paid",
                "booking_id": booking.get("id"),
                "customer_name": booking.get("customerName", booking.get("customer_name", "Customer"))
            }
        else:
            slot_map[key] = {
                "status": "booked_unpaid",
                "booking_id": booking.get("id"),
                "customer_name": booking.get("customerName", booking.get("customer_name", "Customer"))
            }
    
    return {
        "time_slots": time_slots,
        "slot_map": slot_map,
        "date": date
    }

@api_router.get("/bookings/slots/{date}")
async def get_slots_for_date(date: str):
    """Get slot availability for a specific date - Public endpoint"""
    time_slots = [
        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
    ]
    
    # Get bookings for this date
    bookings = await db.bookings.find(
        {"appointment_date": date, "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).to_list(100)
    
    # Build slot list with status
    slots = []
    for slot in time_slots:
        booking = next((b for b in bookings if b.get("time_slot") == slot), None)
        if booking:
            payment_status = booking.get("payment_status", "unpaid")
            slots.append({
                "time": slot,
                "status": "booked_paid" if payment_status == "paid" else "booked_unpaid",
                "booking_id": booking.get("id"),
                "customer_name": booking.get("customerName", booking.get("customer_name", "")),
                "service": booking.get("serviceName", booking.get("service", ""))
            })
        else:
            slots.append({
                "time": slot,
                "status": "available",
                "booking_id": None,
                "customer_name": None,
                "service": None
            })
    
    return {"date": date, "slots": slots}

@api_router.put("/bookings/{booking_id}/payment")
async def update_booking_payment(booking_id: str, payment_data: dict, current_user: dict = Depends(get_current_user)):
    """Update payment status for a booking"""
    update_data = {
        "payment_status": payment_data.get("payment_status", "paid"),
        "payment_amount": payment_data.get("amount"),
        "payment_mode": payment_data.get("payment_mode"),
        "payment_date": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Payment status updated successfully"}

@api_router.put("/bookings/{booking_id}")
async def update_booking(booking_id: str, booking_data: dict, current_user: dict = Depends(get_current_user)):
    # Superadmin and owner can edit directly
    if current_user["role"] in ["superadmin", "owner"]:
        booking_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.bookings.update_one({"id": booking_id}, {"$set": booking_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Booking not found")
        return {"message": "Booking updated successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to edit")

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        result = await db.bookings.delete_one({"id": booking_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Booking not found")
        return {"message": "Booking deleted successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to delete")

# Vehicle Entries
@api_router.get("/entries")
async def get_entries(current_user: dict = Depends(get_current_user)):
    entries = await db.entries.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return entries

@api_router.post("/entries")
async def create_entry(entry: dict, current_user: dict = Depends(get_current_user)):
    # Generate token number for today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count today's entries to generate sequential token
    today_count = await db.entries.count_documents({
        "created_at": {"$regex": f"^{today}"}
    })
    token_number = today_count + 1
    token_display = f"WS-{token_number:03d}"
    
    entry["id"] = str(uuid.uuid4())
    entry["token_number"] = token_number
    entry["token_display"] = token_display
    entry["token_status"] = "waiting"  # waiting, in_progress, completed
    entry["created_at"] = datetime.now(timezone.utc).isoformat()
    entry["created_by"] = current_user["username"]
    await db.entries.insert_one(entry)
    entry.pop("_id", None)
    return entry

# ============== TOKEN SYSTEM ==============

@api_router.get("/tokens/display")
async def get_token_display():
    """Get tokens for public display - No auth required"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get today's entries with tokens
    entries = await db.entries.find(
        {"created_at": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).sort("token_number", 1).to_list(100)
    
    # Categorize by status
    waiting = [e for e in entries if e.get("token_status") == "waiting"]
    in_progress = [e for e in entries if e.get("token_status") == "in_progress"]
    completed = [e for e in entries if e.get("token_status") == "completed"]
    
    # Get the current token being served (first in_progress or first waiting)
    current_token = None
    if in_progress:
        current_token = in_progress[0]
    elif waiting:
        current_token = waiting[0]
    
    return {
        "date": today,
        "current_token": current_token,
        "waiting": waiting,
        "in_progress": in_progress,
        "completed": completed,
        "total_today": len(entries),
        "waiting_count": len(waiting),
        "in_progress_count": len(in_progress),
        "completed_count": len(completed)
    }

@api_router.put("/tokens/{entry_id}/status")
async def update_token_status(entry_id: str, status_data: dict, current_user: dict = Depends(get_current_user)):
    """Update token status - Admin only"""
    new_status = status_data.get("status")
    if new_status not in ["waiting", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "token_status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status == "in_progress":
        update_data["started_at"] = datetime.now(timezone.utc).isoformat()
    elif new_status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.entries.update_one({"id": entry_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"message": f"Token status updated to {new_status}"}

@api_router.post("/tokens/call-next")
async def call_next_token(current_user: dict = Depends(get_current_user)):
    """Call the next waiting token - Admin only"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Mark current in_progress as completed
    await db.entries.update_many(
        {"token_status": "in_progress", "created_at": {"$regex": f"^{today}"}},
        {"$set": {"token_status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get next waiting token
    next_token = await db.entries.find_one(
        {"token_status": "waiting", "created_at": {"$regex": f"^{today}"}},
        {"_id": 0},
        sort=[("token_number", 1)]
    )
    
    if next_token:
        await db.entries.update_one(
            {"id": next_token["id"]},
            {"$set": {"token_status": "in_progress", "started_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": f"Now serving token {next_token['token_display']}", "token": next_token}
    
    return {"message": "No more tokens in queue", "token": None}

@api_router.put("/entries/{entry_id}")
async def update_entry(entry_id: str, entry_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        entry_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.entries.update_one({"id": entry_id}, {"$set": entry_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"message": "Entry updated successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to edit")

@api_router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        result = await db.entries.delete_one({"id": entry_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"message": "Entry deleted successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to delete")

# Services
@api_router.get("/services")
async def get_services():
    # Public endpoint
    services = await db.services.find({}, {"_id": 0}).to_list(100)
    return services

@api_router.post("/services")
async def create_service(service: dict, current_user: dict = Depends(get_current_user)):
    service["id"] = str(uuid.uuid4())
    service["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.services.insert_one(service)
    service.pop("_id", None)
    return service

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, service_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        service_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.services.update_one({"id": service_id}, {"$set": service_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Service not found")
        return {"message": "Service updated successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to edit")

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        result = await db.services.delete_one({"id": service_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Service not found")
        return {"message": "Service deleted successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to delete")

# Installers
@api_router.get("/installers")
async def get_installers(current_user: dict = Depends(get_current_user)):
    installers = await db.installers.find({}, {"_id": 0}).to_list(100)
    return installers

@api_router.post("/installers")
async def create_installer(installer: dict, current_user: dict = Depends(get_current_user)):
    installer["id"] = str(uuid.uuid4())
    installer["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.installers.insert_one(installer)
    installer.pop("_id", None)
    return installer

@api_router.put("/installers/{installer_id}")
async def update_installer(installer_id: str, installer_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        installer_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.installers.update_one({"id": installer_id}, {"$set": installer_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Installer not found")
        return {"message": "Installer updated successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to edit")

@api_router.delete("/installers/{installer_id}")
async def delete_installer(installer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        result = await db.installers.delete_one({"id": installer_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Installer not found")
        return {"message": "Installer deleted successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to delete")

# Installer Payments
@api_router.get("/installer-payments")
async def get_installer_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.installer_payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

@api_router.post("/installer-payments")
async def create_installer_payment(payment: dict, current_user: dict = Depends(get_current_user)):
    payment["id"] = str(uuid.uuid4())
    payment["created_at"] = datetime.now(timezone.utc).isoformat()
    payment["created_by"] = current_user["username"]
    await db.installer_payments.insert_one(payment)
    payment.pop("_id", None)
    return payment

@api_router.put("/installer-payments/{payment_id}")
async def update_installer_payment(payment_id: str, payment_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        payment_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.installer_payments.update_one({"id": payment_id}, {"$set": payment_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Payment not found")
        return {"message": "Payment updated successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to edit")

@api_router.delete("/installer-payments/{payment_id}")
async def delete_installer_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["superadmin", "owner"]:
        result = await db.installer_payments.delete_one({"id": payment_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Payment not found")
        return {"message": "Payment deleted successfully"}
    else:
        raise HTTPException(status_code=403, detail="Admin users must submit an approval request to delete")

# ============== EMPLOYEE PERFORMANCE (Owner Only) ==============

class PerformanceReview(BaseModel):
    employee_id: str
    employee_name: str
    review_period: str  # e.g., "Q1 2025", "Jan 2025"
    sincerity: int  # 1-10
    target_achievement: int  # 1-10
    personality_improvement: int  # 1-10
    communication: int  # 1-10
    leadership: int  # 1-10
    comments: Optional[str] = None
    salary_recommendation: Optional[str] = None  # e.g., "10% hike", "No change"

@api_router.get("/performance/employees")
async def get_employees_for_review(current_user: dict = Depends(get_current_user)):
    """Get all employees (admin, superadmin) for performance review - Owner only"""
    await require_role(["owner"], current_user)
    
    # Get all non-owner users as employees
    employees = await db.users.find(
        {"role": {"$in": ["admin", "superadmin"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    return employees

@api_router.post("/performance/reviews")
async def create_performance_review(review: PerformanceReview, current_user: dict = Depends(get_current_user)):
    """Create a new performance review - Owner only"""
    await require_role(["owner"], current_user)
    
    # Calculate total and average score
    scores = [review.sincerity, review.target_achievement, review.personality_improvement, 
              review.communication, review.leadership]
    total_score = sum(scores)
    average_score = total_score / len(scores)
    
    # Determine performance grade
    if average_score >= 9:
        grade = "Outstanding"
    elif average_score >= 7:
        grade = "Excellent"
    elif average_score >= 5:
        grade = "Good"
    elif average_score >= 3:
        grade = "Needs Improvement"
    else:
        grade = "Poor"
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": review.employee_id,
        "employee_name": review.employee_name,
        "review_period": review.review_period,
        "sincerity": review.sincerity,
        "target_achievement": review.target_achievement,
        "personality_improvement": review.personality_improvement,
        "communication": review.communication,
        "leadership": review.leadership,
        "total_score": total_score,
        "average_score": round(average_score, 2),
        "grade": grade,
        "comments": review.comments,
        "salary_recommendation": review.salary_recommendation,
        "reviewed_by": current_user["username"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.performance_reviews.insert_one(review_doc)
    review_doc.pop("_id", None)
    return review_doc

@api_router.get("/performance/reviews")
async def get_performance_reviews(
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all performance reviews - Owner only"""
    await require_role(["owner"], current_user)
    
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    
    reviews = await db.performance_reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.get("/performance/reviews/{review_id}")
async def get_performance_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific performance review - Owner only"""
    await require_role(["owner"], current_user)
    
    review = await db.performance_reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@api_router.put("/performance/reviews/{review_id}")
async def update_performance_review(
    review_id: str, 
    review_data: dict, 
    current_user: dict = Depends(get_current_user)
):
    """Update a performance review - Owner only"""
    await require_role(["owner"], current_user)
    
    # Recalculate scores if criteria are updated
    if any(key in review_data for key in ["sincerity", "target_achievement", "personality_improvement", "communication", "leadership"]):
        existing = await db.performance_reviews.find_one({"id": review_id})
        if existing:
            scores = [
                review_data.get("sincerity", existing.get("sincerity", 0)),
                review_data.get("target_achievement", existing.get("target_achievement", 0)),
                review_data.get("personality_improvement", existing.get("personality_improvement", 0)),
                review_data.get("communication", existing.get("communication", 0)),
                review_data.get("leadership", existing.get("leadership", 0))
            ]
            total_score = sum(scores)
            average_score = total_score / len(scores)
            
            if average_score >= 9:
                grade = "Outstanding"
            elif average_score >= 7:
                grade = "Excellent"
            elif average_score >= 5:
                grade = "Good"
            elif average_score >= 3:
                grade = "Needs Improvement"
            else:
                grade = "Poor"
            
            review_data["total_score"] = total_score
            review_data["average_score"] = round(average_score, 2)
            review_data["grade"] = grade
    
    review_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.performance_reviews.update_one({"id": review_id}, {"$set": review_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review updated successfully"}

@api_router.delete("/performance/reviews/{review_id}")
async def delete_performance_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a performance review - Owner only"""
    await require_role(["owner"], current_user)
    
    result = await db.performance_reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted successfully"}

@api_router.get("/performance/summary")
async def get_performance_summary(current_user: dict = Depends(get_current_user)):
    """Get performance summary statistics - Owner only"""
    await require_role(["owner"], current_user)
    
    # Get all reviews
    reviews = await db.performance_reviews.find({}, {"_id": 0}).to_list(1000)
    
    # Get unique employees
    employees = await db.users.find(
        {"role": {"$in": ["admin", "superadmin"]}},
        {"_id": 0, "id": 1, "name": 1, "username": 1, "role": 1}
    ).to_list(100)
    
    # Calculate stats per employee
    employee_stats = []
    for emp in employees:
        emp_reviews = [r for r in reviews if r["employee_id"] == emp["id"]]
        if emp_reviews:
            latest_review = emp_reviews[0]  # Already sorted by created_at desc
            avg_score = sum(r["average_score"] for r in emp_reviews) / len(emp_reviews)
            employee_stats.append({
                "employee_id": emp["id"],
                "employee_name": emp.get("name", emp["username"]),
                "role": emp["role"],
                "total_reviews": len(emp_reviews),
                "latest_grade": latest_review["grade"],
                "latest_score": latest_review["average_score"],
                "average_score_all_time": round(avg_score, 2),
                "latest_recommendation": latest_review.get("salary_recommendation", "N/A")
            })
        else:
            employee_stats.append({
                "employee_id": emp["id"],
                "employee_name": emp.get("name", emp["username"]),
                "role": emp["role"],
                "total_reviews": 0,
                "latest_grade": "Not Reviewed",
                "latest_score": 0,
                "average_score_all_time": 0,
                "latest_recommendation": "N/A"
            })
    
    # Sort by latest score descending
    employee_stats.sort(key=lambda x: x["latest_score"], reverse=True)
    
    return {
        "total_employees": len(employees),
        "total_reviews": len(reviews),
        "employee_stats": employee_stats
    }

# ============== SEED DEFAULT OWNER ==============

@app.on_event("startup")
async def seed_owner():
    # Create default owner if not exists
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
            "must_change_password": True
        }
        await db.users.insert_one(owner_doc)
        logger.info("Default owner account created: owner / owner123")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
