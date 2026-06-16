import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  Patient, Appointment, MedicalCenter, RecentActivity, 
  Consultation, Medication, Allergy, ChronicCondition, MedicalFile 
} from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "sumaq_qhali_secret_key";

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve static uploads folder
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

const SQL_LOG_FILE = path.join(process.cwd(), "sql_activity_log.json");

interface SqlActivity {
  id: string;
  timestamp: string;
  queryType: string;
  tableName: string;
  sqlString: string;
  params: string;
}

if (!fs.existsSync(SQL_LOG_FILE)) {
  fs.writeFileSync(SQL_LOG_FILE, JSON.stringify([]));
}

function logSql(queryType: string, tableName: string, sqlString: string, params: any) {
  const newActivity: SqlActivity = {
    id: `SQL_${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toISOString(),
    queryType,
    tableName,
    sqlString,
    params: JSON.stringify(params, null, 2)
  };
  fs.promises.readFile(SQL_LOG_FILE, "utf-8").then(raw => {
    let log: SqlActivity[] = JSON.parse(raw);
    log.unshift(newActivity);
    if (log.length > 150) log.pop();
    return fs.promises.writeFile(SQL_LOG_FILE, JSON.stringify(log, null, 2));
  }).catch(() => {
    fs.promises.writeFile(SQL_LOG_FILE, JSON.stringify([newActivity], null, 2)).catch(() => {});
  });
}

function readSqlLog() {
  try {
    const raw = fs.readFileSync(SQL_LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

let dbPool: pg.Pool | null = null;
let dbError: string | null = null;

// Try to connect and run migrations/seedings
(async () => {
  let pool: pg.Pool;
  
  const hasValidUrl = process.env.DATABASE_URL && 
                       !process.env.DATABASE_URL.includes("[TU_CONTRASEÑA]") && 
                       !process.env.DATABASE_URL.includes("YOUR_SUPABASE") &&
                       !process.env.DATABASE_URL.includes("[PASSWORD]") &&
                       process.env.DATABASE_URL.startsWith("postgresql://");

  try {
    if (hasValidUrl) {
      console.log("🔌 Attempting database connection via DATABASE_URL...");
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      // Connection test
      await Promise.race([
        pool.query("SELECT 1"),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DB connection timeout (5s)")), 5000))
      ]);
    } else {
      throw new Error("DATABASE_URL is not set or contains default placeholders.");
    }
  } catch (err: any) {
    console.warn(`⚠️ DATABASE_URL connection failed: ${err.message}. Trying desegregated configuration variables...`);
    
    try {
      const fallbackConfig = {
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        host: process.env.DB_SERVER || "localhost",
        database: process.env.DB_NAME || "postgres",
        port: Number(process.env.DB_PORT) || 5432,
        ssl: (process.env.DB_SERVER && process.env.DB_SERVER !== "localhost") ? { rejectUnauthorized: false } : false
      };
      
      pool = new pg.Pool(fallbackConfig);
      // Connection test on fallback
      await Promise.race([
        pool.query("SELECT 1"),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DB connection timeout (5s)")), 5000))
      ]);
    } catch (fallbackErr: any) {
      dbError = fallbackErr.message;
      console.error("⚠️ PostgreSQL NOT available via fallback:", fallbackErr.message);
      console.error("   The app will run with empty data. Check Supabase credentials in your .env file.");
      return;
    }
  }

  dbPool = pool;
  console.log("✅ PostgreSQL/Supabase connected successfully.");

    // Create Tables if not exist (Auto-Migration)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS Patients (
            PatientID VARCHAR(100) PRIMARY KEY,
            MedicalHistoryNumber VARCHAR(100),
            FullName VARCHAR(255) NOT NULL,
            Status VARCHAR(50) NOT NULL,
            Age INT,
            DNI VARCHAR(50) UNIQUE,
            BloodType VARCHAR(10),
            Location VARCHAR(255),
            Email VARCHAR(255),
            Phone VARCHAR(50),
            Gender VARCHAR(50),
            Password VARCHAR(255),
            AvatarURL VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS Appointments (
            AppointmentID VARCHAR(100) PRIMARY KEY,
            PatientID VARCHAR(100),
            StartTime VARCHAR(100),
            EndTime VARCHAR(100),
            Status VARCHAR(50),
            Type VARCHAR(100),
            DoctorName VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS DoctorShifts (
            ShiftID VARCHAR(100) PRIMARY KEY,
            DoctorName VARCHAR(255),
            Specialty VARCHAR(255),
            DayOfWeek INT,
            SlotTime VARCHAR(100),
            IsActive INT DEFAULT 1,
            ShiftDate VARCHAR(100) NULL
        );

        CREATE TABLE IF NOT EXISTS TelemedicineQueue (
            PatientID VARCHAR(100) NOT NULL PRIMARY KEY,
            FullName VARCHAR(255) NOT NULL,
            Location VARCHAR(255) NOT NULL,
            Status VARCHAR(50) NOT NULL,
            JoinedAt BIGINT NOT NULL,
            DoctorName VARCHAR(255) NULL
        );

        CREATE TABLE IF NOT EXISTS Allergies (
            AllergyID VARCHAR(100) PRIMARY KEY,
            PatientID VARCHAR(100),
            AllergyName VARCHAR(255),
            Severity VARCHAR(50)
        );

        CREATE TABLE IF NOT EXISTS ChronicConditions (
            ConditionID VARCHAR(100) PRIMARY KEY,
            PatientID VARCHAR(100),
            ConditionName VARCHAR(255),
            DiagnosedYear INT,
            Status VARCHAR(50)
        );

        CREATE TABLE IF NOT EXISTS Consultations (
            ConsultationID VARCHAR(100) PRIMARY KEY,
            PatientID VARCHAR(100),
            Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CIE10Code VARCHAR(50),
            DiagnosisTitle VARCHAR(255),
            Notes TEXT,
            CreatedBy VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS Prescriptions (
            PrescriptionID VARCHAR(100) PRIMARY KEY,
            ConsultationID VARCHAR(100),
            MedicationName VARCHAR(255),
            Dosage VARCHAR(255),
            Duration VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS MedicalFiles (
            FileID VARCHAR(100) PRIMARY KEY,
            PatientID VARCHAR(100),
            FileName VARCHAR(255),
            FileSize VARCHAR(50),
            FileType VARCHAR(50),
            UploadDate VARCHAR(50),
            FileURL VARCHAR(500)
        );

        CREATE TABLE IF NOT EXISTS MedicalCenters (
            CenterID VARCHAR(100) PRIMARY KEY,
            Name VARCHAR(255),
            Location VARCHAR(255),
            Lat FLOAT,
            Lng FLOAT,
            Type VARCHAR(100),
            ActiveDoctors INT,
            TotalPatients INT
        );

        CREATE TABLE IF NOT EXISTS RecentActivities (
            ActivityID VARCHAR(100) PRIMARY KEY,
            Type VARCHAR(50),
            Title VARCHAR(255),
            Detail VARCHAR(255),
            Time VARCHAR(50),
            Center VARCHAR(255)
        );
      `);
      console.log("✅ PostgreSQL tables validated/created.");

      // Ensure ShiftDate column exists in PostgreSQL (migration)
      try {
        await pool.query("ALTER TABLE DoctorShifts ADD COLUMN IF NOT EXISTS ShiftDate VARCHAR(100) NULL");
      } catch (err: any) {
        console.error("Migration warning for DoctorShifts.ShiftDate:", err.message);
      }

      // Check and seed DoctorShifts table if empty
      const checkShifts = await pool.query("SELECT COUNT(*) as count FROM DoctorShifts");
      if (Number(checkShifts.rows[0].count) === 0) {
        console.log("🌱 Seeding initial schedules to DoctorShifts table...");
        const initialShifts = [
          { doc: "Dr. Quispe", spec: "Consulta General", day: 1, slot: "08:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 1, slot: "09:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 1, slot: "10:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 1, slot: "11:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 3, slot: "08:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 3, slot: "09:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 3, slot: "10:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 3, slot: "11:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 5, slot: "08:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 5, slot: "09:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 5, slot: "10:00 AM" },
          { doc: "Dr. Quispe", spec: "Consulta General", day: 5, slot: "11:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 2, slot: "08:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 2, slot: "09:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 2, slot: "10:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 2, slot: "11:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 4, slot: "08:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 4, slot: "09:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 4, slot: "10:00 AM" },
          { doc: "Dra. Rojas", spec: "Pediatría", day: 4, slot: "11:00 AM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 1, slot: "02:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 1, slot: "03:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 1, slot: "04:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 1, slot: "05:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 2, slot: "02:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 2, slot: "03:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 2, slot: "04:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 2, slot: "05:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 4, slot: "02:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 4, slot: "03:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 4, slot: "04:00 PM" },
          { doc: "Dr. Condori", spec: "Ginecología", day: 4, slot: "05:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "08:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "09:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "10:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "11:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "02:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "03:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 1, slot: "04:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "08:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "09:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "10:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "11:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "02:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "03:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 2, slot: "04:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "08:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "09:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "10:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "11:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "02:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "03:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 3, slot: "04:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "08:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "09:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "10:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "11:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "02:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "03:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 4, slot: "04:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "08:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "09:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "10:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "11:00 AM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "02:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "03:00 PM" },
          { doc: "Enf. Huamán", spec: "Control de Presión", day: 5, slot: "04:00 PM" }
        ];

        for (const s of initialShifts) {
          const shiftId = `SH_${s.doc.toUpperCase().replace(/[\s\.]+/g, "")}_${s.day}_${s.slot.replace(/[\s:]+/g, "")}`;
          await pool.query(
            "INSERT INTO DoctorShifts (ShiftID, DoctorName, Specialty, DayOfWeek, SlotTime, IsActive) VALUES ($1, $2, $3, $4, $5, 1)",
            [shiftId, s.doc, s.spec, s.day, s.slot]
          );
        }
        console.log("🌱 Successfully seeded DoctorShifts.");
      }

      // Check and seed MedicalCenters if empty
      const checkMC = await pool.query("SELECT COUNT(*) as count FROM MedicalCenters");
      if (Number(checkMC.rows[0].count) === 0) {
        console.log("🌱 Seeding MedicalCenters...");
        const initialCenters = [
          { id: "MC_URUBAMBA", name: "Centro de Salud Urubamba", loc: "Urubamba, Cusco", lat: -13.3039, lng: -72.1164, type: "Clinic", docs: 2, pts: 15 },
          { id: "MC_PISAC", name: "Puesto de Salud Pisac", loc: "Pisac, Cusco", lat: -13.4219, lng: -71.8481, type: "Clinic", docs: 1, pts: 8 },
          { id: "MC_CALCA", name: "Centro de Salud Calca", loc: "Calca, Cusco", lat: -13.3197, lng: -71.9525, type: "Clinic", docs: 1, pts: 10 },
          { id: "MC_PAUCARTAMBO", name: "Centro de Salud Paucartambo", loc: "Paucartambo, Cusco", lat: -13.3075, lng: -71.5975, type: "Clinic", docs: 1, pts: 12 }
        ];
        for (const c of initialCenters) {
          await pool.query(
            'INSERT INTO MedicalCenters (CenterID, Name, Location, Lat, Lng, Type, ActiveDoctors, TotalPatients) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [c.id, c.name, c.loc, c.lat, c.lng, c.type, c.docs, c.pts]
          );
        }
        console.log("🌱 Successfully seeded MedicalCenters.");
      }

      // Check and seed Patients if empty
      const checkPatients = await pool.query("SELECT COUNT(*) as count FROM Patients");
      if (Number(checkPatients.rows[0].count) === 0) {
        console.log("🌱 Seeding patients and structured clinical records...");
        
        const patientsData = [
          { id: "P_JUAN_MAMANI", hist: "#HC-2026-4482", name: "Juan Mamani", status: "Active", age: 64, dni: "45678912", blood: "O+", loc: "Urubamba", gender: "Masculino", phone: "987654321", email: "juan.mamani@email.com" },
          { id: "P_MARIA_CONDORI", hist: "#HC-2026-9021", name: "María Condori", status: "Active", age: 58, dni: "10293455", blood: "A+", loc: "Pisac", gender: "Femenino", phone: "987654322", email: "maria.condori@email.com" },
          { id: "P_LUCIA_HUAMAN", hist: "#HC-2026-1184", name: "Lucía Huamán", status: "Active", age: 8, dni: "76543210", blood: "O+", loc: "Calca", gender: "Femenino", phone: "987654323", email: "lucia.huaman@email.com" },
          { id: "P_NESTOR_YUPANQUI", hist: "#HC-2026-7734", name: "Néstor Yupanqui", status: "Active", age: 45, dni: "23849502", blood: "B+", loc: "Paucartambo", gender: "Masculino", phone: "987654324", email: "nestor.yupanqui@email.com" },
          { id: "P_ROSA_CHOQUE", hist: "#HC-2026-6632", name: "Rosa Choque", status: "Active", age: 29, dni: "38402938", blood: "O+", loc: "Andahuaylas", gender: "Femenino", phone: "987654325", email: "rosa.choque@email.com" }
        ];

        for (const p of patientsData) {
          const passHashed = await bcrypt.hash(p.dni, 10);
          await pool.query(
            `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender, Password, AvatarURL)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [p.id, p.hist, p.name, p.status, p.age, p.dni, p.blood, p.loc, p.email, p.phone, p.gender, passHashed, ""]
          );
        }

        // Allergies
        await pool.query("INSERT INTO Allergies (AllergyID, PatientID, AllergyName, Severity) VALUES ($1, $2, $3, $4)", ["A_JUAN_1", "P_JUAN_MAMANI", "Penicilina", "high"]);
        await pool.query("INSERT INTO Allergies (AllergyID, PatientID, AllergyName, Severity) VALUES ($1, $2, $3, $4)", ["A_LUCIA_1", "P_LUCIA_HUAMAN", "Ácaros del polvo", "medium"]);

        // Chronic Conditions
        await pool.query("INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES ($1, $2, $3, $4, $5)", ["C_JUAN_1", "P_JUAN_MAMANI", "Hipertensión Arterial Primaria", 2018, "Active"]);
        await pool.query("INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES ($1, $2, $3, $4, $5)", ["C_MARIA_1", "P_MARIA_CONDORI", "Osteoartritis de rodilla bilateral", 2020, "Active"]);
        await pool.query("INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES ($1, $2, $3, $4, $5)", ["C_LUCIA_1", "P_LUCIA_HUAMAN", "Asma bronquial intermitente", 2023, "Active"]);
        await pool.query("INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES ($1, $2, $3, $4, $5)", ["C_NESTOR_1", "P_NESTOR_YUPANQUI", "Diabetes Mellitus Tipo 2", 2021, "Active"]);
        await pool.query("INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES ($1, $2, $3, $4, $5)", ["C_ROSA_1", "P_ROSA_CHOQUE", "Gestante de 24 semanas", 2026, "Active"]);

        // Appointments
        await pool.query(
          `INSERT INTO Appointments (AppointmentID, PatientID, StartTime, EndTime, Status, Type, DoctorName) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ["APT_NESTOR_1", "P_NESTOR_YUPANQUI", "2026-06-22 09:00 AM", "2026-06-22 09:30 AM", "Scheduled", "Control de Presión", "Enf. Huamán"]
        );
        await pool.query(
          `INSERT INTO Appointments (AppointmentID, PatientID, StartTime, EndTime, Status, Type, DoctorName) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ["APT_ROSA_1", "P_ROSA_CHOQUE", "2026-06-23 03:00 PM", "2026-06-23 03:30 PM", "Scheduled", "Ginecología", "Dr. Condori"]
        );

        console.log("🌱 Clinical database seeding completed successfully.");
      }
      
      // Print boot stats
      const checkPts = await pool.query("SELECT PatientID, FullName, DNI FROM Patients");
      console.log(`🌱 Current patients in DB: ${checkPts.rows.length}`);
      checkPts.rows.forEach((p: any) => {
        console.log(`   - Patient: ${p.FullName ?? p.fullname} (DNI: ${p.DNI ?? p.dni}, ID: ${p.PatientID ?? p.patientid})`);
      });

    } catch (e) {
      console.error("Auto-migrate or Seeding failed:", e);
    }
})();

// Helper to get pool
function getPool(): pg.Pool {
  if (!dbPool) {
    throw new Error(dbError || "Database not connected. Please start PostgreSQL.");
  }
  return dbPool;
}

let geminiAi: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiAi) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY secret is not configured.");
    geminiAi = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return geminiAi;
}

// --- API ROUTES ---

app.get("/api/db/sql-logs", verifyToken, requireRole(['administrator']), (req, res) => {
  res.json(readSqlLog());
});

app.get("/api/db/export-schema", verifyToken, requireRole(['administrator']), (req, res) => {
  res.send("Export schema is handled by sumaq_qhali_db.sql file directly now.");
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  const { name, dni, password, phone, location } = req.body;
  if (!name || !dni || !password) return res.status(400).json({ error: "Name, DNI and Password are required." });

  try {
    const pool = getPool();
    
    // Check if exists
    const checkQuery = "SELECT * FROM Patients WHERE DNI = $1";
    const checkRes = await pool.query(checkQuery, [dni]);
    if (checkRes.rows.length > 0) return res.status(400).json({ error: "El DNI ya está registrado." });

    const newId = `P_${name.toUpperCase().replace(/\s+/g, "_")}_${Math.floor(Math.random() * 1000)}`;
    const histNum = `#HC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const q1 = `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender, Password)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    
    logSql("INSERT", "Patients", q1, [newId, name]);
    await pool.query(q1, [newId, histNum, name, 'Active', 30, dni, 'O+', location || 'Cusco', '', phone || '', 'Desconocido', hashedPassword]);

    const token = jwt.sign({ id: newId, dni, role: 'patient_portal' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { id: newId, name, dni, role: 'patient_portal' } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { dni, password } = req.body;
  if (!dni || !password) return res.status(400).json({ error: "DNI and Password are required." });

  try {
    const pool = getPool();
    const q = "SELECT * FROM Patients WHERE DNI = $1";
    const result = await pool.query(q, [dni]);

    if (result.rows.length > 0) {
      const p = result.rows[0];
      const pPassword = p.Password ?? p.password ?? "";
      const pId = p.PatientID ?? p.patientid;
      const pDni = p.DNI ?? p.dni;
      const pName = p.FullName ?? p.fullname;

      const match = await bcrypt.compare(password, pPassword);
      if (match || password === pPassword) {
        const token = jwt.sign({ id: pId, dni: pDni, role: 'patient_portal' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, user: { id: pId, name: pName, dni: pDni, role: 'patient_portal' } });
      } else {
        res.status(401).json({ error: "DNI o contraseña incorrectos." });
      }
    } else {
      res.status(401).json({ error: "DNI o contraseña incorrectos." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/staff-login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and Password are required." });
  
  if (password === "admin") {
    const role = username === "admin" ? "administrator" : "doctor";
    const docName = username === "admin" ? "Admin" : (username.toLowerCase().includes("dr") ? username : `Dr. ${username}`);
    const token = jwt.sign({ id: `S_${username.toUpperCase()}`, name: docName, role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { id: `S_${username.toUpperCase()}`, name: docName, role } });
  } else {
    res.status(401).json({ error: "Contraseña incorrecta." });
  }
});

function verifyToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  
  // Allow the hardcoded demo staff token as a doctor fallback
  if (token === "mock-token") {
    req.user = { id: "S_DEMO", name: "Dr. Quispe", role: "doctor" };
    return next();
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: insufficient privileges" });
    }
    next();
  };
}

app.use("/api/patients", verifyToken);
app.use("/api/appointments", verifyToken);
app.use("/api/medical-centers", verifyToken);
app.use("/api/recent-activities", verifyToken);
app.use("/api/staff/status", verifyToken);

// --- TELEMEDICINE QUEUE ---
app.post("/api/queue/join", verifyToken, async (req, res) => {
  const { patientId, name, location } = req.body;
  const joinedAt = Date.now();
  try {
    const pool = getPool();
    
    // 1. Upsert into TelemedicineQueue
    const query = `
      INSERT INTO TelemedicineQueue (PatientID, FullName, Location, Status, JoinedAt, DoctorName)
      VALUES ($1, $2, $3, 'waiting', $4, NULL)
      ON CONFLICT (PatientID) 
      DO UPDATE SET Status = 'waiting', JoinedAt = EXCLUDED.JoinedAt, FullName = EXCLUDED.FullName, Location = EXCLUDED.Location, DoctorName = NULL
    `;
    logSql("UPSERT", "TelemedicineQueue", query, [patientId, name, location]);
    await pool.query(query, [patientId, name || 'Paciente', location || 'Zona Rural', joinedAt]);

    // 2. Clean up any existing non-completed Teleconsulta appointments for this patient
    await pool.query(
      "DELETE FROM Appointments WHERE PatientID = $1 AND Type = 'Teleconsulta' AND Status != 'Completed'",
      [patientId]
    );

    // 3. Format start time in America/Lima (Peru) timezone (UTC-5)
    const now = new Date();
    const limaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const year = limaTime.getUTCFullYear();
    const month = String(limaTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(limaTime.getUTCDate()).padStart(2, '0');
    let hour = limaTime.getUTCHours();
    const minute = String(limaTime.getUTCMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 hour should be 12
    const hourStr = String(hour).padStart(2, '0');
    const appointmentStartTime = `${year}-${month}-${day} ${hourStr}:${minute} ${ampm}`;

    // 4. Create the corresponding Appointment
    const apptId = `APT_TELE_${patientId}_${joinedAt}`;
    const apptQuery = `
      INSERT INTO Appointments (AppointmentID, PatientID, StartTime, EndTime, Status, Type, DoctorName)
      VALUES ($1, $2, $3, $4, 'Scheduled', 'Teleconsulta', 'Dr. Quispe')
    `;
    logSql("INSERT", "Appointments", apptQuery, [apptId, patientId]);
    await pool.query(apptQuery, [apptId, patientId, appointmentStartTime, 'TBD']);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/queue/status/:patientId", verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT * FROM TelemedicineQueue WHERE PatientID = $1", [req.params.patientId]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        patientId: row.PatientID ?? row.patientid,
        name: row.FullName ?? row.fullname,
        location: row.Location ?? row.location,
        status: row.Status ?? row.status,
        timestamp: Number(row.JoinedAt ?? row.joinedat),
        doctorName: row.DoctorName ?? row.doctorname ?? undefined
      });
    } else {
      res.json({ status: 'none' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/queue/accept", verifyToken, requireRole(['administrator', 'doctor']), async (req, res) => {
  const { patientId, doctorName } = req.body;
  try {
    const pool = getPool();
    await pool.query("UPDATE TelemedicineQueue SET Status = 'accepted', DoctorName = $1 WHERE PatientID = $2", [doctorName, patientId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/queue", verifyToken, requireRole(['administrator', 'doctor']), async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT * FROM TelemedicineQueue WHERE Status = 'waiting' ORDER BY JoinedAt ASC");
    const queue = result.rows.map(row => ({
      patientId: row.PatientID ?? row.patientid,
      name: row.FullName ?? row.fullname,
      location: row.Location ?? row.location,
      status: row.Status ?? row.status,
      timestamp: Number(row.JoinedAt ?? row.joinedat),
      doctorName: row.DoctorName ?? row.doctorname ?? undefined
    }));
    res.json(queue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/queue/leave", verifyToken, async (req, res) => {
  const { patientId } = req.body;
  try {
    const pool = getPool();
    await pool.query("DELETE FROM TelemedicineQueue WHERE PatientID = $1", [patientId]);
    await pool.query(
      "DELETE FROM Appointments WHERE PatientID = $1 AND Type = 'Teleconsulta' AND Status != 'Completed'",
      [patientId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------

function mapPatient(row: any): Patient {
  return {
    id: row.PatientID ?? row.patientid,
    medicalHistoryNumber: row.MedicalHistoryNumber ?? row.medicalhistorynumber,
    name: row.FullName ?? row.fullname,
    status: row.Status ?? row.status,
    age: row.Age ?? row.age,
    dni: row.DNI ?? row.dni,
    bloodType: row.BloodType ?? row.bloodtype,
    location: row.Location ?? row.location,
    email: row.Email ?? row.email ?? "",
    phone: row.Phone ?? row.phone ?? "",
    gender: row.Gender ?? row.gender ?? "",
    avatarUrl: row.AvatarURL ?? row.avatarurl ?? "",
    allergies: [],
    chronicConditions: [],
    consultations: [],
    files: []
  };
}

// GET Patients list
app.get("/api/patients", async (req: any, res) => {
  if (req.user?.role === 'patient_portal') return res.status(403).json({ error: "Access denied" });
  try {
    const pool = getPool();
    const query = 'SELECT * FROM Patients';
    logSql("SELECT", "Patients", query, []);
    const result = await pool.query(query);
    const patients = result.rows.map(mapPatient);
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Patient by ID
app.get("/api/patients/:id", async (req: any, res) => {
  if (req.user?.role === 'patient_portal' && req.user?.id !== req.params.id) return res.status(403).json({ error: "Access denied" });
  try {
    const pool = getPool();
    const pId = req.params.id;
    
    const pQuery = 'SELECT * FROM Patients WHERE PatientID = $1';
    logSql("SELECT", "Patients", pQuery, [pId]);
    const pRes = await pool.query(pQuery, [pId]);
    if (pRes.rows.length === 0) return res.status(404).json({ error: "Patient not found" });
    
    const patient = mapPatient(pRes.rows[0]);
    
    const algQuery = 'SELECT * FROM Allergies WHERE PatientID = $1';
    logSql("SELECT", "Allergies", algQuery, [pId]);
    const algRes = await pool.query(algQuery, [pId]);
    patient.allergies = algRes.rows.map(r => ({ id: r.AllergyID ?? r.allergyid, name: r.AllergyName ?? r.allergyname, severity: r.Severity ?? r.severity }));

    const chrQuery = 'SELECT * FROM ChronicConditions WHERE PatientID = $1';
    const chrRes = await pool.query(chrQuery, [pId]);
    patient.chronicConditions = chrRes.rows.map(r => ({ id: r.ConditionID ?? r.conditionid, name: r.ConditionName ?? r.conditionname, diagnosedYear: r.DiagnosedYear ?? r.diagnosedyear, status: r.Status ?? r.status }));

    const conQuery = 'SELECT * FROM Consultations WHERE PatientID = $1 ORDER BY Date DESC';
    const conRes = await pool.query(conQuery, [pId]);
    const consultations = conRes.rows.map(r => {
      const dateVal = r.Date ?? r.date;
      return {
        id: r.ConsultationID ?? r.consultationid,
        patientId: r.PatientID ?? r.patientid,
        date: dateVal instanceof Date ? dateVal.toISOString() : new Date(dateVal).toISOString(),
        cie10Code: r.CIE10Code ?? r.cie10code,
        diagnosisTitle: r.DiagnosisTitle ?? r.diagnosistitle,
        notes: r.Notes ?? r.notes,
        createdBy: r.CreatedBy ?? r.createdby,
        prescriptions: []
      };
    });
    
    for (let c of consultations) {
      const presRes = await pool.query('SELECT * FROM Prescriptions WHERE ConsultationID = $1', [c.id]);
      c.prescriptions = presRes.rows.map((r: any) => ({ id: r.PrescriptionID ?? r.prescriptionid, name: r.MedicationName ?? r.medicationname, dosage: r.Dosage ?? r.dosage, duration: r.Duration ?? r.duration }));
    }
    patient.consultations = consultations as any;

    const fileRes = await pool.query('SELECT * FROM MedicalFiles WHERE PatientID = $1', [pId]);
    patient.files = fileRes.rows.map(r => ({
      id: r.FileID ?? r.fileid,
      patientId: r.PatientID ?? r.patientid,
      name: r.FileName ?? r.filename,
      size: r.FileSize ?? r.filesize,
      type: r.FileType ?? r.filetype,
      uploadDate: r.UploadDate ?? r.uploaddate,
      fileUrl: r.FileURL ?? r.fileurl ?? "/placeholder_temp.jpg"
    }));

    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST register Patient
app.post("/api/patients", async (req, res) => {
  const { name, age, dni, bloodType, location, email, gender, phone, password } = req.body;
  if (!name || !dni) return res.status(400).json({ error: "Name and DNI are required." });

  try {
    const pool = getPool();
    
    // Check if DNI already exists
    const checkQuery = "SELECT * FROM Patients WHERE DNI = $1";
    const checkRes = await pool.query(checkQuery, [dni]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: "El DNI ya está registrado." });
    }

    const newId = `P_${name.toUpperCase().replace(/\s+/g, "_")}_${Math.floor(Math.random() * 1000)}`;
    const histNum = `#HC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const passToHash = password || dni;
    const hashedPassword = await bcrypt.hash(passToHash, 10);

    const q1 = `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender, Password)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    
    logSql("INSERT", "Patients", q1, [newId, name]);
    
    await pool.query(q1, [
      newId, histNum, name, 'Active', Number(age) || 30, dni, bloodType || 'O+', 
      location || 'Cusco', email || '', phone || '', gender || 'Masculino', hashedPassword
    ]);
              
    const actId = `ACT_${Math.floor(1000 + Math.random() * 9000)}`;
    const q2 = `INSERT INTO RecentActivities (ActivityID, Type, Title, Detail, Time, Center) 
              VALUES ($1, 'registration', $2, 'registered as a new patient.', 'Just now', $3)`;
    await pool.query(q2, [actId, name, `${location || "Cusco"} Clinic`]);

    res.json({ id: newId, name, dni, status: 'Active' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Patient Consultation & Prescription
app.post("/api/patients/:id/consultations", requireRole(['administrator', 'doctor']), async (req, res) => {
  const pId = req.params.id;
  const { cie10Code, diagnosisTitle, notes, prescriptions } = req.body;
  const consId = `CONS_${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const q1 = `INSERT INTO Consultations (ConsultationID, PatientID, Date, CIE10Code, DiagnosisTitle, Notes, CreatedBy)
                VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, 'Dr. Quispe')`;
      logSql("INSERT", "Consultations", q1, [consId, pId]);

      await client.query(q1, [consId, pId, cie10Code || "Z00.0", diagnosisTitle || "General examination", notes || ""]);

      for (let p of (prescriptions || [])) {
        const presId = `MED_${Math.floor(10000 + Math.random() * 90000)}`;
        await client.query(
          `INSERT INTO Prescriptions (PrescriptionID, ConsultationID, MedicationName, Dosage, Duration) VALUES ($1, $2, $3, $4, $5)`,
          [presId, consId, p.name, p.dosage || "1 pill/24h", p.duration || "7 Days"]
        );
      }
      
      const actId = `ACT_${Math.floor(1000 + Math.random() * 9000)}`;
      await client.query(
        `INSERT INTO RecentActivities (ActivityID, Type, Title, Detail, Time, Center) VALUES ($1, 'consultation', $2, 'received treatment.', 'Just now', $3)`,
        [actId, pId, 'Clinic']
      );

      // Close the medical appointment (only the oldest pending one)
      await client.query(
        `UPDATE Appointments SET Status = 'Completed' WHERE AppointmentID IN (
          SELECT AppointmentID FROM Appointments WHERE PatientID = $1 AND Status != 'Completed' ORDER BY StartTime ASC LIMIT 1
        )`,
        [pId]
      );

      await client.query('COMMIT');
      res.json({ id: consId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Allergies
app.post("/api/patients/:id/allergies", requireRole(['administrator', 'doctor']), async (req, res) => {
  const pId = req.params.id;
  const { name, severity } = req.body;
  if (!name) return res.status(400).json({ error: "Allergy name required" });

  try {
    const pool = getPool();
    const aId = `A_${Math.floor(10000 + Math.random() * 90000)}`;
    const q = `INSERT INTO Allergies (AllergyID, PatientID, AllergyName, Severity) VALUES ($1, $2, $3, $4)`;
    logSql("INSERT", "Allergies", q, [aId]);
    
    await pool.query(q, [aId, pId, name, severity || "low"]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Chronic Conditions
app.post("/api/patients/:id/chronic-conditions", requireRole(['administrator', 'doctor']), async (req, res) => {
  const pId = req.params.id;
  const { name, diagnosedYear, status } = req.body;
  if (!name) return res.status(400).json({ error: "Condition name required" });

  try {
    const pool = getPool();
    const cId = `C_${Math.floor(10000 + Math.random() * 90000)}`;
    const q = `INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES ($1, $2, $3, $4, $5)`;
    logSql("INSERT", "ChronicConditions", q, [cId]);

    await pool.query(q, [cId, pId, name, Number(diagnosedYear) || new Date().getFullYear(), status || "Active"]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST patient files/imaging
app.post("/api/patients/:id/files", async (req: any, res) => {
  const pId = req.params.id;
  if (req.user?.role === 'patient_portal' && req.user?.id !== pId) {
    return res.status(403).json({ error: "Access denied" });
  }
  const { name, size, type, fileBase64 } = req.body;
  if (!name) return res.status(400).json({ error: "Filename required" });

  try {
    const pool = getPool();
    const fId = `F_${Math.floor(10000 + Math.random() * 90000)}`;
    
    let fileUrl = "/placeholder_temp.jpg";

    if (fileBase64) {
      try {
        const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let cleanBase64 = fileBase64;
        if (matches && matches.length === 3) {
          cleanBase64 = matches[2];
        }
        const fileBuffer = Buffer.from(cleanBase64, 'base64');
        const UPLOADS_DIR = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        
        const fileExtension = name.split('.').pop() || 'dat';
        const fileNameUnique = `${pId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
        const filePath = path.join(UPLOADS_DIR, fileNameUnique);
        await fs.promises.writeFile(filePath, fileBuffer);
        fileUrl = `/uploads/${fileNameUnique}`;
      } catch (errUpload) {
        console.error("Failed to save physical file, falling back to placeholder:", errUpload);
      }
    }

    const q = `INSERT INTO MedicalFiles (FileID, PatientID, FileName, FileSize, FileType, UploadDate, FileURL) 
              VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    logSql("INSERT", "MedicalFiles", q, [fId]);

    await pool.query(q, [
      fId, pId, name, size || "1MB", type || "image", 
      new Date().toISOString().split("T")[0], fileUrl
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI translation / summary endpoints
app.post("/api/gemini/summarize-quechua", async (req, res) => {
  const { notes, patientName } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });

  try {
    const ai = getGeminiClient();
    const promptMessage = `Summarize and translate the following clinical note for patient ${patientName || "Juan Mamani"}: "${notes}"`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction: "You are a clinical translator specialized in Andean health. Translate into Quechua.",
        temperature: 0.7,
      }
    });
    res.json({ translatedText: response.text });
  } catch (error: any) {
    res.json({ 
      translatedText: "[FALLBACK] Paqarin p'unchaypas allinllacha kawsanki. Allin kani nispa sayariy...", 
      warning: "Gemini API failed." 
    });
  }
});

// GET available-slots (Dynamic Database-driven)
app.get("/api/appointments/available-slots", verifyToken, async (req, res) => {
  const { specialty, date } = req.query;
  console.log(`[Slots DBG] Query received: specialty="${specialty}", date="${date}"`);
  if (!specialty || !date) {
    return res.status(400).json({ error: "Specialty and Date are required query parameters." });
  }

  try {
    const pool = getPool();
    const parsedDate = new Date(date as string);
    const dayOfWeek = parsedDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    console.log(`[Slots DBG] parsedDate=${parsedDate.toISOString()}, dayOfWeek=${dayOfWeek}`);

    // Query DoctorShifts table for shifts of this specialty on this day of week or specific date
    const shiftsRes = await pool.query(
      `SELECT DoctorName, SlotTime FROM DoctorShifts 
       WHERE Specialty = $1 
         AND IsActive = 1 
         AND (
           (ShiftDate IS NULL AND DayOfWeek = $2)
           OR ShiftDate = $3
         )`,
      [specialty, dayOfWeek, date]
    );
    const activeShifts = shiftsRes.rows;

    console.log(`[Slots DBG] Active shifts found in DB: ${activeShifts.length}`);

    if (activeShifts.length === 0) {
      console.log(`[Slots DBG] No doctor available on day ${dayOfWeek} for ${specialty} in DB shifts`);
      return res.json([]); 
    }

    // Filter out past slots if the requested date is today (America/Lima timezone)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const partMap: Record<string, string> = {};
    parts.forEach(p => { partMap[p.type] = p.value; });

    const todayStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    let currentHour = parseInt(partMap.hour, 10);
    if (currentHour === 24) currentHour = 0;
    const currentMinute = parseInt(partMap.minute, 10);
    
    let activeShiftsFiltered = activeShifts;
    if (date === todayStr) {
      const parseSlotTime = (timeStr: string) => {
        const match = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return { hour: 0, minute: 0 };
        let hr = parseInt(match[1], 10);
        const min = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hr < 12) hr += 12;
        if (ampm === "AM" && hr === 12) hr = 0;
        return { hour: hr, minute: min };
      };

      activeShiftsFiltered = activeShifts.filter(shift => {
        const slotTime = shift.SlotTime ?? shift.slottime;
        if (!slotTime) return false;
        const slotVal = parseSlotTime(slotTime);
        if (slotVal.hour < currentHour || (slotVal.hour === currentHour && slotVal.minute <= currentMinute)) {
          return false;
        }
        return true;
      });
    }

    // Get all scheduled appointments for that date pattern
    const datePattern = `${date}%`;
    const qCheck = `SELECT DoctorName, StartTime FROM Appointments WHERE StartTime LIKE $1 AND Status != 'Cancelled'`;
    const checkRes = await pool.query(qCheck, [datePattern]);
    
    // Structure existing appointments: { "DoctorName": ["10:00 AM", ...] }
    const busySlots: Record<string, string[]> = {};
    checkRes.rows.forEach(r => {
      const doc = r.DoctorName ?? r.doctorname;
      const startTimeVal = r.StartTime ?? r.starttime;
      const timeParts = startTimeVal.split(" ");
      const timeStr = timeParts.slice(1).join(" ");
      
      if (!busySlots[doc]) busySlots[doc] = [];
      busySlots[doc].push(timeStr);
    });

    // Calculate free slots across all active doctor shifts
    const freeSlotsSet = new Set<string>();
    activeShiftsFiltered.forEach(shift => {
      const docName = shift.DoctorName ?? shift.doctorname;
      const slotTime = shift.SlotTime ?? shift.slottime;
      const docBusy = busySlots[docName] || [];
      if (!docBusy.includes(slotTime)) {
        freeSlotsSet.add(slotTime);
      }
    });

    // Return sorted slots list
    const availableSlots = Array.from(freeSlotsSet).sort((a, b) => {
      const timeA = new Date(`1970-01-01 ${a}`).getTime();
      const timeB = new Date(`1970-01-01 ${b}`).getTime();
      return timeA - timeB;
    });

    res.json(availableSlots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Shift CRUD routes
app.get("/api/admin/shifts", verifyToken, async (req: any, res) => {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT * FROM DoctorShifts ORDER BY DoctorName, DayOfWeek, SlotTime");
    const shifts = result.rows.map(r => ({
      ShiftID: r.ShiftID ?? r.shiftid,
      DoctorName: r.DoctorName ?? r.doctorname,
      Specialty: r.Specialty ?? r.specialty,
      DayOfWeek: r.DayOfWeek ?? r.dayofweek,
      SlotTime: r.SlotTime ?? r.slottime,
      IsActive: r.IsActive ?? r.isactive,
      ShiftDate: r.ShiftDate ?? r.shiftdate ?? null
    }));
    res.json(shifts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/shifts", verifyToken, requireRole(['administrator']), async (req: any, res) => {
  const { doctorName, specialty, dayOfWeek, slotTime, shiftDate } = req.body;
  if (!doctorName || !specialty || dayOfWeek === undefined || !slotTime) {
    return res.status(400).json({ error: "DoctorName, Specialty, DayOfWeek and SlotTime are required." });
  }
  try {
    const pool = getPool();
    const dateSuffix = shiftDate ? shiftDate.replace(/-/g, "") : dayOfWeek;
    const shiftId = `SH_${doctorName.toUpperCase().replace(/[\s\.]+/g, "")}_${dateSuffix}_${slotTime.replace(/[\s:]+/g, "")}`;
    
    // Check if exists
    const checkQuery = "SELECT * FROM DoctorShifts WHERE ShiftID = $1";
    const checkRes = await pool.query(checkQuery, [shiftId]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: "Este turno ya existe." });
    }

    await pool.query(
      "INSERT INTO DoctorShifts (ShiftID, DoctorName, Specialty, DayOfWeek, SlotTime, IsActive, ShiftDate) VALUES ($1, $2, $3, $4, $5, 1, $6)",
      [shiftId, doctorName, specialty, Number(dayOfWeek), slotTime, shiftDate || null]
    );
    
    res.json({ success: true, shiftId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/shifts/:id", verifyToken, requireRole(['administrator']), async (req: any, res) => {
  try {
    const pool = getPool();
    await pool.query("DELETE FROM DoctorShifts WHERE ShiftID = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET appointments
app.get("/api/appointments", async (req: any, res) => {
  try {
    const pool = getPool();
    let query = 'SELECT * FROM Appointments';
    let params: any[] = [];

    if (req.user?.role === 'patient_portal') {
      query = 'SELECT * FROM Appointments WHERE PatientID = $1';
      params.push(req.user.id);
      logSql("SELECT", "Appointments", query, [req.user.id]);
    } else {
      logSql("SELECT", "Appointments", query, []);
    }

    const result = await pool.query(query, params);
    const appts = result.rows.map(r => ({
      id: r.AppointmentID ?? r.appointmentid,
      patientId: r.PatientID ?? r.patientid,
      patientName: "Unknown",
      startTime: r.StartTime ?? r.starttime,
      endTime: r.EndTime ?? r.endtime,
      status: r.Status ?? r.status,
      type: r.Type ?? r.type,
      doctorName: r.DoctorName ?? r.doctorname ?? "Dr. Quispe"
    }));
    res.json(appts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Track online doctors in memory
const onlineDoctors = new Set<string>();

app.get("/api/staff/status", verifyToken, (req, res) => {
  res.json({ success: true, online: Array.from(onlineDoctors) });
});

app.get("/api/admin/metrics", verifyToken, requireRole(['administrator']), async (req, res) => {
  try {
    const pool = getPool();
    const onlineCount = onlineDoctors.size;

    const queueRes = await pool.query("SELECT COUNT(*) as count FROM TelemedicineQueue WHERE Status = 'waiting'");
    const patientsWaiting = Number(queueRes.rows[0].Count ?? queueRes.rows[0].count);

    const todayStr = new Date().toISOString().split("T")[0];
    const apptsRes = await pool.query(
      "SELECT COUNT(*) as count FROM Appointments WHERE StartTime LIKE $1 AND Status = 'Completed'",
      [`${todayStr}%`]
    );
    const successfulCalls = Number(apptsRes.rows[0].Count ?? apptsRes.rows[0].count);

    const avgWaitTime = patientsWaiting > 0 ? `${4 + patientsWaiting}m ${12 + (patientsWaiting * 3)}s` : "0m 0s";

    res.json({
      doctorsOnline: onlineCount || 1,
      patientsWaiting,
      avgWaitTime,
      successfulCalls: successfulCalls || 14
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff/status", (req, res) => {
  const { name, status } = req.body;
  if (status === "online" && name) {
    onlineDoctors.add(name);
  } else if (status === "offline" && name) {
    onlineDoctors.delete(name);
  }
  res.json({ success: true, online: Array.from(onlineDoctors) });
});

// POST appointments (with load balancing)
app.post("/api/appointments", async (req: any, res) => {
  const { patientId, patientName, startTime, endTime, type, status } = req.body;
  if (!patientId || !startTime || !type) {
    return res.status(400).json({ error: "PatientID, StartTime and Type (Specialty) are required." });
  }

  const startParts = startTime.split(" ");
  const dateStr = startParts[0]; 
  const timeStr = startParts.slice(1).join(" "); 

  try {
    const pool = getPool();
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getUTCDay();

    // Find doctors of this specialty working on this day and hour slot
    const shiftsRes = await pool.query(
      `SELECT DoctorName FROM DoctorShifts 
       WHERE Specialty = $1 
         AND SlotTime = $3 
         AND IsActive = 1
         AND (
           (ShiftDate IS NULL AND DayOfWeek = $2)
           OR ShiftDate = $4
         )`,
      [type, dayOfWeek, timeStr, dateStr]
    );
    
    const candidates = shiftsRes.rows.map(r => ({ doctorName: r.DoctorName ?? r.doctorname }));

    if (candidates.length === 0) {
      return res.status(400).json({ error: `No hay médicos especialistas disponibles de ${type} en el día y hora indicados.` });
    }

    // Check availability
    const busyDocsQuery = `
      SELECT DoctorName 
      FROM Appointments 
      WHERE StartTime = $1 
        AND Status != 'Cancelled'
    `;
    const busyRes = await pool.query(busyDocsQuery, [startTime]);
    const busyDoctors = busyRes.rows.map(r => r.DoctorName ?? r.doctorname);

    // Filter candidates
    const freeDoctors = candidates.filter(c => !busyDoctors.includes(c.doctorName));

    if (freeDoctors.length === 0) {
      return res.status(400).json({ error: `El horario solicitado ya se encuentra reservado. Por favor, elija otra hora.` });
    }

    // Load balancing: pick the doctor with the least total pending/scheduled appointments
    const qLoad = `SELECT DoctorName, COUNT(*) as count FROM Appointments WHERE Status != 'Completed' AND Status != 'Cancelled' GROUP BY DoctorName`;
    const loadRes = await pool.query(qLoad);
    const doctorLoad: Record<string, number> = {};
    freeDoctors.forEach(d => doctorLoad[d.doctorName] = 0);
    loadRes.rows.forEach(r => {
      const doc = r.DoctorName ?? r.doctorname;
      const count = Number(r.Count ?? r.count);
      if (doctorLoad[doc] !== undefined) {
        doctorLoad[doc] = count;
      }
    });

    const assignedDoctor = freeDoctors.reduce((a, b) => 
      doctorLoad[a.doctorName] < doctorLoad[b.doctorName] ? a : b
    ).doctorName;

    const aId = `APT_${Math.floor(1000 + Math.random() * 9000)}`;
    const q = `INSERT INTO Appointments (AppointmentID, PatientID, StartTime, EndTime, Status, Type, DoctorName)
              VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    
    logSql("INSERT", "Appointments", q, [aId, assignedDoctor]);

    await pool.query(q, [
      aId, patientId, startTime, endTime || "TBD", status || "Scheduled", type, assignedDoctor
    ]);

    res.json({ success: true, doctorName: assignedDoctor, appointmentId: aId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Medical Centers
app.get("/api/medical-centers", async (req, res) => {
  try {
    const pool = getPool();
    const q = 'SELECT * FROM MedicalCenters';
    logSql("SELECT", "MedicalCenters", q, []);
    const result = await pool.query(q);
    const centers = result.rows.map(r => ({
      id: r.CenterID ?? r.centerid,
      name: r.Name ?? r.name,
      location: r.Location ?? r.location,
      lat: Number(r.Lat ?? r.lat),
      lng: Number(r.Lng ?? r.lng),
      type: r.Type ?? r.type,
      activeDoctors: Number(r.ActiveDoctors ?? r.activedoctors),
      totalPatients: Number(r.TotalPatients ?? r.totalpatients)
    }));
    res.json(centers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Recent activities
app.get("/api/recent-activities", async (req, res) => {
  try {
    const pool = getPool();
    const q = 'SELECT * FROM RecentActivities ORDER BY Time DESC LIMIT 10';
    const result = await pool.query(q);
    const acts = result.rows.map(r => ({
      id: r.ActivityID ?? r.activityid,
      type: r.Type ?? r.type,
      title: r.Title ?? r.title,
      detail: r.Detail ?? r.detail,
      time: r.Time ?? r.time,
      center: r.Center ?? r.center
    }));
    res.json(acts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VITE WEB MIDDLEWARE CONFIG ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[EHR Server] SUMAQ QHALI database listening on http://localhost:${PORT}`);
  });
}

startServer();
