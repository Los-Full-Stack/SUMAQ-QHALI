import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: { rejectUnauthorized: false }
};

const pool = new pg.Pool(config);

(async () => {
  try {
    console.log("1. Checking connection...");
    await pool.query("SELECT 1");
    console.log("Connection OK.");

    // Let's get one patient ID to test with
    console.log("2. Querying Patients...");
    const pRes = await pool.query("SELECT * FROM Patients LIMIT 1");
    if (pRes.rows.length === 0) {
      console.log("No patients found in DB!");
      return;
    }
    const patient = pRes.rows[0];
    const pId = patient.PatientID ?? patient.patientid;
    console.log(`Found patient: ${patient.FullName ?? patient.fullname} (ID: ${pId})`);

    // Let's test the queries one by one
    console.log("\n3. Testing Allergies query...");
    try {
      const algRes = await pool.query('SELECT * FROM Allergies WHERE PatientID = $1', [pId]);
      console.log(`Allergies query OK: ${algRes.rows.length} rows`);
    } catch (e: any) {
      console.error("ALLERGIES QUERY FAILED:", e.message);
    }

    console.log("\n4. Testing ChronicConditions query...");
    try {
      const chrRes = await pool.query('SELECT * FROM ChronicConditions WHERE PatientID = $1', [pId]);
      console.log(`ChronicConditions query OK: ${chrRes.rows.length} rows`);
    } catch (e: any) {
      console.error("CHRONIC CONDITIONS QUERY FAILED:", e.message);
    }

    console.log("\n5. Testing Consultations query...");
    let consultations: any[] = [];
    try {
      const conRes = await pool.query('SELECT * FROM Consultations WHERE PatientID = $1 ORDER BY Date DESC', [pId]);
      console.log(`Consultations query OK: ${conRes.rows.length} rows`);
      consultations = conRes.rows;
    } catch (e: any) {
      console.error("CONSULTATIONS QUERY FAILED:", e.message);
    }

    console.log("\n6. Testing Prescriptions query...");
    try {
      if (consultations.length > 0) {
        const cId = consultations[0].ConsultationID ?? consultations[0].consultationid;
        const presRes = await pool.query('SELECT * FROM Prescriptions WHERE ConsultationID = $1', [cId]);
        console.log(`Prescriptions query OK: ${presRes.rows.length} rows`);
      } else {
        const presRes = await pool.query('SELECT * FROM Prescriptions LIMIT 1');
        console.log(`Prescriptions structure test OK (table exists): ${presRes.rows.length} rows`);
      }
    } catch (e: any) {
      console.error("PRESCRIPTIONS QUERY FAILED:", e.message);
    }

    console.log("\n7. Testing MedicalFiles query...");
    try {
      const fileRes = await pool.query('SELECT * FROM MedicalFiles WHERE PatientID = $1', [pId]);
      console.log(`MedicalFiles query OK: ${fileRes.rows.length} rows`);
    } catch (e: any) {
      console.error("MEDICAL FILES QUERY FAILED:", e.message);
    }

  } catch (err: any) {
    console.error("GENERAL FAILURE:", err);
  } finally {
    await pool.end();
  }
})();
