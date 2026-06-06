import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        console.log("Connected.");
        await sql.query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Password' AND Object_ID = Object_ID(N'Patients'))
            BEGIN
                ALTER TABLE Patients ADD Password NVARCHAR(255) NULL;
                PRINT 'Added Password column'
            END
        `);
        console.log("Success.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
