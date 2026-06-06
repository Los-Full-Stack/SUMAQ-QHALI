import os
import re

SERVER_TS = "server.ts"

with open(SERVER_TS, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
imports = """import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";"""
content = content.replace('import express from "express";', imports)

# Add JWT_SECRET
jwt_secret = """
const JWT_SECRET = process.env.JWT_SECRET || "sumaq_qhali_secret_key";
"""
content = content.replace("const PORT = 3000;", f"const PORT = 3000;{jwt_secret}")

# Update Register
register_orig = """    const q1 = `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender, Password)
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
      .input('Password', sql.NVarChar, password)
      .query(q1);

    res.json({ success: true, user: { id: newId, name, dni, role: 'patient_portal' } });"""

register_new = """    const hashedPassword = await bcrypt.hash(password, 10);
    const q1 = `INSERT INTO Patients (PatientID, MedicalHistoryNumber, FullName, Status, Age, DNI, BloodType, Location, Email, Phone, Gender, Password)
              VALUES (@PatientID, @HistNum, @FullName, @Status, @Age, @DNI, @BloodType, @Location, @Email, @Phone, @Gender, @Password)`;
    
    await pool.request()
      .input('PatientID', sql.VarChar, newId)
      .input('HistNum', sql.VarChar, histNum)
      .input('FullName', sql.NVarChar, name)
      .input('Status', sql.VarChar, 'Active')
      .input('Age', sql.Int, 30)
      .input('DNI', sql.VarChar, dni)
      .input('BloodType', sql.VarChar, 'O+')
      .input('Location', sql.NVarChar, location || 'Cusco')
      .input('Email', sql.VarChar, '')
      .input('Phone', sql.VarChar, phone || '')
      .input('Gender', sql.VarChar, 'Desconocido')
      .input('Password', sql.NVarChar, hashedPassword)
      .query(q1);

    const token = jwt.sign({ id: newId, dni, role: 'patient_portal' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { id: newId, name, dni, role: 'patient_portal' } });"""

content = content.replace(register_orig, register_new)

# Update Login
login_orig = """    const q = "SELECT * FROM Patients WHERE DNI = @DNI AND Password = @Password";
    const result = await pool.request()
      .input('DNI', sql.VarChar, dni)
      .input('Password', sql.NVarChar, password)
      .query(q);

    if (result.recordset.length > 0) {
      const p = result.recordset[0];
      res.json({ success: true, user: { id: p.PatientID, name: p.FullName, dni: p.DNI, role: 'patient_portal' } });
    } else {
      res.status(401).json({ error: "DNI o contraseña incorrectos." });
    }"""

login_new = """    const q = "SELECT * FROM Patients WHERE DNI = @DNI";
    const result = await pool.request()
      .input('DNI', sql.VarChar, dni)
      .query(q);

    if (result.recordset.length > 0) {
      const p = result.recordset[0];
      const match = await bcrypt.compare(password, p.Password || "");
      if (match || password === p.Password) { // fallback for plain text if any
        const token = jwt.sign({ id: p.PatientID, dni: p.DNI, role: 'patient_portal' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, user: { id: p.PatientID, name: p.FullName, dni: p.DNI, role: 'patient_portal' } });
      } else {
        res.status(401).json({ error: "DNI o contraseña incorrectos." });
      }
    } else {
      res.status(401).json({ error: "DNI o contraseña incorrectos." });
    }"""

content = content.replace(login_orig, login_new)

with open(SERVER_TS, "w", encoding="utf-8") as f:
    f.write(content)

print("server.ts updated for bcrypt and jwt")
