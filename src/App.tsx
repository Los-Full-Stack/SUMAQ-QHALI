import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { api } from "./services/api";

import BannerLanding from "./components/BannerLanding";
import DoctorDashboard from "./components/DoctorDashboard";
import PatientClinicalRecord from "./components/PatientClinicalRecord";
import AdministratorPanel from "./components/AdministratorPanel";
import PatientPortal from "./components/PatientPortal";
import RegisterModal from "./components/RegisterModal";
import FeedbackCenter from "./components/FeedbackCenter";

import { Patient, Appointment, RecentActivity, Language } from "./types";

export default function App() {
  const { isLoggedIn, role, setLogin, setPortalPatient } = useAuthStore();
  const [language, setLanguage] = useState<Language>("es");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);

  // On mount: if patient_portal, load patient profile
  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (isLoggedIn && role === "patient_portal" && user?.id) {
      api.getPatientById(user.id).then(data => {
        if (data) {
          setPortalPatient(data);
        } else {
          // Token is invalid/expired or patient was deleted, logout to clear corrupt state
          useAuthStore.getState().setLogout();
        }
      }).catch(() => {
        useAuthStore.getState().setLogout();
      });
    }
  }, [isLoggedIn, role, setPortalPatient]);

  const fetchAllData = async () => {
    try {
      const pts = await api.getPatients();
      setPatients(pts);
      const appts = await api.getAppointments();
      setAppointments(appts);
      const acts = await api.getRecentActivities();
      setRecentActivities(acts);
    } catch (e) {
      console.error("Fetch warning:", e);
    }
  };

  useEffect(() => {
    if (isLoggedIn && role !== 'patient_portal') {
      fetchAllData();
    }
  }, [isLoggedIn, role]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 overflow-x-hidden selection:bg-teal-500 selection:text-white">
        <BannerLanding 
          language={language}
          onSetLanguage={setLanguage}
          onLogin={async (user, token) => {
            // setLogin now handles localStorage persistence internally
            setLogin(user, token);
            if (user.role === "patient_portal" && user.id) {
              const data = await api.getPatientById(user.id);
              if (data) setPortalPatient(data);
            }
          }}
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 selection:bg-teal-500 selection:text-white overflow-hidden">
        <main className="flex-1 flex flex-col bg-slate-50 relative overflow-y-auto overflow-x-hidden">
          <Routes>
              <Route path="/" element={<Navigate to={`/${role === 'patient_portal' ? 'patient' : role === 'administrator' ? 'admin' : 'doctor'}`} replace />} />
              
              <Route path="/doctor" element={
                role === "patient_portal" ? <Navigate to="/patient" replace /> :
                activePatientId ? (
                  <PatientClinicalRecord 
                    language={language}
                    patientId={activePatientId}
                    onBack={() => setActivePatientId(null)}
                    onRefreshPatients={fetchAllData}
                  />
                ) : (
                  <DoctorDashboard 
                    language={language}
                    patients={patients}
                    appointments={appointments}
                    recentActivities={recentActivities}
                    onSelectPatient={setActivePatientId}
                    onSetTab={() => {}}
                    onOpenRegisterModal={() => setIsRegModalOpen(true)}
                    onLogout={() => {}}
                    onSetLanguage={setLanguage}
                    onRefresh={fetchAllData}
                  />
                )
              } />

              <Route path="/admin" element={
                role === "administrator" ? <AdministratorPanel language={language} recentActivities={recentActivities} onSetLanguage={setLanguage} /> : <Navigate to="/" replace />
              } />

              <Route path="/patient" element={
                (role === "patient_portal" || role === "administrator") ? <PatientPortal language={language} onSetLanguage={setLanguage} /> : <Navigate to="/" replace />
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {isRegModalOpen && (
          <RegisterModal 
            language={language}
            onClose={() => setIsRegModalOpen(false)} 
            onSuccess={() => { setIsRegModalOpen(false); fetchAllData(); }} 
          />
        )}
        <FeedbackCenter language={language} />
      </div>
    </BrowserRouter>
  );
}
