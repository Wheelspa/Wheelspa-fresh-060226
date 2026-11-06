from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import re
import logging
import secrets
import time
from collections import defaultdict
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from pymongo import ReturnDocument

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
_test_clients = {}

# Safety check for tests: prevent test execution against real database
if os.environ.get("IS_TESTING") == "true":
    real_db_name = os.environ.get("REAL_DB_NAME", "wheelspa_dev").strip('"\'')
    current_db_name = os.environ.get("DB_NAME", "").strip('"\'')
    if current_db_name == real_db_name or not current_db_name.endswith("_test"):
        raise RuntimeError(
            f"SAFETY ABORT: Tests must never connect to real database '{real_db_name}'. "
            f"Current DB_NAME is '{current_db_name}'. Must end with '_test'."
        )

class DatabaseProxy:
    """
    Proxy providing database access.
    In normal production runs: directly uses the single `client` instance connected to DB_NAME.
    In testing mode (IS_TESTING == 'true'): maintains event-loop-safe clients across test coroutines.
    """
    def __getattr__(self, name):
        if os.environ.get("IS_TESTING") == "true":
            try:
                loop = asyncio.get_running_loop()
                if loop not in _test_clients:
                    _test_clients[loop] = AsyncIOMotorClient(mongo_url)
                return _test_clients[loop][os.environ['DB_NAME']][name]
            except RuntimeError:
                pass
        return client[os.environ['DB_NAME']][name]

    @property
    def name(self):
        return os.environ['DB_NAME']

    def __getitem__(self, name):
        return self.__getattr__(name)

db = DatabaseProxy()

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

class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: Optional[str] = None
    customerName: Optional[str] = None
    customer_name: Optional[str] = None
    phone: str
    email: Optional[str] = ""
    service: str
    serviceName: Optional[str] = None
    carBrand: Optional[str] = ""
    car_brand: Optional[str] = None
    carModel: Optional[str] = ""
    carNumber: str
    car_number: Optional[str] = None
    appointmentDate: Optional[str] = None
    appointment_date: Optional[str] = None
    timeSlot: Optional[str] = None
    time_slot: Optional[str] = None
    notes: Optional[str] = ""
    status: Optional[str] = "pending"
    payment_status: Optional[str] = "unpaid"
    createdAt: Optional[str] = None

class BookingStatusUpdate(BaseModel):
    status: str

class CustomerServiceItem(BaseModel):
    key: str
    label: Optional[str] = ""
    selected: bool = False
    amount: float = 0.0
    detail: Optional[str] = None

class ShareLinkToggleRequest(BaseModel):
    disabled: Optional[bool] = None

class CustomerQuotationCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    quotation_no: Optional[str] = None
    quotation_date: Optional[str] = None
    customer_name: str
    mobile: str
    vehicle_model: str
    ppf_package: Optional[str] = None
    ppf_price: Optional[float] = None
    services: Optional[List[CustomerServiceItem]] = []
    discount: Optional[float] = 0.0

class CustomerQuotationUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")
    customer_name: Optional[str] = None
    quotation_date: Optional[str] = None
    mobile: Optional[str] = None
    vehicle_model: Optional[str] = None
    ppf_package: Optional[str] = None
    ppf_price: Optional[float] = None
    services: Optional[List[CustomerServiceItem]] = None
    discount: Optional[float] = None

class CustomerQuotationRespond(BaseModel):
    decision: str
    reason: Optional[str] = None

class QuotationCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    quotation_no: Optional[str] = None
    quotationNo: Optional[str] = None
    quotation_date: Optional[str] = None
    quotationDate: Optional[str] = None
    customer_name: Optional[str] = None
    customerName: Optional[str] = None
    mobile_number: Optional[str] = None
    mobileNumber: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicleModel: Optional[str] = None
    ppf_package: Optional[str] = None
    ppfPackage: Optional[str] = None
    basic_cost: Optional[float] = 0.0
    basicCost: Optional[float] = 0.0
    installer_charges: Optional[float] = 0.0
    installerCharges: Optional[float] = 0.0
    detailing_charges: Optional[float] = 0.0
    detailingCharges: Optional[float] = 0.0
    margin_percentage: Optional[float] = 30.0
    marginPercentage: Optional[float] = None
    gst_percentage: Optional[float] = 18.0
    gstPercentage: Optional[float] = None

# ============== HELPER FUNCTIONS ==============

def calculate_quotation_totals(
    basic_cost: float,
    installer_charges: float,
    detailing_charges: float,
    margin_percentage: float,
    gst_percentage: float
) -> dict:
    total_cost = round(basic_cost + installer_charges + detailing_charges, 2)
    margin_amount = round(total_cost * (margin_percentage / 100.0), 2)
    total_cost_incl_margin = round(total_cost + margin_amount, 2)
    gst_amount = round(total_cost_incl_margin * (gst_percentage / 100.0), 2)
    final_quotation_value = round(total_cost_incl_margin + gst_amount, 2)
    return {
        "total_cost": total_cost,
        "margin_amount": margin_amount,
        "total_cost_incl_margin": total_cost_incl_margin,
        "gst_amount": gst_amount,
        "final_quotation_value": final_quotation_value
    }

def mask_mobile_number(mobile: str) -> str:
    cleaned = re.sub(r"\D", "", mobile or "")
    if len(cleaned) < 5:
        return "XXXXX"
    masked_middle = "X" * (len(cleaned) - 5)
    return f"{cleaned[:2]}{masked_middle}{cleaned[-3:]}"

def calculate_valid_until(quotation_date_str: str) -> str:
    valid_days = int(os.environ.get("QUOTATION_VALID_DAYS", 15))
    try:
        q_date = datetime.strptime(quotation_date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        try:
            q_date = datetime.fromisoformat(quotation_date_str.replace("Z", "+00:00"))
        except Exception:
            q_date = datetime.now()
    valid_until = q_date + timedelta(days=valid_days)
    return valid_until.strftime("%Y-%m-%d")

def get_client_ip(request: Request) -> str:
    """Extract first IP from X-Forwarded-For (Render proxy) or fall back to client host"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"

_customer_public_rate_limit_records = defaultdict(list)

def check_customer_public_rate_limit(client_ip: str, limit: int = 30, window_seconds: int = 60) -> bool:
    now = time.time()
    records = _customer_public_rate_limit_records[client_ip]
    valid_records = [t for t in records if now - t < window_seconds]
    _customer_public_rate_limit_records[client_ip] = valid_records
    if len(valid_records) >= limit:
        return False
    _customer_public_rate_limit_records[client_ip].append(now)
    return True

def format_customer_quotation_number(seq: int) -> str:
    return f"WSCQ-{seq:03d}"

async def get_next_customer_quotation_seq() -> int:
    counter = await db.counters.find_one_and_update(
        {"_id": "customer_quotation_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return counter["seq"]

async def peek_next_customer_quotation_seq() -> int:
    counter = await db.counters.find_one({"_id": "customer_quotation_number"})
    current_seq = counter.get("seq", 0) if counter else 0
    return current_seq + 1

STANDARD_CUSTOMER_SERVICE_KEYS = [
    {"key": "paint_protection_film", "label": "Paint Protection Film (PPF)"},
    {"key": "window_filming", "label": "Window Filming"},
    {"key": "ceramic_coating", "label": "Ceramic Coating"},
    {"key": "graphene_coating", "label": "Graphene Coating"},
    {"key": "interior_ppf", "label": "Interior PPF"},
    {"key": "sunroof_ppf", "label": "Sunroof PPF"}
]

def calculate_customer_quotation_totals(
    services_or_ppf=None,
    services=None,
    discount: float = 0.0,
    ppf_price: float = 0.0,
    gst_rate: float = 18.0,
    **kwargs
) -> dict:
    actual_services = []
    actual_ppf_price = float(ppf_price or 0.0)
    actual_discount = float(discount or 0.0)
    actual_gst_rate = float(gst_rate or 18.0)

    if isinstance(services_or_ppf, list):
        actual_services = services_or_ppf
    elif isinstance(services_or_ppf, (int, float)):
        actual_ppf_price = float(services_or_ppf)
        if services is not None:
            actual_services = services
    elif services is not None:
        actual_services = services

    if "discount" in kwargs:
        actual_discount = float(kwargs["discount"] or 0.0)
    if "ppf_price" in kwargs:
        actual_ppf_price = float(kwargs["ppf_price"] or 0.0)
    if "gst_rate" in kwargs:
        actual_gst_rate = float(kwargs["gst_rate"] or 18.0)

    selected_services_sum = sum(
        float(s.get("amount", 0.0) or 0.0)
        for s in actual_services
        if (isinstance(s, dict) and s.get("selected"))
    )
    raw_subtotal = actual_ppf_price + selected_services_sum - actual_discount
    subtotal = round(max(0.0, raw_subtotal), 2)
    gst_amount = round(subtotal * (actual_gst_rate / 100.0), 2)
    final_price = round(subtotal + gst_amount, 2)
    return {
        "subtotal": subtotal,
        "gst_amount": gst_amount,
        "final_price": final_price
    }

def format_quotation_number(seq: int) -> str:
    return f"WSPPF-{seq:03d}"

async def get_next_quotation_seq() -> int:
    counter = await db.counters.find_one_and_update(
        {"_id": "quotation_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return counter["seq"]

async def peek_next_quotation_seq() -> int:
    counter = await db.counters.find_one({"_id": "quotation_number"})
    current_seq = counter.get("seq", 0) if counter else 0
    return current_seq + 1

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
async def create_booking(booking_data: BookingCreate):
    # Public endpoint - no auth required
    booking = booking_data.model_dump()
    
    # Ensure both carNumber and car_number are populated
    car_num = booking.get("carNumber") or booking.get("car_number")
    booking["carNumber"] = car_num
    booking["car_number"] = car_num
    
    # Extract appointment date and time slot for conflict check
    appointment_date = booking.get("appointment_date") or booking.get("appointmentDate")
    time_slot = booking.get("time_slot") or booking.get("timeSlot")
    
    if appointment_date and time_slot:
        existing = await db.bookings.find_one({
            "$and": [
                {"$or": [{"appointment_date": appointment_date}, {"appointmentDate": appointment_date}]},
                {"$or": [{"time_slot": time_slot}, {"timeSlot": time_slot}]},
                {"status": {"$nin": ["cancelled", "rejected"]}}
            ]
        })
        if existing:
            raise HTTPException(
                status_code=409,
                detail="This time slot has already been booked. Please select another time slot."
            )

    # Generate booking ID on backend with WS-BK- prefix (ignore client-supplied id)
    booking["id"] = f"WS-BK-{uuid.uuid4().hex[:8].upper()}"
    booking["created_at"] = datetime.now(timezone.utc).isoformat()
    booking["status"] = booking.get("status") or "pending"
    booking["payment_status"] = booking.get("payment_status") or "unpaid"  # unpaid, paid
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return booking

@api_router.get("/bookings/slots")
async def get_booking_slots(date: Optional[str] = None):
    """Get booking slots with availability status - Public endpoint"""
    # Define available time slots
    time_slots = [
        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
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
        if booking_status in ['cancelled', 'rejected']:
            continue  # Cancelled and rejected bookings don't block slots
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
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
    ]
    
    # Get bookings for this date
    bookings = await db.bookings.find(
        {
            "$or": [{"appointment_date": date}, {"appointmentDate": date}],
            "status": {"$nin": ["cancelled", "rejected"]}
        },
        {"_id": 0}
    ).to_list(100)
    
    # Build slot list with status
    slots = []
    for slot in time_slots:
        booking = next((b for b in bookings if (b.get("time_slot") or b.get("timeSlot")) == slot), None)
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

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_data: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    await require_role(["admin", "superadmin", "owner"], current_user)
    
    valid_statuses = ["confirmed", "rejected", "completed", "cancelled"]
    new_status = status_data.status
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Allowed statuses: {', '.join(valid_statuses)}."
        )
    
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    current_status = booking.get("status", "pending")
    
    # Allowed transitions only:
    # - pending -> confirmed or rejected
    # - confirmed -> completed or cancelled
    allowed_transitions = {
        "pending": ["confirmed", "rejected"],
        "confirmed": ["completed", "cancelled"]
    }
    
    allowed = allowed_transitions.get(current_status, [])
    if new_status not in allowed:
        if allowed:
            allowed_str = ", ".join(f"'{s}'" for s in allowed)
            detail_msg = f"Cannot transition booking from '{current_status}' to '{new_status}'. Allowed transitions: {allowed_str}."
        else:
            detail_msg = f"Cannot transition booking from terminal status '{current_status}'."
        raise HTTPException(status_code=409, detail=detail_msg)
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status_updated_by": current_user.get("username")
    }
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    return {
        "message": f"Booking status updated to {new_status}",
        "id": booking_id,
        "status": new_status
    }

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

# ============== PPF QUOTATIONS ==============

@api_router.get("/quotations/next-number")
async def get_next_quotation_number(current_user: dict = Depends(get_current_user)):
    """Get the next preview quotation number without advancing counter - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    next_seq = await peek_next_quotation_seq()
    return {"next_quotation_number": format_quotation_number(next_seq)}

@api_router.post("/quotations")
async def create_quotation(data: QuotationCreate, current_user: dict = Depends(get_current_user)):
    """Create a new PPF quotation - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)

    customer_name = (data.customer_name or data.customerName or "").strip()
    mobile_input = (data.mobile_number or data.mobileNumber or "").strip()
    vehicle_model = (data.vehicle_model or data.vehicleModel or "").strip()
    ppf_package = (data.ppf_package or data.ppfPackage or "").strip()
    quotation_date = (data.quotation_date or data.quotationDate or datetime.now().strftime("%Y-%m-%d")).strip()

    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer Name is required")

    cleaned_mobile = re.sub(r"\D", "", mobile_input)
    if len(cleaned_mobile) != 10:
        raise HTTPException(status_code=400, detail="Mobile Number must be 10 digits")

    if not vehicle_model:
        raise HTTPException(status_code=400, detail="Vehicle / Model is required")

    if not ppf_package:
        raise HTTPException(status_code=400, detail="PPF Package / Film is required")

    def parse_float(val, default=0.0):
        if val is None or val == "":
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Costs and percentages must be valid numbers")

    basic_cost = parse_float(data.basic_cost if data.basic_cost is not None else data.basicCost, 0.0)
    installer_charges = parse_float(data.installer_charges if data.installer_charges is not None else data.installerCharges, 0.0)
    detailing_charges = parse_float(data.detailing_charges if data.detailing_charges is not None else data.detailingCharges, 0.0)
    margin_percentage = parse_float(data.margin_percentage if data.margin_percentage is not None else (data.marginPercentage if data.marginPercentage is not None else 30.0), 30.0)
    gst_percentage = parse_float(data.gst_percentage if data.gst_percentage is not None else (data.gstPercentage if data.gstPercentage is not None else 18.0), 18.0)

    if basic_cost < 0 or installer_charges < 0 or detailing_charges < 0:
        raise HTTPException(status_code=400, detail="Cost values must be numbers >= 0")

    if margin_percentage < 0 or gst_percentage < 0:
        raise HTTPException(status_code=400, detail="Margin % and GST % must be >= 0")

    # Generate quotation number with atomic counter (Ignore any client-sent number)
    seq = await get_next_quotation_seq()
    quotation_number = format_quotation_number(seq)

    # Recalculate all totals on the backend
    totals = calculate_quotation_totals(
        basic_cost=basic_cost,
        installer_charges=installer_charges,
        detailing_charges=detailing_charges,
        margin_percentage=margin_percentage,
        gst_percentage=gst_percentage
    )

    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "quotation_number": quotation_number,
        "quotation_no": quotation_number,
        "quotationNo": quotation_number,
        "sequence_number": seq,
        "quotation_date": quotation_date,
        "quotationDate": quotation_date,
        "customer_name": customer_name,
        "customerName": customer_name,
        "mobile_number": cleaned_mobile,
        "mobileNumber": cleaned_mobile,
        "vehicle_model": vehicle_model,
        "vehicleModel": vehicle_model,
        "ppf_package": ppf_package,
        "ppfPackage": ppf_package,
        "basic_cost": basic_cost,
        "basicCost": basic_cost,
        "installer_charges": installer_charges,
        "installerCharges": installer_charges,
        "detailing_charges": detailing_charges,
        "detailingCharges": detailing_charges,
        "margin_percentage": margin_percentage,
        "marginPercentage": margin_percentage,
        "gst_percentage": gst_percentage,
        "gstPercentage": gst_percentage,
        "total_cost": totals["total_cost"],
        "totalCost": totals["total_cost"],
        "margin_amount": totals["margin_amount"],
        "marginAmount": totals["margin_amount"],
        "total_cost_incl_margin": totals["total_cost_incl_margin"],
        "totalCostInclMargin": totals["total_cost_incl_margin"],
        "gst_amount": totals["gst_amount"],
        "gstAmount": totals["gst_amount"],
        "final_quotation_value": totals["final_quotation_value"],
        "finalQuotationValue": totals["final_quotation_value"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["username"],
        "created_by_name": current_user.get("name", "")
    }

    await db.quotations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/quotations")
async def list_quotations(current_user: dict = Depends(get_current_user)):
    """List quotations newest first - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotations = await db.quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotations

@api_router.get("/quotations/{id}")
async def get_quotation_by_id(id: str, current_user: dict = Depends(get_current_user)):
    """Get single quotation by id or quotation number - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotation = await db.quotations.find_one(
        {"$or": [{"id": id}, {"quotation_number": id}, {"quotation_no": id}]},
        {"_id": 0}
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

@api_router.delete("/quotations/{id}")
async def delete_quotation(id: str, current_user: dict = Depends(get_current_user)):
    """Delete a saved PPF quotation - Owner and Superadmin only. Counter is NEVER decremented or reset."""
    await require_role(["owner", "superadmin"], current_user)
    result = await db.quotations.delete_one(
        {"$or": [{"id": id}, {"quotation_number": id}, {"quotation_no": id}]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return {"message": "Quotation deleted successfully", "id": id}

# ============== CUSTOMER QUOTATIONS (WSCQ) ==============

def _sanitize_customer_services(raw_services: Optional[List[Any]]) -> List[dict]:
    service_map = {}
    if raw_services:
        for s in raw_services:
            if isinstance(s, dict):
                k = s.get("key")
                service_map[k] = s
            elif hasattr(s, "model_dump"):
                d = s.model_dump()
                service_map[d.get("key")] = d
            elif hasattr(s, "dict"):
                d = s.dict()
                service_map[d.get("key")] = d

    result = []
    for std in STANDARD_CUSTOMER_SERVICE_KEYS:
        k = std["key"]
        found = service_map.get(k, {})
        raw_detail = found.get("detail")
        detail = str(raw_detail).strip()[:100] if raw_detail is not None and str(raw_detail).strip() else None
        result.append({
            "key": k,
            "label": std["label"],
            "selected": bool(found.get("selected", False)),
            "amount": max(0.0, float(found.get("amount", 0.0) or 0.0)),
            "detail": detail
        })
    return result

@api_router.get("/customer-quotations/next-number")
async def get_next_customer_quotation_number(current_user: dict = Depends(get_current_user)):
    """Get the preview next customer quotation number without advancing counter - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    next_seq = await peek_next_customer_quotation_seq()
    return {"next_quotation_number": format_customer_quotation_number(next_seq)}

@api_router.post("/customer-quotations")
async def create_customer_quotation(data: CustomerQuotationCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer quotation with auto WSCQ sequence number - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)

    customer_name = (data.customer_name or "").strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer Name is required")

    cleaned_mobile = re.sub(r"\D", "", data.mobile or "")
    if len(cleaned_mobile) != 10:
        raise HTTPException(status_code=400, detail="Mobile Number must be 10 digits")

    vehicle_model = (data.vehicle_model or "").strip()
    if not vehicle_model:
        raise HTTPException(status_code=400, detail="Vehicle / Model is required")

    quotation_date = (data.quotation_date or datetime.now().strftime("%Y-%m-%d")).strip()
    ppf_package = (data.ppf_package or "").strip() if data.ppf_package else ""
    ppf_price = max(0.0, float(data.ppf_price or 0.0))
    discount = max(0.0, float(data.discount or 0.0))
    services_list = _sanitize_customer_services(data.services)

    # Validate: Require at least one selected service with amount > 0 (or legacy ppf_price > 0)
    has_valid_service = any(
        s.get("selected") and float(s.get("amount", 0.0) or 0.0) > 0
        for s in services_list
    )
    if not has_valid_service and ppf_price <= 0:
        raise HTTPException(
            status_code=422,
            detail="At least one service with an amount greater than 0 must be selected"
        )

    # Recompute all totals on the backend
    totals = calculate_customer_quotation_totals(
        services=services_list,
        discount=discount,
        ppf_price=ppf_price,
        gst_rate=18.0
    )

    # Generate atomic sequence number
    seq = await get_next_customer_quotation_seq()
    quotation_no = format_customer_quotation_number(seq)
    share_token = secrets.token_urlsafe(24)
    doc_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": doc_id,
        "quotation_no": quotation_no,
        "sequence_number": seq,
        "quotation_date": quotation_date,
        "customer_name": customer_name,
        "mobile": cleaned_mobile,
        "vehicle_model": vehicle_model,
        "ppf_package": ppf_package,
        "ppf_price": ppf_price,
        "gst_rate": 18.0,
        "services": services_list,
        "discount": discount,
        "subtotal": totals["subtotal"],
        "gst_amount": totals["gst_amount"],
        "final_price": totals["final_price"],
        "status": "pending",
        "status_updated_at": None,
        "customer_reject_reason": None,
        "share_token": share_token,
        "link_disabled": False,
        "created_at": now_iso,
        "updated_at": None,
        "created_by": current_user["username"],
        "created_by_name": current_user.get("name", "")
    }

    await db.customer_quotations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/customer-quotations")
async def list_customer_quotations(current_user: dict = Depends(get_current_user)):
    """List customer quotations newest first - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotations = await db.customer_quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotations

@api_router.get("/customer-quotations/{id}")
async def get_customer_quotation_by_id(id: str, current_user: dict = Depends(get_current_user)):
    """Get single customer quotation by id or quotation_no - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotation = await db.customer_quotations.find_one(
        {"$or": [{"id": id}, {"quotation_no": id}]},
        {"_id": 0}
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Customer quotation not found")
    return quotation

@api_router.put("/customer-quotations/{id}")
@api_router.patch("/customer-quotations/{id}")
async def update_customer_quotation(id: str, data: CustomerQuotationUpdate, current_user: dict = Depends(get_current_user)):
    """Update a customer quotation - ONLY allowed while status is pending - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotation = await db.customer_quotations.find_one(
        {"$or": [{"id": id}, {"quotation_no": id}]}
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Customer quotation not found")

    if quotation.get("status") != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Quotation cannot be updated because its status is '{quotation.get('status')}'. Please create a revised quotation."
        )

    # Extract or keep existing values
    customer_name = (data.customer_name if data.customer_name is not None else quotation.get("customer_name", "")).strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer Name is required")

    if data.mobile is not None:
        cleaned_mobile = re.sub(r"\D", "", data.mobile)
        if len(cleaned_mobile) != 10:
            raise HTTPException(status_code=400, detail="Mobile Number must be 10 digits")
    else:
        cleaned_mobile = quotation.get("mobile", "")

    vehicle_model = (data.vehicle_model if data.vehicle_model is not None else quotation.get("vehicle_model", "")).strip()
    if not vehicle_model:
        raise HTTPException(status_code=400, detail="Vehicle / Model is required")

    quotation_date = (data.quotation_date if data.quotation_date is not None else quotation.get("quotation_date", "")).strip()
    ppf_package = (data.ppf_package if data.ppf_package is not None else quotation.get("ppf_package", "")).strip()
    ppf_price = max(0.0, float(data.ppf_price if data.ppf_price is not None else quotation.get("ppf_price", 0.0) or 0.0))
    discount = max(0.0, float(data.discount if data.discount is not None else quotation.get("discount", 0.0) or 0.0))

    if data.services is not None:
        services_list = _sanitize_customer_services(data.services)
    else:
        services_list = quotation.get("services", [])

    # Validate: Require at least one selected service with amount > 0 (or legacy ppf_price > 0)
    has_valid_service = any(
        s.get("selected") and float(s.get("amount", 0.0) or 0.0) > 0
        for s in services_list
    )
    if not has_valid_service and ppf_price <= 0:
        raise HTTPException(
            status_code=422,
            detail="At least one service with an amount greater than 0 must be selected"
        )

    # Recompute totals on backend
    totals = calculate_customer_quotation_totals(
        services=services_list,
        discount=discount,
        ppf_price=ppf_price,
        gst_rate=18.0
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = {
        "customer_name": customer_name,
        "mobile": cleaned_mobile,
        "vehicle_model": vehicle_model,
        "quotation_date": quotation_date,
        "ppf_package": ppf_package,
        "ppf_price": ppf_price,
        "services": services_list,
        "discount": discount,
        "subtotal": totals["subtotal"],
        "gst_amount": totals["gst_amount"],
        "final_price": totals["final_price"],
        "updated_at": now_iso
    }

    await db.customer_quotations.update_one(
        {"_id": quotation["_id"]},
        {"$set": update_data}
    )

    updated_doc = await db.customer_quotations.find_one({"_id": quotation["_id"]}, {"_id": 0})
    return updated_doc

@api_router.delete("/customer-quotations/{id}")
async def delete_customer_quotation(id: str, current_user: dict = Depends(get_current_user)):
    """Delete a customer quotation - Owner and Superadmin only"""
    await require_role(["owner", "superadmin"], current_user)
    result = await db.customer_quotations.delete_one(
        {"$or": [{"id": id}, {"quotation_no": id}]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer quotation not found")
    return {"message": "Customer quotation deleted successfully", "id": id}

@api_router.get("/customer-quotations/{id}/share-link")
async def get_customer_quotation_share_link(id: str, current_user: dict = Depends(get_current_user)):
    """Get shareable link for customer quotation (/q2/{token}) - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotation = await db.customer_quotations.find_one(
        {"$or": [{"id": id}, {"quotation_no": id}]}
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Customer quotation not found")

    token = quotation.get("share_token")
    if not token:
        token = secrets.token_urlsafe(24)
        await db.customer_quotations.update_one(
            {"_id": quotation["_id"]},
            {"$set": {"share_token": token, "link_disabled": quotation.get("link_disabled", False)}}
        )

    link_disabled = bool(quotation.get("link_disabled", False))
    return {
        "share_token": token,
        "relative_path": f"/q2/{token}",
        "link_disabled": link_disabled
    }

@api_router.post("/customer-quotations/{id}/share-link/regenerate")
async def regenerate_customer_quotation_share_link(id: str, current_user: dict = Depends(get_current_user)):
    """Regenerate shareable token, invalidating old link - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotation = await db.customer_quotations.find_one(
        {"$or": [{"id": id}, {"quotation_no": id}]}
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Customer quotation not found")

    new_token = secrets.token_urlsafe(24)
    await db.customer_quotations.update_one(
        {"_id": quotation["_id"]},
        {"$set": {"share_token": new_token}}
    )

    link_disabled = bool(quotation.get("link_disabled", False))
    return {
        "share_token": new_token,
        "relative_path": f"/q2/{new_token}",
        "link_disabled": link_disabled,
        "message": "Share link regenerated successfully"
    }

@api_router.post("/customer-quotations/{id}/share-link/toggle")
@api_router.patch("/customer-quotations/{id}/share-link/toggle")
async def toggle_customer_quotation_share_link(
    id: str,
    payload: Optional[ShareLinkToggleRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """Toggle or set disabled state of the customer quotation share link - Owner, Superadmin, Admin"""
    await require_role(["owner", "superadmin", "admin"], current_user)
    quotation = await db.customer_quotations.find_one(
        {"$or": [{"id": id}, {"quotation_no": id}]}
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Customer quotation not found")

    token = quotation.get("share_token")
    if not token:
        token = secrets.token_urlsafe(24)

    current_disabled = bool(quotation.get("link_disabled", False))
    if payload is not None and payload.disabled is not None:
        new_disabled = bool(payload.disabled)
    else:
        new_disabled = not current_disabled

    await db.customer_quotations.update_one(
        {"_id": quotation["_id"]},
        {"$set": {"link_disabled": new_disabled, "share_token": token}}
    )

    status_str = "disabled" if new_disabled else "enabled"
    return {
        "share_token": token,
        "relative_path": f"/q2/{token}",
        "link_disabled": new_disabled,
        "message": f"Share link {status_str} successfully"
    }

@api_router.get("/public/customer-quotations/{token}")
async def get_public_customer_quotation(token: str, request: Request):
    """Customer-facing public view for customer quotation - no auth required"""
    client_ip = get_client_ip(request)

    if not check_customer_public_rate_limit(client_ip, limit=30, window_seconds=60):
        logger.warning(f"Public customer quotation rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    quotation = await db.customer_quotations.find_one({"share_token": token})
    if not quotation or quotation.get("link_disabled") is True:
        logger.warning(
            f"Public customer quotation lookup 404 for token: {token} "
            f"(disabled: {quotation.get('link_disabled') if quotation else 'not found'}) from IP: {client_ip}"
        )
        raise HTTPException(status_code=404, detail="Quotation not found")

    quotation_no = quotation.get("quotation_no", "")
    quotation_date = quotation.get("quotation_date", "")
    valid_until = calculate_valid_until(quotation_date)
    customer_name = quotation.get("customer_name", "")
    masked_mobile = mask_mobile_number(quotation.get("mobile", ""))
    vehicle_model = quotation.get("vehicle_model", "")
    ppf_package = quotation.get("ppf_package", "")
    ppf_price = float(quotation.get("ppf_price", 0.0) or 0.0)
    
    # Return selected services with label, amount, detail only (and key for consistency)
    # Backward compatibility: if legacy ppf_price > 0, prepend it as "Paint Protection Film"
    selected_services = []
    if ppf_price > 0:
        selected_services.append({
            "key": "paint_protection_film",
            "label": "Paint Protection Film",
            "amount": ppf_price,
            "detail": ppf_package or None
        })

    for s in quotation.get("services", []):
        if s.get("selected") and float(s.get("amount", 0.0) or 0.0) > 0:
            if s.get("key") == "paint_protection_film" and ppf_price > 0:
                continue
            selected_services.append({
                "key": s.get("key"),
                "label": s.get("label"),
                "amount": float(s.get("amount", 0.0) or 0.0),
                "detail": s.get("detail") or None
            })

    discount = float(quotation.get("discount", 0.0) or 0.0)
    subtotal = float(quotation.get("subtotal", 0.0) or 0.0)
    gst_rate = float(quotation.get("gst_rate", 18.0) or 18.0)
    gst_amount = float(quotation.get("gst_amount", 0.0) or 0.0)
    final_price = float(quotation.get("final_price", 0.0) or 0.0)
    status = quotation.get("status", "pending")
    status_updated_at = quotation.get("status_updated_at")
    customer_reject_reason = quotation.get("customer_reject_reason")
    last_updated = quotation.get("updated_at")

    # Strict whitelist - absolutely no internal fields or _id
    return {
        "quotation_no": quotation_no,
        "date": quotation_date,
        "quotation_date": quotation_date,
        "valid_until": valid_until,
        "customer_name": customer_name,
        "mobile": masked_mobile,
        "vehicle_model": vehicle_model,
        "ppf_package": ppf_package,
        "ppf_price": ppf_price,
        "services": selected_services,
        "discount": discount,
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "final_price": final_price,
        "status": status,
        "status_updated_at": status_updated_at,
        "customer_reject_reason": customer_reject_reason,
        "last_updated": last_updated
    }

@api_router.post("/public/customer-quotations/{token}/respond")
async def respond_to_public_customer_quotation(
    token: str,
    payload: CustomerQuotationRespond,
    request: Request
):
    """Customer decision (approved/rejected) on customer quotation - atomic and single-response only"""
    client_ip = get_client_ip(request)

    if not check_customer_public_rate_limit(client_ip, limit=30, window_seconds=60):
        logger.warning(f"Public respond rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    quotation = await db.customer_quotations.find_one({"share_token": token})
    if not quotation or quotation.get("link_disabled") is True:
        raise HTTPException(status_code=404, detail="Quotation not found")

    decision = (payload.decision or "").lower().strip()
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'")

    reason = (payload.reason or "").strip()
    if len(reason) > 300:
        raise HTTPException(status_code=400, detail="Reason cannot exceed 300 characters")

    # Check expiration
    valid_until_str = calculate_valid_until(quotation.get("quotation_date", ""))
    is_expired = False
    try:
        valid_until_date = datetime.strptime(valid_until_str, "%Y-%m-%d").date()
        is_expired = datetime.now(timezone.utc).date() > valid_until_date
    except Exception:
        pass

    if is_expired and decision == "approved":
        raise HTTPException(
            status_code=410,
            detail="This quotation has expired and can no longer be approved. Please contact Wheelspa for a revised quotation."
        )

    # If already decided, return 409
    current_status = quotation.get("status", "pending")
    if current_status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Quotation has already been {current_status}"
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    update_set = {
        "status": decision,
        "status_updated_at": now_iso
    }
    if decision == "rejected":
        update_set["customer_reject_reason"] = reason if reason else None
    else:
        update_set["customer_reject_reason"] = None

    # Atomic update with status == "pending" filter
    result = await db.customer_quotations.update_one(
        {"share_token": token, "status": "pending"},
        {"$set": update_set}
    )

    if result.modified_count == 0:
        fresh = await db.customer_quotations.find_one({"share_token": token})
        fresh_status = fresh.get("status") if fresh else "decided"
        raise HTTPException(
            status_code=409,
            detail=f"Quotation has already been {fresh_status}"
        )

    return {
        "quotation_no": quotation.get("quotation_no"),
        "status": decision,
        "status_updated_at": now_iso,
        "customer_reject_reason": reason if decision == "rejected" else None,
        "message": f"Quotation has been {decision} successfully"
    }

@api_router.get("/system/db-info")
async def get_db_info():
    """Return database name and test status for test suite safety verification only when IS_TESTING == 'true'"""
    if os.environ.get("IS_TESTING") != "true":
        raise HTTPException(status_code=404, detail="Not found")
    current_db = os.environ.get("DB_NAME", "").strip('"\'')
    return {
        "db_name": current_db,
        "is_test_db": current_db.endswith("_test")
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
    for c in _test_clients.values():
        c.close()
