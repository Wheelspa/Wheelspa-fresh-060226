// Installer Payment Management Mock Data

export const INSTALLER_CATEGORIES = [
  { value: "ppf_installer", label: "PPF Installer" },
  { value: "window_film_installer", label: "Window Film Installer" },
  { value: "car_garage_work", label: "Car Garage Work" },
  { value: "other_work", label: "Other Work" }
];

export const INSTALLER_PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" }
];

export const INSTALLERS = [
  { id: "1", name: "Ravi Kumar", category: "ppf_installer", phone: "9876543210" },
  { id: "2", name: "Sunil Patil", category: "ppf_installer", phone: "9876543211" },
  { id: "3", name: "Manoj Singh", category: "window_film_installer", phone: "9876543212" },
  { id: "4", name: "Deepak Sharma", category: "window_film_installer", phone: "9876543213" },
  { id: "5", name: "Ajay Verma", category: "car_garage_work", phone: "9876543214" },
  { id: "6", name: "Santosh Yadav", category: "car_garage_work", phone: "9876543215" },
  { id: "7", name: "Prakash Joshi", category: "other_work", phone: "9876543216" }
];

// Mock payment entries
export const MOCK_INSTALLER_PAYMENTS = [
  {
    id: "1",
    installerId: "1",
    installerName: "Ravi Kumar",
    category: "ppf_installer",
    jobReference: "PPF-BMW-001",
    totalPayable: 25000,
    advancePaid: 10000,
    remainingBalance: 15000,
    paymentMode: "upi",
    transactionId: "UPI123456789",
    paymentDate: "2025-01-05",
    notes: "Full body PPF installation for BMW 3 Series",
    status: "partial",
    createdAt: "2025-01-05T10:30:00",
    updatedAt: "2025-01-05T10:30:00",
    auditTrail: [
      { action: "created", timestamp: "2025-01-05T10:30:00", by: "admin" }
    ]
  },
  {
    id: "2",
    installerId: "3",
    installerName: "Manoj Singh",
    category: "window_film_installer",
    jobReference: "WF-AUDI-002",
    totalPayable: 8000,
    advancePaid: 8000,
    remainingBalance: 0,
    paymentMode: "cash",
    transactionId: "",
    paymentDate: "2025-01-04",
    notes: "Window tinting for Audi Q5",
    status: "completed",
    createdAt: "2025-01-04T14:00:00",
    updatedAt: "2025-01-04T14:00:00",
    auditTrail: [
      { action: "created", timestamp: "2025-01-04T14:00:00", by: "admin" }
    ]
  },
  {
    id: "3",
    installerId: "5",
    installerName: "Ajay Verma",
    category: "car_garage_work",
    jobReference: "GAR-MERC-003",
    totalPayable: 15000,
    advancePaid: 5000,
    remainingBalance: 10000,
    paymentMode: "bank_transfer",
    transactionId: "NEFT789456123",
    paymentDate: "2025-01-03",
    notes: "Dent repair and paint work for Mercedes",
    status: "partial",
    createdAt: "2025-01-03T11:00:00",
    updatedAt: "2025-01-03T11:00:00",
    auditTrail: [
      { action: "created", timestamp: "2025-01-03T11:00:00", by: "admin" }
    ]
  }
];
