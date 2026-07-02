export interface Allergy {
  id: string;
  name: string;
  severity: "low" | "medium" | "high";
}

export interface ChronicCondition {
  id: string;
  name: string;
  diagnosedYear: number;
  status: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  duration: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  date: string;
  cie10Code: string;
  diagnosisTitle: string;
  notes: string;
  prescriptions: Medication[];
  createdBy: string;
  quechuaSummary?: string;
  indications?: string;
}

export interface MedicalFile {
  id: string;
  patientId: string;
  name: string;
  size: string;
  type: "image" | "pdf" | "document";
  uploadDate: string;
  fileUrl: string; // Base64 or mock URL
}

export interface Patient {
  id: string;
  medicalHistoryNumber: string; // e.g. #HC-2024-8902
  name: string;
  avatarUrl?: string;
  status: "Active" | "Inactive";
  age: number;
  dni: string;
  bloodType: string;
  location: string;
  allergies: Allergy[];
  chronicConditions: ChronicCondition[];
  consultations: Consultation[];
  files: MedicalFile[];
  email: string;
  gender: string;
  phone: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  endTime: string;
  status: "Completed" | "Up Next" | "Scheduled" | string;
  type: string;
  doctorName?: string;
}

export interface MedicalCenter {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  type: string;
  activeDoctors: number;
  totalPatients: number;
}

export interface RecentActivity {
  id: string;
  type: "registration" | "approval" | "appointment" | "consultation";
  title: string;
  detail: string;
  time: string;
  center?: string;
}

export type Role = "doctor" | "administrator" | "patient_portal";
export type Language = "es" | "qu";
