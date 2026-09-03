# Wheelspa Full-Stack Web Application Documentation

This document provides a comprehensive technical analysis of the **Wheelspa** full-stack web application (React frontend + FastAPI/Python backend + MongoDB database). It serves as an authoritative reference for project structure, frontend/backend architecture, data flow, connection mappings, known issues, current user flows, and requirements for a fully production-ready system.

---

## 1. Project Structure Overview

### Directory Tree & Purpose
The workspace is organized into two main application directories (`frontend` and `backend`), along with root configuration and testing documentation files:

```
Wheelspa-fresh-060226/
├── backend/
│   ├── requirements.txt            # Python backend dependencies
│   ├── server.py                  # Main FastAPI application & MongoDB routes
│   └── tests/                     # Backend test suite (pytest)
│       ├── test_auth_roles.py      # Role-based access control & auth tests
│       └── test_employee_performance.py # Employee performance API tests
├── frontend/
│   ├── package.json               # Node.js dependencies & scripts
│   ├── craco.config.js            # CRACO build/path alias configuration
│   ├── tailwind.config.js         # Tailwind CSS styling configuration
│   ├── public/                    # Static assets (index.html, logo-transparent.png)
│   └── src/
│       ├── App.js                 # Main router & page layout routes
│       ├── App.css / index.css    # Global styles & Tailwind imports
│       ├── pages/                 # 22 React Page components
│       ├── components/            # Reusable UI & layout components
│       │   ├── admin/             # Admin layout & sidebar (AdminLayout.jsx)
│       │   ├── layout/            # Public Header, Footer, Layout
│       │   └── ui/                # ~50 Radix UI / shadcn component primitives
│       ├── context/               # AdminAuthContext.jsx (Authentication state)
│       ├── data/                  # Mock data files (mock.js, adminMock.js, installerMock.js)
│       ├── hooks/                 # Custom hooks (use-toast.js)
│       └── lib/                   # Utility helpers (utils.js)
├── test_result.md                 # Agent testing protocol & task state tracker
└── test_reports/                  # Historical test execution logs
```

### Tech Stack & Versions

#### Frontend Stack
- **Framework**: React 19.0.0 (`react`, `react-dom`)
- **Routing**: React Router DOM 7.5.1 (`react-router-dom`)
- **Build Tooling**: CRACO 7.1.0 (`@craco/craco`), Create React App (`react-scripts` 5.0.1)
- **Styling**: Tailwind CSS 3.4.17 (`tailwindcss`), Autoprefixer 10.4.20, PostCSS 8.4.49, Tailwind Merge 3.2.0, Class Variance Authority 0.7.1
- **UI Components & Icons**: Radix UI Primitives (Accordion, Dialog, Select, Popover, Slider, Switch, Tabs, etc.), Lucide React 1.38.0
- **Utilities**: Date-fns 4.1.0, Sonner 2.0.3 (Toasts), Axios 1.8.4, Qrcode.react 4.2.0, Recharts 3.6.0, React Hook Form 7.56.2, Zod 3.24.4

#### Backend Stack
- **Framework**: FastAPI 0.110.1
- **ASGI Server**: Uvicorn 0.25.0
- **Database Driver**: Motor 3.3.1 (AsyncIO MongoDB driver), PyMongo 4.5.0
- **Security & Authentication**: PyJWT 2.10.1, Python-Jose 3.5.0, Passlib 1.7.4 (Bcrypt), Cryptography 46.0.3
- **Data Validation**: Pydantic v2 (2.12.5)
- **Environment Management**: Python-Dotenv 1.2.1
- **Testing**: Pytest 9.0.2, Requests 2.32.5

---

## 2. Frontend Analysis

### Page / Route Inventory (22 Pages)

#### Public Pages (7 Pages)
1. **Home (`/`)** — `pages/Home.jsx`: Landing page featuring hero image carousel, stats counter, service overview cards, testimonials, and why choose Wheelspa highlights. Uses static mock data from `mock.js`.
2. **About (`/about`)** — `pages/About.jsx`: Brand background, story, vision, mission statement, and core values. Uses static mock data from `mock.js`.
3. **Services (`/services`)** — `pages/Services.jsx`: Detailed service catalog (PPF, Ceramic, Graphene, Foam Wash, Interior/Exterior detailing, etc.). Reads from `localStorage` (`wheelspa_services`) or falls back to `mock.js`.
4. **Booking (`/booking`)** — `pages/Booking.jsx`: Customer service booking page with dynamic date picker and interactive time-slot grid. Attempts `POST /api/bookings`; falls back to `localStorage` (`wheelspa_bookings`).
5. **Knowledge Center (`/knowledge`)** — `pages/Knowledge.jsx`: Blog articles, maintenance guides, educational posts, and searchable FAQs with popup detail dialogs. Uses static mock data from `mock.js`.
6. **Contact (`/contact`)** — `pages/Contact.jsx`: Contact information, business hours, interactive Google Map iframe, downloadable QR code widget, and enquiry submission form. (Form uses simulated delay; does not persist).
7. **Token Display (`/token-display`)** — `pages/TokenDisplay.jsx`: Public queue monitor intended for shop TV screens. Auto-refreshes every 5 seconds via `GET /api/tokens/display`. Shows "Now Serving" token, waiting queue, and completed tokens.

#### Admin Portal Pages (11 Pages)
8. **Admin Login (`/admin`)** — `pages/AdminLogin.jsx`: Login portal for staff. Calls `POST /api/auth/login`, stores JWT token in `localStorage`, and updates `AdminAuthContext`.
9. **Admin Dashboard (`/admin/dashboard`)** — `pages/AdminDashboard.jsx`: Staff dashboard displaying entry counts, total revenue, pending jobs, and cash collections. Reads from `localStorage` (`wheelspa_entries`) or `adminMock.js`.
10. **New Entry (`/admin/new-entry`)** — `pages/AdminNewEntry.jsx`: Vehicle check-in form. Calls `POST /api/entries` to store entry and generate a token (`WS-XXX`), displaying a printable token dialog.
11. **All Entries (`/admin/entries`)** — `pages/AdminEntries.jsx`: Vehicle entry table with search, status filters, view modal, and delete options. Reads/modifies `localStorage` (`wheelspa_entries`).
12. **Reports (`/admin/reports`)** — `pages/AdminReports.jsx`: Financial and operational analytics breakdown by payment mode, service type, staff, and date ranges. Reads from `localStorage` (`wheelspa_entries`).
13. **Manage Services (`/admin/services`)** — `pages/AdminServices.jsx`: Add, edit, or delete service offerings. Stores changes in `localStorage` (`wheelspa_services`).
14. **Customer Bookings (`/admin/bookings`)** — `pages/AdminBookings.jsx`: Admin table for reviewing public customer appointments. Reads/modifies `localStorage` (`wheelspa_bookings`).
15. **Booking Slots (`/admin/slots`)** — `pages/BookingSlots.jsx`: Slot availability calendar and slot payment status management. Calls `GET /api/bookings/slots/{date}` and `PUT /api/bookings/{id}/payment`.
16. **Manage Users (`/admin/users`)** — `pages/AdminUsers.jsx`: *(Owner Role Only)* Create, delete, and toggle activation status for system users. Fully connected to `GET/POST/DELETE/PUT /api/users`.
17. **Approval Requests (`/admin/approvals`)** — `pages/AdminApprovals.jsx`: *(Superadmin & Owner Roles)* Review pending edit/delete requests submitted by lower-level admins. Fully connected to `GET/PUT /api/approval-requests`.
18. **Employee Performance (`/admin/performance`)** — `pages/EmployeePerformance.jsx`: *(Owner Role Only)* Rate employees across 5 key metrics (Sincerity, Targets, Personality, Communication, Leadership), generate performance grades, and recommend salary adjustments. Fully connected to `/api/performance/*` endpoints.

#### Installer Payment Management Pages (4 Pages)
19. **Installer Dashboard (`/admin/installer`)** — `pages/InstallerDashboard.jsx`: Summary cards of installer payables, total paid, outstanding balances, and category breakdowns. Reads from `localStorage` (`wheelspa_installer_payments`).
20. **Add Payment (`/admin/installer/new-payment`)** — `pages/InstallerNewPayment.jsx`: Form to record contractor payments (PPF/Window Film installers, garage work). Saves to `localStorage` (`wheelspa_installer_payments`).
21. **All Payments (`/admin/installer/payments`)** — `pages/InstallerPayments.jsx`: Table of installer payments with filters, receipt generation (`InstallerReceipt.jsx`), and status updates. Reads/modifies `localStorage` (`wheelspa_installer_payments`).
22. **Manage Installers (`/admin/installer/installers`)** — `pages/InstallerManage.jsx`: Add, edit, or delete registered contractors and view contractor payout totals. Reads/modifies `localStorage` (`wheelspa_installers`).

---

### Reusable Components

| Component Name | File Location | Purpose & Role |
| :--- | :--- | :--- |
| **Header** | `components/layout/Header.jsx` | Navigation header for public site with logo, nav links, phone/WhatsApp CTAs, and mobile drawer toggle. |
| **Footer** | `components/layout/Footer.jsx` | Site-wide footer with address, social links, quick links, service lists, and discrete link to Admin Login. |
| **Layout** | `components/layout/Layout.jsx` | Standard page wrapper incorporating `Header` and `Footer`. |
| **AdminLayout** | `components/admin/AdminLayout.jsx` | Main administration dashboard layout providing responsive sidebar navigation, top bar, role badges (Owner/Superadmin/Admin), pending approval counters, and logout handler. |
| **BookingQRCode** | `components/BookingQRCode.jsx` | Generates a scannable QR code directing users to `/booking`. Supports downloading as PNG and copying/sharing link. |
| **InstallerReceipt** | `components/InstallerReceipt.jsx` | Formatted printable/exportable receipt template for installer payment vouchers. |
| **Shadcn UI Library** | `components/ui/*` | ~50 modular UI components (Button, Card, Dialog, Input, Select, Badge, Calendar, Popover, Sonner Toast, etc.) wrapping Radix UI primitives. |

---

### Data Flow & Form Traceability

#### Forms & Submit Behaviors

1. **Public Booking Form (`Booking.jsx`)**:
   - **Fields**: Name, Phone, Email, Service, Car Brand, Car Model, Date, Time Slot, Notes.
   - **Submit Action**: Validates form, creates booking object with ID `WS-BK-XXXXXXXX`, formats appointment date, and sends `POST` request to `${API_URL}/api/bookings`.
   - **Behavior**: If API succeeds, shows confirmation screen with WhatsApp link. **Fallback**: If backend URL is not set or network call fails, catches the error and saves to `localStorage` (`wheelspa_bookings`).

2. **Contact Form (`Contact.jsx`)**:
   - **Fields**: Name, Phone, Email, Enquiry Type, Subject, Message.
   - **Submit Action**: Validates inputs and executes `await new Promise(resolve => setTimeout(resolve, 1500))`.
   - **Behavior**: **Pure Simulation**. Does NOT call any backend endpoint, send emails, or save to database/localStorage. Displays local "Message Sent!" state.

3. **Admin Login Form (`AdminLogin.jsx`)**:
   - **Fields**: Username, Password.
   - **Submit Action**: Calls `login(username, password)` in `AdminAuthContext`, which sends `POST /api/auth/login`.
   - **Behavior**: On success, receives JWT token and user info, stores them in `localStorage` (`wheelspa_token`, `wheelspa_admin`), and navigates to `/admin/dashboard`.

4. **Vehicle New Entry Form (`AdminNewEntry.jsx`)**:
   - **Fields**: Customer Name, Car Number (auto-formatted), Mobile, Service, Amount, Payment Mode, Received By, Cash Handover To, Job Status, Notes.
   - **Submit Action**: Sends `POST /api/entries` with JWT Bearer token in headers.
   - **Behavior**: Backend inserts document into MongoDB and generates sequential token (`WS-001`). UI displays token modal. *(Note: List page `AdminEntries.jsx` reads from `localStorage`, creating a data disconnect).*

5. **Installer New Payment Form (`InstallerNewPayment.jsx`)**:
   - **Fields**: Category, Installer ID/Name, Job Ref, Total Payable, Advance Paid, Payment Mode, Transaction ID, Payment Date, Notes.
   - **Submit Action**: Saves payment object directly into `localStorage` (`wheelspa_installer_payments`).
   - **Behavior**: **Not Connected**. Does NOT call backend endpoint `POST /api/installer-payments`.

6. **Create User Form (`AdminUsers.jsx`)**:
   - **Fields**: Username, Password, Name, Role (Admin, Superadmin, Owner).
   - **Submit Action**: Sends `POST /api/users` with Owner JWT token.
   - **Behavior**: **Fully Connected**. Backend hashes password with Bcrypt and inserts into MongoDB `users` collection.

7. **Employee Performance Review Form (`EmployeePerformance.jsx`)**:
   - **Fields**: Employee ID/Name, Review Period, Sincerity (1-10), Target Achievement (1-10), Personality (1-10), Communication (1-10), Leadership (1-10), Comments, Salary Recommendation.
   - **Submit Action**: Sends `POST /api/performance/reviews` with Owner JWT token.
   - **Behavior**: **Fully Connected**. Backend calculates average score and grade ("Outstanding", "Excellent", etc.) and inserts document into MongoDB `performance_reviews` collection.

---

### Navigation Flows

```
[Public Visitor]
   │
   ├──> Home (/) ────────> Services (/services) ──> Booking (/booking) ──> Slot Selected & Form Submitted ──> Confirmation Screen
   ├──> About (/about)
   ├──> Knowledge (/knowledge)
   ├──> Contact (/contact)
   └──> Token Display (/token-display) [Shop TV Display]

[Admin / Staff]
   │
   └──> Admin Login (/admin)
          │ (POST /api/auth/login)
          ▼
     Authenticated (JWT Token stored)
          │
          ├──> Role: ADMIN
          │     ├── Dashboard (/admin/dashboard)
          │     ├── Customer Bookings (/admin/bookings)
          │     ├── Booking Slots (/admin/slots)
          │     ├── New Entry (/admin/new-entry)
          │     ├── All Entries (/admin/entries)
          │     ├── Reports (/admin/reports)
          │     ├── Services (/admin/services)
          │     └── Installer Vouchers (/admin/installer/*)
          │
          ├──> Role: SUPERADMIN (All Admin pages plus:)
          │     └── Approval Requests (/admin/approvals) [Approve/Reject Admin edit/delete requests]
          │
          └──> Role: OWNER (All Superadmin pages plus:)
                ├── User Management (/admin/users) [Create/Delete/Deactivate staff]
                └── Employee Performance (/admin/performance) [Review & grade employees]
```

---

## 3. Backend Analysis

### API Endpoint Reference (`backend/server.py`)

#### Authentication Endpoints
- `POST /api/auth/login`: Authenticates credentials against MongoDB `users` collection using Passlib Bcrypt. Returns signed JWT token (`HS256`, 24h expiry) and user object.
- `GET /api/auth/me`: Requires Bearer Token. Returns authenticated user identity.

#### User Management Endpoints *(Owner Only)*
- `POST /api/users`: Accepts `UserCreate` (username, password, role, name). Checks for duplicate username, hashes password, inserts user into DB.
- `GET /api/users`: Requires Owner or Superadmin role. Returns list of all system users (excluding `password_hash`).
- `DELETE /api/users/{user_id}`: Deletes user by ID. Prevents self-deletion.
- `PUT /api/users/{user_id}/toggle-status`: Toggles `is_active` boolean flag to enable/disable account.

#### Approval Requests Endpoints
- `POST /api/approval-requests`: Submitted by `admin` role users attempting to edit/delete protected data. Inserts request into `approval_requests` collection with `status="pending"`.
- `GET /api/approval-requests`: Returns requests. Admin sees only their own requests; Superadmin/Owner sees all.
- `GET /api/approval-requests/pending-count`: Returns JSON `{"count": N}` for pending approval badge.
- `PUT /api/approval-requests/{request_id}`: Requires Superadmin or Owner role. Approves or rejects request. If approved, automatically applies changes/deletions directly to the target MongoDB collection (`bookings`, `entries`, `installer_payments`, `services`, `installers`).

#### Bookings Endpoints
- `GET /api/bookings`: Requires Auth. Returns all bookings sorted by `created_at` descending.
- `POST /api/bookings`: **Public endpoint**. Inserts new customer booking into `bookings` collection.
- `GET /api/bookings/slots`: **Public endpoint**. Returns standard time slots and availability status map for a given date.
- `GET /api/bookings/slots/{date}`: **Public endpoint**. Returns detailed array of time slots for specified date with statuses (`available`, `booked_unpaid`, `booked_paid`).
- `PUT /api/bookings/{booking_id}/payment`: Requires Auth. Updates `payment_status`, `payment_amount`, `payment_mode`, and `payment_date`.
- `PUT /api/bookings/{booking_id}`: Directly updates booking. Superadmin/Owner only (Admin must create approval request).
- `DELETE /api/bookings/{booking_id}`: Deletes booking document. Superadmin/Owner only.

#### Vehicle Entries & Token System Endpoints
- `GET /api/entries`: Requires Auth. Returns all vehicle entries.
- `POST /api/entries`: Requires Auth. Generates daily sequential token number (`WS-001`, `WS-002`, etc.) based on today's count, sets `token_status="waiting"`, and inserts into `entries` collection.
- `GET /api/tokens/display`: **Public endpoint**. Returns today's active tokens categorized into `current_token`, `waiting`, `in_progress`, `completed`, and summary counts.
- `PUT /api/tokens/{entry_id}/status`: Requires Auth. Updates token status (`waiting` -> `in_progress` -> `completed`) and records timestamp (`started_at` / `completed_at`).
- `POST /api/tokens/call-next`: Requires Auth. Automatically completes current `in_progress` token and advances the next `waiting` token to `in_progress`.
- `PUT /api/entries/{entry_id}`: Updates entry details. Superadmin/Owner only.
- `DELETE /api/entries/{entry_id}`: Deletes entry document. Superadmin/Owner only.

#### Services Endpoints
- `GET /api/services`: **Public endpoint**. Returns all service offerings.
- `POST /api/services`: Requires Auth. Adds new service document.
- `PUT /api/services/{service_id}`: Updates service details. Superadmin/Owner only.
- `DELETE /api/services/{service_id}`: Deletes service. Superadmin/Owner only.

#### Contractor / Installer Endpoints
- `GET /api/installers`: Requires Auth. Returns list of registered installers.
- `POST /api/installers`: Requires Auth. Adds new installer record.
- `PUT /api/installers/{installer_id}`: Updates installer. Superadmin/Owner only.
- `DELETE /api/installers/{installer_id}`: Deletes installer. Superadmin/Owner only.
- `GET /api/installer-payments`: Requires Auth. Returns all contractor payment records.
- `POST /api/installer-payments`: Requires Auth. Creates new payment voucher record.
- `PUT /api/installer-payments/{payment_id}`: Updates payment voucher. Superadmin/Owner only.
- `DELETE /api/installer-payments/{payment_id}`: Deletes payment voucher. Superadmin/Owner only.

#### Employee Performance Endpoints *(Owner Only)*
- `GET /api/performance/employees`: Returns list of non-owner users (`admin`, `superadmin`) for evaluation.
- `POST /api/performance/reviews`: Evaluates employee scores, calculates average and grade, inserts into `performance_reviews`.
- `GET /api/performance/reviews`: Returns all performance review records.
- `GET /api/performance/reviews/{review_id}`: Returns specific review details.
- `PUT /api/performance/reviews/{review_id}`: Updates evaluation scores and recalculates overall grade.
- `DELETE /api/performance/reviews/{review_id}`: Deletes review record.
- `GET /api/performance/summary`: Returns summary statistics across all employees, latest scores, overall averages, and salary recommendations.

---

### MongoDB Database Collections & Schemas

1. **`users` Collection**:
   - `id` (String, UUID)
   - `username` (String, Unique)
   - `password_hash` (String, Bcrypt hash)
   - `role` (String: `"admin"`, `"superadmin"`, `"owner"`)
   - `name` (String)
   - `created_at` (ISO Datetime String)
   - `is_active` (Boolean, default: `True`)

2. **`approval_requests` Collection**:
   - `id` (String, UUID)
   - `request_type` (String: `"edit"`, `"delete"`)
   - `data_type` (String: `"booking"`, `"entry"`, `"installer_payment"`, `"service"`, `"installer"`)
   - `data_id` (String)
   - `requested_by` (String, Username)
   - `requested_by_name` (String)
   - `original_data` (Object)
   - `new_data` (Object, Optional)
   - `status` (String: `"pending"`, `"approved"`, `"rejected"`)
   - `reviewed_by` (String, Optional)
   - `reviewed_at` (ISO Datetime String, Optional)
   - `created_at` (ISO Datetime String)
   - `notes` (String, Optional)

3. **`bookings` Collection**:
   - `id` (String)
   - `customerName` / `customer_name` (String)
   - `phone` (String)
   - `email` (String)
   - `service` / `serviceName` (String)
   - `carBrand` (String)
   - `carModel` (String)
   - `appointment_date` / `appointmentDate` (String: `YYYY-MM-DD`)
   - `time_slot` / `timeSlot` (String: e.g. `"10:00 AM"`)
   - `status` (String: `"pending"`, `"confirmed"`, `"cancelled"`, `"completed"`)
   - `payment_status` (String: `"unpaid"`, `"paid"`)
   - `payment_amount` (Number, Optional)
   - `payment_mode` (String, Optional)
   - `payment_date` (ISO Datetime String, Optional)
   - `created_at` (ISO Datetime String)

4. **`entries` Collection**:
   - `id` (String, UUID)
   - `token_number` (Integer, daily counter)
   - `token_display` (String: e.g. `"WS-001"`)
   - `token_status` (String: `"waiting"`, `"in_progress"`, `"completed"`)
   - `customer_name` / `customerName` (String)
   - `car_number` / `carNumber` (String)
   - `mobile_number` / `mobileNumber` (String)
   - `service_type` / `serviceType` (String)
   - `amount` (Number)
   - `payment_mode` / `paymentMode` (String)
   - `received_by` / `receivedBy` (String)
   - `cash_handover_to` / `cashHandoverTo` (String, Optional)
   - `cash_handover_approved` (Boolean)
   - `job_status` / `jobStatus` (String: `"pending"`, `"in_progress"`, `"completed"`)
   - `created_at` (ISO Datetime String)
   - `created_by` (String, Username)
   - `started_at` (ISO Datetime String, Optional)
   - `completed_at` (ISO Datetime String, Optional)

5. **`services` Collection**:
   - `id` (String, UUID)
   - `name` (String)
   - `shortName` (String)
   - `description` (String)
   - `benefits` (Array of Strings)
   - `suitableFor` (Array of Strings)
   - `image` (String, URL)
   - `icon` (String, Lucide Icon Name)
   - `created_at` (ISO Datetime String)

6. **`installers` Collection**:
   - `id` (String, UUID)
   - `name` (String)
   - `category` (String: `"ppf_installer"`, `"window_film_installer"`, `"car_garage_work"`, `"other_work"`)
   - `phone` (String)
   - `created_at` (ISO Datetime String)

7. **`installer_payments` Collection**:
   - `id` (String, UUID)
   - `installerId` (String)
   - `installerName` (String)
   - `category` (String)
   - `jobReference` (String)
   - `totalPayable` (Number)
   - `advancePaid` (Number)
   - `remainingBalance` (Number)
   - `paymentMode` (String)
   - `transactionId` (String, Optional)
   - `paymentDate` (String: `YYYY-MM-DD`)
   - `notes` (String, Optional)
   - `status` (String: `"partial"`, `"completed"`)
   - `created_at` (ISO Datetime String)
   - `created_by` (String, Username)

8. **`performance_reviews` Collection**:
   - `id` (String, UUID)
   - `employee_id` (String)
   - `employee_name` (String)
   - `review_period` (String)
   - `sincerity` (Integer: 1-10)
   - `target_achievement` (Integer: 1-10)
   - `personality_improvement` (Integer: 1-10)
   - `communication` (Integer: 1-10)
   - `leadership` (Integer: 1-10)
   - `total_score` (Integer)
   - `average_score` (Float)
   - `grade` (String: `"Outstanding"`, `"Excellent"`, `"Good"`, `"Needs Improvement"`, `"Poor"`)
   - `comments` (String, Optional)
   - `salary_recommendation` (String, Optional)
   - `reviewed_by` (String, Username)
   - `created_at` (ISO Datetime String)

---

### Authentication & Authorization Architecture

- **Token Format**: Bearer JWT signed with `HS256`. Payload contains `sub` (username), `role`, and `exp` (timestamp).
- **Header Structure**: `Authorization: Bearer <token>`
- **Role Permissions Hierarchy**:
  - `admin`: Standard worker. Can create entries, view slots, add payments, and view reports. Edits/deletions trigger an `approval_request` rather than executing directly.
  - `superadmin`: Supervisor. Can perform direct edits/deletions and review/approve `approval_requests` from admins.
  - `owner`: System Owner. Possesses all Superadmin rights plus access to User Management (`/api/users`) and Employee Performance reviews (`/api/performance/*`).

---

### Default Seeded User & Security Risk

In `backend/server.py` (lines 931–946), FastAPI executes an `on_event("startup")` seed handler:

```python
@app.on_event("startup")
async def seed_owner():
    existing_owner = await db.users.find_one({"role": "owner"})
    if not existing_owner:
        owner_doc = {
            "id": str(uuid.uuid4()),
            "username": "owner",
            "password_hash": get_password_hash("owner123"),
            "role": "owner",
            "name": "System Owner",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        await db.users.insert_one(owner_doc)
        logger.info("Default owner account created: owner / owner123")
```

> [!WARNING]
> **CRITICAL SECURITY RISK**: The default owner account (`owner` / `owner123`) is seeded automatically on startup if no owner user exists. In any deployed environment, this predictable default password provides immediate full system access to unauthorized actors unless changed immediately.

---

### Required Environment Variables

To run the application, the following environment variables must be defined in environment configuration files (`.env`):

| Variable Name | App Layer | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `MONGO_URL` | Backend | Connection URI string for MongoDB database instance | `mongodb://localhost:27017` |
| `DB_NAME` | Backend | Database name inside MongoDB | `wheelspa_db` |
| `JWT_SECRET` | Backend | Secret key used to sign and verify JWT tokens | `wheelspa-secret-key-change-in-production` |
| `CORS_ORIGINS` | Backend | Comma-separated list of allowed frontend origins for CORS | `http://localhost:3000,*` |
| `REACT_APP_BACKEND_URL` | Frontend | Base URL of the running FastAPI server | `http://localhost:8000` |

---

## 4. Frontend-Backend Connection Map

This table maps every frontend component/page to its intended backend endpoint, along with its **actual runtime status**:

| Frontend Page / Component | Intended Backend Endpoint | Actual Integration Status | Connection Details & Flags |
| :--- | :--- | :--- | :--- |
| **`AdminLogin.jsx`** | `POST /api/auth/login` | **CONNECTED** | Submits credentials via API, stores returned token in `localStorage`. |
| **`Booking.jsx`** | `POST /api/bookings`<br>`GET /api/bookings/slots/{date}` | **PARTIALLY CONNECTED** | Slot picker calls slot API. Submit attempts `POST /api/bookings`; falls back to `localStorage` if backend call fails or URL is missing. |
| **`BookingSlots.jsx`** | `GET /api/bookings/slots/{date}`<br>`PUT /api/bookings/{id}/payment` | **CONNECTED** | Fetches slot statuses from API and updates booking payment details via API. |
| **`TokenDisplay.jsx`** | `GET /api/tokens/display` | **CONNECTED** | Polls `/api/tokens/display` every 5 seconds to render live token queue. |
| **`AdminNewEntry.jsx`** | `POST /api/entries` | **CONNECTED TO POST ONLY** | Submits new vehicle entry to backend API and receives generated token. |
| **`AdminEntries.jsx`** | `GET /api/entries`<br>`DELETE /api/entries/{id}` | 🚩 **NOT CONNECTED** | **DISCONNECTED**: Reads and deletes entries exclusively from `localStorage` (`wheelspa_entries`). Ignores DB entries created via `AdminNewEntry`. |
| **`AdminBookings.jsx`** | `GET /api/bookings`<br>`PUT/DELETE /api/bookings/{id}` | 🚩 **NOT CONNECTED** | **DISCONNECTED**: Reads and modifies customer bookings exclusively from `localStorage` (`wheelspa_bookings`). Ignores DB bookings created via `Booking.jsx`. |
| **`AdminDashboard.jsx`** | `GET /api/entries` | 🚩 **NOT CONNECTED** | Calculates metrics strictly from `localStorage` (`wheelspa_entries`) or `adminMock.js`. |
| **`AdminReports.jsx`** | `GET /api/entries` | 🚩 **NOT CONNECTED** | Computes financial reports strictly from `localStorage` (`wheelspa_entries`). |
| **`AdminServices.jsx`** | `GET /api/services`<br>`POST/PUT/DELETE /api/services` | 🚩 **NOT CONNECTED** | Manages services strictly inside `localStorage` (`wheelspa_services`). |
| **`InstallerDashboard.jsx`**| `GET /api/installer-payments` | 🚩 **NOT CONNECTED** | Calculates metrics strictly from `localStorage` (`wheelspa_installer_payments`). |
| **`InstallerNewPayment.jsx`**| `POST /api/installer-payments` | 🚩 **NOT CONNECTED** | Saves new installer vouchers strictly to `localStorage` (`wheelspa_installer_payments`). |
| **`InstallerPayments.jsx`** | `GET /api/installer-payments` | 🚩 **NOT CONNECTED** | Reads and modifies installer payments strictly inside `localStorage`. |
| **`InstallerManage.jsx`** | `GET /api/installers` | 🚩 **NOT CONNECTED** | Manages contractors strictly inside `localStorage` (`wheelspa_installers`). |
| **`AdminUsers.jsx`** | `GET/POST/DELETE /api/users`<br>`PUT /api/users/{id}/toggle-status` | **CONNECTED** | Fully wired to backend endpoints for user management. |
| **`AdminApprovals.jsx`** | `GET/PUT /api/approval-requests` | **CONNECTED** | Fully wired to backend endpoints for change request approvals. |
| **`EmployeePerformance.jsx`**| `GET/POST/PUT/DELETE /api/performance/*` | **CONNECTED** | Fully wired to backend performance review endpoints. |
| **`Contact.jsx`** | `POST /api/contact` | 🚩 **NOT CONNECTED** | **PURE SIMULATION**: Uses `setTimeout` to mimic network activity; no data persisted. |
| **`Home.jsx` / `About.jsx`**| N/A | **STATIC / MOCK** | Reads directly from `src/data/mock.js`. |
| **`Knowledge.jsx`** | N/A | **STATIC / MOCK** | Reads blog posts and FAQs directly from `src/data/mock.js`. |

---

## 5. Known Issues Found

1. **Major Data Disconnect Between Data Creation and List Views**:
   - `AdminNewEntry.jsx` saves vehicle entries to MongoDB via `POST /api/entries`. However, `AdminEntries.jsx` reads strictly from browser `localStorage` (`wheelspa_entries`). Consequently, entries created in the backend database are invisible on the entries management page.
   - `Booking.jsx` saves online customer bookings to MongoDB via `POST /api/bookings`. However, `AdminBookings.jsx` reads strictly from browser `localStorage` (`wheelspa_bookings`), meaning real customer bookings in MongoDB will never be seen by admins.
   - All `Installer*` management pages operate exclusively on `localStorage`, rendering the backend `/api/installers` and `/api/installer-payments` endpoints completely unused by the frontend.

2. **Unreachable Code in Backend (`server.py`)**:
   - In `backend/server.py` lines 592–594, within the `call_next_token` endpoint handler, two statements are placed after an unconditional `return` statement:
     ```python
     592: return {"message": "No more tokens in queue", "token": None}
     593: entry.pop("_id", None)
     594: return entry
     ```
     Lines 593 and 594 are unreachable dead code left behind from refactoring.

3. **Missing Configuration Files (`.env`)**:
   - Neither `backend/.env` nor `frontend/.env` exists in the repository. Running `server.py` without environment variables causes a crash due to `os.environ['MONGO_URL']` missing. Running the React app without `REACT_APP_BACKEND_URL` causes API requests to default to `undefined/api/...`, forcing fallback paths to trigger.

4. **Fake Contact Form Submission**:
   - The form in `Contact.jsx` uses a dummy `setTimeout` to simulate form submission without sending emails or persisting messages in MongoDB.

5. **Hardcoded Default Owner Account**:
   - The default account (`owner` / `owner123`) is seeded automatically on startup if no owner exists, presenting a default credential security risk.

---

## 6. End-to-End User Flows (As Currently Working)

### Customer Booking Flow
1. Customer navigates to `/booking`.
2. Customer selects desired service, car brand, car model, name, and phone number.
3. Customer picks an appointment date. The page queries `GET /api/bookings/slots/{date}` to display real-time slot availability (color-coded as Available, Booked Unpaid, or Booked Paid).
4. Customer taps an available time slot and clicks **Book Appointment**.
5. The form generates a local ID (`WS-BK-XXXXXXXX`) and attempts to `POST` the payload to `${API_URL}/api/bookings`.
6. If backend connectivity exists, the booking is stored in MongoDB. (If backend is unavailable, it saves to browser `localStorage`).
7. Customer sees a "Booking Confirmed!" screen displaying their booking ID and a direct button to chat on WhatsApp.

### Admin Daily Operation & Queue Flow
1. Staff member opens `/admin` and logs in with credentials (e.g. `owner` / `owner123`).
2. `AdminLogin` posts to `/api/auth/login`, receives a JWT token, and redirects to `/admin/dashboard`.
3. Admin clicks **New Entry** (`/admin/new-entry`) when a car arrives at the workshop.
4. Admin fills out customer name, vehicle registration number, mobile number, selected service, billing amount, payment mode, and receiver.
5. Admin clicks **Save Entry**. The app posts to `POST /api/entries`.
6. Backend calculates today's entry count, creates sequential token `WS-001`, saves document to MongoDB, and returns the token object.
7. Frontend displays a modal with the generated token (`WS-001`).
8. On the waiting room TV (`/token-display`), the screen polls `GET /api/tokens/display` every 5 seconds and updates to display `WS-001` under "NOW SERVING" or "WAITING QUEUE".

### Owner Management & Employee Evaluation Flow
1. System Owner logs in using `owner` credentials.
2. Sidebar reveals exclusive management options: **Manage Users** (`/admin/users`) and **Employee Performance** (`/admin/performance`).
3. To add new staff, Owner opens `/admin/users`, fills out user details, selects role (`admin` or `superadmin`), and submits. Frontend calls `POST /api/users`, which hashes the password and saves to MongoDB.
4. To evaluate staff, Owner opens `/admin/performance`, selects an employee, and adjusts sliders for Sincerity, Target Achievement, Personality Improvement, Communication, and Leadership (rated 1 to 10).
5. Owner enters evaluation comments and a salary recommendation (e.g., "10% hike") and submits. Frontend calls `POST /api/performance/reviews`.
6. Backend computes the overall average score, assigns a performance grade ("Outstanding", "Excellent", etc.), and stores the evaluation in MongoDB `performance_reviews`.

---

## 7. What a "Fully Working" Version Would Require

To convert this codebase into a fully integrated, production-ready system where every feature persists data end-to-end in MongoDB, the following technical tasks must be completed:

### 1. Environment Configuration Setup
- Create `backend/.env` with explicit values:
  ```env
  MONGO_URL=mongodb://localhost:27017
  DB_NAME=wheelspa_db
  JWT_SECRET=your_secure_jwt_secret_key_here
  CORS_ORIGINS=http://localhost:3000
  ```
- Create `frontend/.env`:
  ```env
  REACT_APP_BACKEND_URL=http://localhost:8000
  ```

### 2. Frontend LocalStorage Replacement with API Integration
Replace all local storage read/write operations with backend API fetch/axios calls across the administrative pages:
- **`AdminEntries.jsx`**: Replace `localStorage.getItem('wheelspa_entries')` with `GET /api/entries` and `DELETE /api/entries/{id}` API calls.
- **`AdminBookings.jsx`**: Replace `localStorage.getItem('wheelspa_bookings')` with `GET /api/bookings` and `PUT/DELETE /api/bookings/{id}` API calls.
- **`AdminDashboard.jsx` & `AdminReports.jsx`**: Update statistics calculations to fetch live entry data from `GET /api/entries`.
- **`AdminServices.jsx`**: Replace `localStorage` operations with `GET/POST/PUT/DELETE /api/services`.
- **`InstallerNewPayment.jsx`**: Update submit handler to `POST /api/installer-payments` instead of pushing to `localStorage`.
- **`InstallerPayments.jsx`**: Replace `localStorage` reads with `GET /api/installer-payments`.
- **`InstallerManage.jsx`**: Replace `localStorage` reads with `GET /api/installers`.

### 3. Contact Form Persistence
- Create a backend `POST /api/contact` endpoint (or MongoDB collection `contact_enquiries`).
- Update `Contact.jsx` `handleSubmit` function to send the form payload to `/api/contact` (and optionally integrate an email notification service like SendGrid or AWS SES).

### 4. Code Cleanup & Backend Fixes
- Remove unreachable dead code in `backend/server.py` lines 593–594 (`entry.pop("_id", None)`, `return entry`).
- Standardize object schema key casing across frontend and backend (resolving camelCase vs snake_case field mappings for `customer_name`, `car_number`, `service_type`, `job_status`).

### 5. Production Security Hardening
- Implement a password change prompt on first login for the default seeded owner account.
- Change default `JWT_SECRET` in environment settings to a cryptographic random secret key.
