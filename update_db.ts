import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const hasValidUrl = process.env.DATABASE_URL && 
                     !process.env.DATABASE_URL.includes("[TU_CONTRASEÑA]") && 
                     !process.env.DATABASE_URL.includes("YOUR_SUPABASE") && 
                     !process.env.DATABASE_URL.includes("[PASSWORD]") && 
                     process.env.DATABASE_URL.startsWith("postgresql://");

const pool = hasValidUrl
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new pg.Pool({
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      host: process.env.DB_SERVER || "localhost",
      database: process.env.DB_NAME || "postgres",
      port: Number(process.env.DB_PORT) || 5432,
      ssl: (process.env.DB_SERVER && process.env.DB_SERVER !== "localhost") ? { rejectUnauthorized: false } : false
    });


async function run() {
    try {
        console.log("Connecting to PostgreSQL/Supabase...");
        await pool.query("SELECT 1");
        console.log("Connected.");
        
        // Add Password column if it does not exist
        await pool.query("ALTER TABLE Patients ADD COLUMN IF NOT EXISTS Password VARCHAR(255)");
        console.log("Success: Patients schema verified.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
