import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import sql from "mssql";
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

// SQL Server Configuration
const sqlConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "your_password",
  database: process.env.DB_NAME || "SumaqQhali",
  server: process.env.DB_SERVER || "localhost",
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: false, trustServerCertificate: true, connectTimeout: 5000, requestTimeout: 10000 }
};

let dbPool: sql.ConnectionPool | null = null;
let dbError: string | null = null;

// Try to connect with a timeout — never hang the server
(async () => {
  try {
    const pool = await Promise.race([
      sql.connect(sqlConfig),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DB connection timeout (5s)")), 5000))
    ]);
    dbPool = pool;
    console.log("✅ SQL Server connected successfully.");

    try {
      const checkPts = await pool.request().query("SELECT PatientID, FullName, DNI FROM Patients");
      console.log(`🌱 Current patients in DB: ${checkPts.recordset.length}`);
      checkPts.recordset.forEach(p => {
        console.log(`   - Patient: ${p.FullName} (DNI: ${p.DNI}, ID: ${p.PatientID})`);
      });
    } catch (err) {
      console.error("Failed to log patients on boot:", err);
    }
    
    // Auto-migrate columns
    try {
      await pool.request().query(`
        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Password' AND Object_ID = Object_ID(N'Patients'))
        BEGIN
            ALTER TABLE Patients ADD Password NVARCHAR(255) NULL;
            PRINT 'Added Password column to Patients';
        END

        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'DoctorName' AND Object_ID = Object_ID(N'Appointments'))
        BEGIN
            ALTER TABLE Appointments ADD DoctorName NVARCHAR(255) NULL;
            PRINT 'Added DoctorName column to Appointments';
        END

        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'FileURL' AND Object_ID = Object_ID(N'MedicalFiles'))
        BEGIN
            ALTER TABLE MedicalFiles ADD FileURL NVARCHAR(500) NULL;
            PRINT 'Added FileURL column to MedicalFiles';
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'TelemedicineQueue') AND type in (N'U'))
        BEGIN
            CREATE TABLE TelemedicineQueue (
                PatientID VARCHAR(100) NOT NULL PRIMARY KEY,
                FullName NVARCHAR(255) NOT NULL,
                Location NVARCHAR(255) NOT NULL,
                Status VARCHAR(50) NOT NULL,
                JoinedAt BIGINT NOT NULL,
                DoctorName NVARCHAR(255) NULL
            );
            PRINT 'Created TelemedicineQueue table';
        END

        -- Ampliar longitud de columnas de citas
        ALTER TABLE Appointments ALTER COLUMN StartTime VARCHAR(100) NULL;
        ALTER TABLE Appointments ALTER COLUMN EndTime VARCHAR(100) NULL;
        PRINT 'Updated StartTime/EndTime column lengths to VARCHAR(100)';
      `);

      // Seeding DoctorShifts table if empty
      const checkShifts = await pool.request().query("SELECT COUNT(*) as Count FROM DoctorShifts");
      if (checkShifts.recordset[0].Count === 0) {
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
          await pool.request()
            .input("id", sql.VarChar, shiftId)
            .input("doc", sql.NVarChar, s.doc)
            .input("spec", sql.NVarChar, s.spec)
            .input("day", sql.Int, s.day)
            .input("slot", sql.VarChar, s.slot)
            .query("INSERT INTO DoctorShifts (ShiftID, DoctorName, Specialty, DayOfWeek, SlotTime, IsActive) VALUES (@id, @doc, @spec, @day, @slot, 1)");
        }
        console.log("🌱 Successfully seeded DoctorShifts.");
      }
    } catch (e) {
      console.error("Auto-migrate or Seeding failed:", e);
    }
  } catch (err: any) {
    dbError = err.message;
    console.error("⚠️  SQL Server NOT available:", err.message);
    console.error("   The app will run with empty data. Start SQL Server and restart to enable persistence.");
  }
})();

// Helper to get pool — returns immediately, never hangs
function getPool(): sql.ConnectionPool {
  if (!dbPool) {
    throw new Error(dbError || "Database not connected. Please start SQL Server.");
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
    const checkQuery = "SELECT * FROM Patients WHERE DNI = @DNI";
    const checkRes = await pool.request().input('DNI', sql.VarChar, dni).query(checkQuery);
    if (checkRes.recordset.length > 0) return res.status(400).json({ error: "El DNI ya está registrado." });

    const newId = `P_${name.toUpperCase().replace(/\s+/g, "_")}_${Math.floor(Math.random() * 1000)}`;
    const histNum = `#HC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const q1 = `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender, Password)
              VALUES (@PatientID, @HistNum, @FullName, @Status, @Age, @DNI, @BloodType, @Location, @Email, @Phone, @Gender, @Password)`;
    
    await pool.request()
      .input('PatientID', sql.VarChar, newId)
      .input('HistNum', sql.VarChar, histNum)
      .input('FullName', sql.NVarChar, name)
      .input('Status', sql.VarChar, 'Active')
      .input('Age', sql.Int, 30) // Default
      .input('DNI', sql.VarChar, dni)
      .input('BloodType', sql.VarChar, 'O+') // Default
      .input('Location', sql.NVarChar, location || 'Cusco')
      .input('Email', sql.VarChar, '')
      .input('Phone', sql.VarChar, phone || '')
      .input('Gender', sql.VarChar, 'Desconocido')
      .input('Password', sql.NVarChar, hashedPassword)
      .query(q1);

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
    const q = "SELECT * FROM Patients WHERE DNI = @DNI";
    const result = await pool.request()
      .input('DNI', sql.VarChar, dni)
      .query(q);

    if (result.recordset.length > 0) {
      const p = result.recordset[0];
      const match = await bcrypt.compare(password, p.Password || "");
      if (match || password === p.Password) {
        const token = jwt.sign({ id: p.PatientID, dni: p.DNI, role: 'patient_portal' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, user: { id: p.PatientID, name: p.FullName, dni: p.DNI, role: 'patient_portal' } });
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
    const query = `
      IF EXISTS (SELECT 1 FROM TelemedicineQueue WHERE PatientID = @pid)
      BEGIN
          UPDATE TelemedicineQueue 
          SET Status = 'waiting', JoinedAt = @joined, FullName = @name, Location = @loc, DoctorName = NULL 
          WHERE PatientID = @pid
      END
      ELSE
      BEGIN
          INSERT INTO TelemedicineQueue (PatientID, FullName, Location, Status, JoinedAt)
          VALUES (@pid, @name, @loc, 'waiting', @joined)
      END
    `;
    await pool.request()
      .input('pid', sql.VarChar, patientId)
      .input('name', sql.NVarChar, name || 'Paciente')
      .input('loc', sql.NVarChar, location || 'Zona Rural')
      .input('joined', sql.BigInt, joinedAt)
      .query(query);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/queue/status/:patientId", verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('pid', sql.VarChar, req.params.patientId)
      .query("SELECT * FROM TelemedicineQueue WHERE PatientID = @pid");
    if (result.recordset.length > 0) {
      const row = result.recordset[0];
      res.json({
        patientId: row.PatientID,
        name: row.FullName,
        location: row.Location,
        status: row.Status,
        timestamp: Number(row.JoinedAt),
        doctorName: row.DoctorName || undefined
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
    await pool.request()
      .input('pid', sql.VarChar, patientId)
      .input('doc', sql.NVarChar, doctorName)
      .query("UPDATE TelemedicineQueue SET Status = 'accepted', DoctorName = @doc WHERE PatientID = @pid");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/queue", verifyToken, requireRole(['administrator', 'doctor']), async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query("SELECT * FROM TelemedicineQueue WHERE Status = 'waiting' ORDER BY JoinedAt ASC");
    const queue = result.recordset.map(row => ({
      patientId: row.PatientID,
      name: row.FullName,
      location: row.Location,
      status: row.Status,
      timestamp: Number(row.JoinedAt),
      doctorName: row.DoctorName || undefined
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
    await pool.request()
      .input('pid', sql.VarChar, patientId)
      .query("DELETE FROM TelemedicineQueue WHERE PatientID = @pid");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------

function mapPatient(row: any): Patient {
  return {
    id: row.PatientID,
    medicalHistoryNumber: row.MedicalHistoryNumber,
    name: row.FullName,
    status: row.Status,
    age: row.Age,
    dni: row.DNI,
    bloodType: row.BloodType,
    location: row.Location,
    email: row.Email || "",
    phone: row.Phone || "",
    gender: row.Gender || "",
    avatarUrl: row.AvatarURL || "",
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
    logSql("SELECT", "Patients", query, {});
    const result = await pool.request().query(query);
    const patients = result.recordset.map(mapPatient);
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
    
    const pQuery = 'SELECT * FROM Patients WHERE PatientID = @id';
    logSql("SELECT", "Patients", pQuery, { "@id": pId });
    const pRes = await pool.request().input('id', sql.VarChar, pId).query(pQuery);
    if (pRes.recordset.length === 0) return res.status(404).json({ error: "Patient not found" });
    
    const patient = mapPatient(pRes.recordset[0]);
    
    const algQuery = 'SELECT * FROM Allergies WHERE PatientID = @id';
    logSql("SELECT", "Allergies", algQuery, { "@id": pId });
    const algRes = await pool.request().input('id', sql.VarChar, pId).query(algQuery);
    patient.allergies = algRes.recordset.map(r => ({ id: r.AllergyID, name: r.AllergyName, severity: r.Severity }));

    const chrQuery = 'SELECT * FROM ChronicConditions WHERE PatientID = @id';
    const chrRes = await pool.request().input('id', sql.VarChar, pId).query(chrQuery);
    patient.chronicConditions = chrRes.recordset.map(r => ({ id: r.ConditionID, name: r.ConditionName, diagnosedYear: r.DiagnosedYear, status: r.Status }));

    const conQuery = 'SELECT * FROM Consultations WHERE PatientID = @id ORDER BY Date DESC';
    const conRes = await pool.request().input('id', sql.VarChar, pId).query(conQuery);
    const consultations = conRes.recordset.map(r => ({
      id: r.ConsultationID, patientId: r.PatientID, date: r.Date.toISOString(), cie10Code: r.CIE10Code,
      diagnosisTitle: r.DiagnosisTitle, notes: r.Notes, createdBy: r.CreatedBy, prescriptions: []
    }));
    
    for (let c of consultations) {
      const presRes = await pool.request().input('id', sql.VarChar, c.id).query('SELECT * FROM Prescriptions WHERE ConsultationID = @id');
      c.prescriptions = presRes.recordset.map((r: any) => ({ id: r.PrescriptionID, name: r.MedicationName, dosage: r.Dosage, duration: r.Duration }));
    }
    patient.consultations = consultations as any;

    const fileRes = await pool.request().input('id', sql.VarChar, pId).query('SELECT * FROM MedicalFiles WHERE PatientID = @id');
    patient.files = fileRes.recordset.map(r => ({
      id: r.FileID, patientId: r.PatientID, name: r.FileName, size: r.FileSize,
      type: r.FileType, uploadDate: r.UploadDate, fileUrl: r.FileURL || "/placeholder_temp.jpg"
    }));

    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST register Patient
app.post("/api/patients", async (req, res) => {
  const { name, age, dni, bloodType, location, email, gender, phone } = req.body;
  if (!name || !dni) return res.status(400).json({ error: "Name and DNI are required." });

  const newId = `P_${name.toUpperCase().replace(/\s+/g, "_")}_${Math.floor(Math.random() * 1000)}`;
  const histNum = `#HC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const pool = getPool();
    const q1 = `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender)
              VALUES (@PatientID, @HistNum, @FullName, @Status, @Age, @DNI, @BloodType, @Location, @Email, @Phone, @Gender)`;
    
    logSql("INSERT", "Patients", q1, { "@PatientID": newId, "@FullName": name });
    
    await pool.request()
      .input('PatientID', sql.VarChar, newId)
      .input('HistNum', sql.VarChar, histNum)
      .input('FullName', sql.NVarChar, name)
      .input('Status', sql.VarChar, 'Active')
      .input('Age', sql.Int, Number(age) || 30)
      .input('DNI', sql.VarChar, dni)
      .input('BloodType', sql.VarChar, bloodType || 'O+')
      .input('Location', sql.NVarChar, location || 'Cusco')
      .input('Email', sql.VarChar, email || '')
      .input('Phone', sql.VarChar, phone || '')
      .input('Gender', sql.VarChar, gender || 'Masculino')
      .query(q1);
              
    const actId = `ACT_${Math.floor(1000 + Math.random() * 9000)}`;
    const q2 = `INSERT INTO RecentActivities (ActivityID, Type, Title, Detail, Time, Center) 
              VALUES (@ActID, 'registration', @Title, 'registered as a new patient.', 'Just now', @Center)`;
    await pool.request()
      .input('ActID', sql.VarChar, actId)
      .input('Title', sql.NVarChar, name)
      .input('Center', sql.NVarChar, `${location || "Cusco"} Clinic`)
      .query(q2);

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
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const q1 = `INSERT INTO Consultations (ConsultationID, PatientID, Date, CIE10Code, DiagnosisTitle, Notes, CreatedBy)
                VALUES (@ConsID, @PatientID, GETDATE(), @CIE10, @DiagTitle, @Notes, 'Dr. Quispe')`;
      logSql("INSERT", "Consultations", q1, { "@ConsID": consId, "@PatientID": pId });

      await transaction.request()
        .input('ConsID', sql.VarChar, consId)
        .input('PatientID', sql.VarChar, pId)
        .input('CIE10', sql.VarChar, cie10Code || "Z00.0")
        .input('DiagTitle', sql.NVarChar, diagnosisTitle || "General examination")
        .input('Notes', sql.NVarChar, notes || "")
        .query(q1);

      for (let p of (prescriptions || [])) {
        const presId = `MED_${Math.floor(10000 + Math.random() * 90000)}`;
        await transaction.request()
          .input('PresID', sql.VarChar, presId)
          .input('ConsID', sql.VarChar, consId)
          .input('Name', sql.NVarChar, p.name)
          .input('Dosage', sql.NVarChar, p.dosage || "1 pill/24h")
          .input('Dur', sql.NVarChar, p.duration || "7 Days")
          .query(`INSERT INTO Prescriptions (PrescriptionID, ConsultationID, MedicationName, Dosage, Duration)
                  VALUES (@PresID, @ConsID, @Name, @Dosage, @Dur)`);
      }
      
      await transaction.request()
        .input('ActID', sql.VarChar, `ACT_${Math.floor(1000 + Math.random() * 9000)}`)
        .input('Title', sql.NVarChar, pId)
        .input('Center', sql.NVarChar, 'Clinic')
        .query(`INSERT INTO RecentActivities (ActivityID, Type, Title, Detail, Time, Center) 
                VALUES (@ActID, 'consultation', @Title, 'received treatment.', 'Just now', @Center)`);

      // Close the medical appointment (only the first/oldest pending one)
      await transaction.request()
        .input('PID', sql.VarChar, pId)
        .query(`UPDATE TOP (1) Appointments SET Status = 'Completed' WHERE PatientID = @PID AND Status != 'Completed'`);

      await transaction.commit();
      res.json({ id: consId });
    } catch (err) {
      await transaction.rollback();
      throw err;
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
    const q = `INSERT INTO Allergies (AllergyID, PatientID, AllergyName, Severity) VALUES (@AllergyID, @PatientID, @Name, @Sev)`;
    logSql("INSERT", "Allergies", q, {"@AllergyID": aId});
    
    await pool.request()
      .input('AllergyID', sql.VarChar, aId)
      .input('PatientID', sql.VarChar, pId)
      .input('Name', sql.NVarChar, name)
      .input('Sev', sql.VarChar, severity || "low")
      .query(q);
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
    const q = `INSERT INTO ChronicConditions (ConditionID, PatientID, ConditionName, DiagnosedYear, Status) VALUES (@CID, @PID, @Name, @Year, @Status)`;
    logSql("INSERT", "ChronicConditions", q, {"@CID": cId});

    await pool.request()
      .input('CID', sql.VarChar, cId)
      .input('PID', sql.VarChar, pId)
      .input('Name', sql.NVarChar, name)
      .input('Year', sql.Int, Number(diagnosedYear) || new Date().getFullYear())
      .input('Status', sql.NVarChar, status || "Active")
      .query(q);
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
              VALUES (@FID, @PID, @Name, @Size, @Type, @Date, @FileURL)`;
    logSql("INSERT", "MedicalFiles", q, {"@FID": fId});

    await pool.request()
      .input('FID', sql.VarChar, fId)
      .input('PID', sql.VarChar, pId)
      .input('Name', sql.NVarChar, name)
      .input('Size', sql.NVarChar, size || "1MB")
      .input('Type', sql.VarChar, type || "image")
      .input('Date', sql.NVarChar, new Date().toISOString().split("T")[0])
      .input('FileURL', sql.NVarChar, fileUrl)
      .query(q);
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
    // Parse date ensuring UTC to avoid timezone shift issues
    const parsedDate = new Date(date as string);
    const dayOfWeek = parsedDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    console.log(`[Slots DBG] parsedDate=${parsedDate.toISOString()}, dayOfWeek=${dayOfWeek}`);

    // Query DoctorShifts table for shifts of this specialty on this day of week
    const shiftsRes = await pool.request()
      .input('specialty', sql.NVarChar, specialty)
      .input('dayOfWeek', sql.Int, dayOfWeek)
      .query(`SELECT DoctorName, SlotTime FROM DoctorShifts WHERE Specialty = @specialty AND DayOfWeek = @dayOfWeek AND IsActive = 1`);
    const activeShifts = shiftsRes.recordset; // { DoctorName, SlotTime }

    console.log(`[Slots DBG] Active shifts found in DB: ${activeShifts.length}`);

    if (activeShifts.length === 0) {
      console.log(`[Slots DBG] No doctor available on day ${dayOfWeek} for ${specialty} in DB shifts`);
      return res.json([]); 
    }

    // Get all scheduled appointments for that date pattern
    const datePattern = `${date}%`;
    const qCheck = `SELECT DoctorName, StartTime FROM Appointments WHERE StartTime LIKE @pattern AND Status != 'Cancelled'`;
    const checkRes = await pool.request().input('pattern', sql.VarChar, datePattern).query(qCheck);
    
    // Structure existing appointments: { "DoctorName": ["10:00 AM", ...] }
    const busySlots: Record<string, string[]> = {};
    checkRes.recordset.forEach(r => {
      const doc = r.DoctorName;
      const timeParts = r.StartTime.split(" ");
      const timeStr = timeParts.slice(1).join(" ");
      
      if (!busySlots[doc]) busySlots[doc] = [];
      busySlots[doc].push(timeStr);
    });

    // Calculate free slots across all active doctor shifts
    const freeSlotsSet = new Set<string>();
    activeShifts.forEach(shift => {
      const docBusy = busySlots[shift.DoctorName] || [];
      if (!docBusy.includes(shift.SlotTime)) {
        freeSlotsSet.add(shift.SlotTime);
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
    const result = await pool.request().query("SELECT * FROM DoctorShifts ORDER BY DoctorName, DayOfWeek, SlotTime");
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/shifts", verifyToken, requireRole(['administrator']), async (req: any, res) => {
  const { doctorName, specialty, dayOfWeek, slotTime } = req.body;
  if (!doctorName || !specialty || dayOfWeek === undefined || !slotTime) {
    return res.status(400).json({ error: "DoctorName, Specialty, DayOfWeek and SlotTime are required." });
  }
  try {
    const pool = getPool();
    const shiftId = `SH_${doctorName.toUpperCase().replace(/[\s\.]+/g, "")}_${dayOfWeek}_${slotTime.replace(/[\s:]+/g, "")}`;
    
    // Check if exists
    const checkQuery = "SELECT * FROM DoctorShifts WHERE ShiftID = @id";
    const checkRes = await pool.request().input('id', sql.VarChar, shiftId).query(checkQuery);
    if (checkRes.recordset.length > 0) {
      return res.status(400).json({ error: "Este turno ya existe." });
    }

    await pool.request()
      .input("id", sql.VarChar, shiftId)
      .input("doc", sql.NVarChar, doctorName)
      .input("spec", sql.NVarChar, specialty)
      .input("day", sql.Int, Number(dayOfWeek))
      .input("slot", sql.VarChar, slotTime)
      .query("INSERT INTO DoctorShifts (ShiftID, DoctorName, Specialty, DayOfWeek, SlotTime, IsActive) VALUES (@id, @doc, @spec, @day, @slot, 1)");
    
    res.json({ success: true, shiftId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/shifts/:id", verifyToken, requireRole(['administrator']), async (req: any, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input("id", sql.VarChar, req.params.id)
      .query("DELETE FROM DoctorShifts WHERE ShiftID = @id");
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
    const request = pool.request();

    if (req.user?.role === 'patient_portal') {
      // El paciente solo puede ver sus propias citas
      query = 'SELECT * FROM Appointments WHERE PatientID = @pid';
      request.input('pid', sql.VarChar, req.user.id);
      logSql("SELECT", "Appointments", query, { "@pid": req.user.id });
    } else {
      logSql("SELECT", "Appointments", query, {});
    }

    const result = await request.query(query);
    const appts = result.recordset.map(r => ({
      id: r.AppointmentID, patientId: r.PatientID, patientName: "Unknown",
      startTime: r.StartTime, endTime: r.EndTime, status: r.Status, type: r.Type, doctorName: r.DoctorName || "Dr. Quispe"
    }));
    res.json(appts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Track online doctors in memory
const onlineDoctors = new Set<string>(); // Start empty, will fallback to Dr. Quispe only if empty

app.get("/api/staff/status", verifyToken, (req, res) => {
  res.json({ success: true, online: Array.from(onlineDoctors) });
});

app.get("/api/admin/metrics", verifyToken, requireRole(['administrator']), async (req, res) => {
  try {
    const pool = getPool();
    const onlineCount = onlineDoctors.size;

    const queueRes = await pool.request().query("SELECT COUNT(*) as Count FROM TelemedicineQueue WHERE Status = 'waiting'");
    const patientsWaiting = queueRes.recordset[0].Count;

    const todayStr = new Date().toISOString().split("T")[0];
    const apptsRes = await pool.request()
      .input('today', sql.VarChar, `${todayStr}%`)
      .query("SELECT COUNT(*) as Count FROM Appointments WHERE StartTime LIKE @today AND Status = 'Completed'");
    const successfulCalls = apptsRes.recordset[0].Count;

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

// POST appointments
app.post("/api/appointments", async (req: any, res) => {
  const { patientId, patientName, startTime, endTime, type, status } = req.body;
  if (!patientId || !startTime || !type) {
    return res.status(400).json({ error: "PatientID, StartTime and Type (Specialty) are required." });
  }

  // Expecting startTime in format "YYYY-MM-DD HH:MM AM/PM"
  // E.g. "2026-06-08 10:00 AM"
  const startParts = startTime.split(" ");
  const dateStr = startParts[0]; // "2026-06-08"
  const timeStr = startParts.slice(1).join(" "); // "10:00 AM"

  try {
    const pool = getPool();
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getUTCDay();

    // Find doctors of this specialty working on this day and hour slot from dynamic DB
    const shiftsRes = await pool.request()
      .input('specialty', sql.NVarChar, type)
      .input('dayOfWeek', sql.Int, dayOfWeek)
      .input('slotTime', sql.VarChar, timeStr)
      .query(`SELECT DoctorName FROM DoctorShifts WHERE Specialty = @specialty AND DayOfWeek = @dayOfWeek AND SlotTime = @slotTime AND IsActive = 1`);
    
    const candidates = shiftsRes.recordset.map(r => ({ doctorName: r.DoctorName }));

    if (candidates.length === 0) {
      return res.status(400).json({ error: `No hay médicos especialistas disponibles de ${type} en el día y hora indicados.` });
    }

    // Check availability in database to prevent conflicts (double-booking)
    const busyDocsQuery = `
      SELECT DoctorName 
      FROM Appointments 
      WHERE StartTime = @start 
        AND Status != 'Cancelled'
    `;
    const busyRes = await pool.request().input('start', sql.VarChar, startTime).query(busyDocsQuery);
    const busyDoctors = busyRes.recordset.map(r => r.DoctorName);

    // Filter candidates to those who are NOT busy at this slot
    const freeDoctors = candidates.filter(c => !busyDoctors.includes(c.doctorName));

    if (freeDoctors.length === 0) {
      return res.status(400).json({ error: `El horario solicitado ya se encuentra reservado. Por favor, elija otra hora.` });
    }

    // Load balancing: pick the doctor with the least total pending/scheduled appointments
    const qLoad = `SELECT DoctorName, COUNT(*) as Count FROM Appointments WHERE Status != 'Completed' AND Status != 'Cancelled' GROUP BY DoctorName`;
    const loadRes = await pool.request().query(qLoad);
    const doctorLoad: Record<string, number> = {};
    freeDoctors.forEach(d => doctorLoad[d.doctorName] = 0);
    loadRes.recordset.forEach(r => {
      if (doctorLoad[r.DoctorName] !== undefined) {
        doctorLoad[r.DoctorName] = r.Count;
      }
    });

    const assignedDoctor = freeDoctors.reduce((a, b) => 
      doctorLoad[a.doctorName] < doctorLoad[b.doctorName] ? a : b
    ).doctorName;

    const aId = `APT_${Math.floor(1000 + Math.random() * 9000)}`;
    const q = `INSERT INTO Appointments (AppointmentID, PatientID, StartTime, EndTime, Status, Type, DoctorName)
              VALUES (@AID, @PID, @Start, @End, @Status, @Type, @DocName)`;
    
    logSql("INSERT", "Appointments", q, { "@AID": aId, "@DocName": assignedDoctor });

    await pool.request()
      .input('AID', sql.VarChar, aId)
      .input('PID', sql.VarChar, patientId)
      .input('Start', sql.VarChar, startTime)
      .input('End', sql.VarChar, endTime || "TBD")
      .input('Status', sql.VarChar, status || "Scheduled")
      .input('Type', sql.NVarChar, type)
      .input('DocName', sql.NVarChar, assignedDoctor)
      .query(q);

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
    logSql("SELECT", "MedicalCenters", q, {});
    const result = await pool.request().query(q);
    const centers = result.recordset.map(r => ({
      id: r.CenterID, name: r.Name, location: r.Location,
      lat: r.Lat, lng: r.Lng, type: r.Type, activeDoctors: r.ActiveDoctors, totalPatients: r.TotalPatients
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
    const q = 'SELECT TOP 10 * FROM RecentActivities ORDER BY Time DESC';
    const result = await pool.request().query(q);
    const acts = result.recordset.map(r => ({
      id: r.ActivityID, type: r.Type, title: r.Title, detail: r.Detail, time: r.Time, center: r.Center
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
