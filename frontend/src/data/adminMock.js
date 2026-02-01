// Admin Mock Data

export const ADMIN_CREDENTIALS = {
  adminId: "admin",
  password: "wheelspa@123"
};

export const PAYMENT_MODES = [
  { value: "google_pay", label: "Google Pay" },
  { value: "phone_pe", label: "Phone Pe" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank", label: "Bank Transfer" }
];

export const JOB_STATUS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" }
];

export const STAFF_MEMBERS = [
  "Rahul",
  "Amit",
  "Suresh",
  "Vijay",
  "Sanjay",
  "Owner"
];

// Mock entries for display
export const MOCK_ENTRIES = [
  {
    id: "1",
    customerName: "Rajesh Sharma",
    carNumber: "MH-12-AB-1234",
    mobileNumber: "9876543210",
    serviceType: "ceramic",
    amount: 15000,
    paymentMode: "google_pay",
    receivedBy: "Rahul",
    cashHandoverTo: null,
    cashHandoverApproved: false,
    jobStatus: "completed",
    entryDate: "2025-01-06T10:30:00",
    createdAt: "2025-01-06T10:30:00"
  },
  {
    id: "2",
    customerName: "Priya Patel",
    carNumber: "MH-14-CD-5678",
    mobileNumber: "8765432109",
    serviceType: "ppf",
    amount: 45000,
    paymentMode: "cash",
    receivedBy: "Amit",
    cashHandoverTo: "Owner",
    cashHandoverApproved: true,
    jobStatus: "in_progress",
    entryDate: "2025-01-06T11:45:00",
    createdAt: "2025-01-06T11:45:00"
  },
  {
    id: "3",
    customerName: "Amit Deshmukh",
    carNumber: "MH-12-EF-9012",
    mobileNumber: "7654321098",
    serviceType: "foam-wash",
    amount: 800,
    paymentMode: "phone_pe",
    receivedBy: "Suresh",
    cashHandoverTo: null,
    cashHandoverApproved: false,
    jobStatus: "pending",
    entryDate: "2025-01-06T14:00:00",
    createdAt: "2025-01-06T14:00:00"
  }
];
