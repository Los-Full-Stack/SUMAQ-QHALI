import React, { useState, useEffect } from "react";
import { Patient, Appointment, RecentActivity, Language } from "../types";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Users, AlertCircle, Video, Calendar, Search, ChevronLeft, ChevronRight, Clock, FolderLock, FileSpreadsheet, Package, Activity, Plus, Hospital, LogOut, HelpCircle, TrendingUp, Award, MapPin, Globe, Signal, Trash2, Pill
} from "lucide-react";
import JitsiCall from "./JitsiCall";
import PatientClinicalRecord from "./PatientClinicalRecord";
import { api } from "../services/api";

const translateApptType = (type: string, lang: "es" | "qu") => {
  if (!type) return lang === "es" ? "Consulta General" : "Hampiy Rimana";
  const lower = type.toLowerCase();
  if (lower.includes("routine")) {
    return lang === "es" ? "Chequeo de Rutina" : "Kutipaq Qhaway";
  }
  if (lower.includes("follow-up") || lower.includes("control")) {
    return lang === "es" ? "Control / Seguimiento" : "Qatiqnin Qhaway";
  }
  if (lower.includes("pediatric") || lower.includes("pediatria")) {
    return lang === "es" ? "Consulta Pediátrica" : "Wawa Hampiy";
  }
  if (lower.includes("gynaecology") || lower.includes("gynecology") || lower.includes("ginecologia")) {
    return lang === "es" ? "Ginecología" : "Warmikunap Hampiy";
  }
  if (lower.includes("pressure") || lower.includes("presion")) {
    return lang === "es" ? "Control de Presión" : "Ñit'iy Qhaway";
  }
  if (lower.includes("obstetricia")) {
    return lang === "es" ? "Obstetricia" : "Sullu Qhaway";
  }
  return type;
};

interface DashboardProps {
  language: Language;
  patients: Patient[];
  appointments: Appointment[];
  recentActivities: RecentActivity[];
  onSelectPatient: (pId: string) => void;
  onSetTab: (tab: string) => void;
  onOpenRegisterModal: () => void;
  onLogout: () => void;
  onSetLanguage: (lang: Language) => void;
  onRefresh?: () => void;
}

export default function DoctorDashboard({
  language,
  patients,
  appointments,
  recentActivities,
  onSelectPatient,
  onOpenRegisterModal,
  onLogout,
  onSetLanguage,
  onRefresh
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const user = useAuthStore((state) => state.user);
  const setIsCallActive = useAuthStore((state) => state.setIsCallActive);
  const setLogout = useAuthStore((state) => state.setLogout);
  
  // Telemedicine state
  const [isTelemedicineActive, setIsTelemedicineActive] = useState(false);
  const [activeCallPatientId, setActiveCallPatientId] = useState<string | null>(null);
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);
  const [showFullRecord, setShowFullRecord] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"video" | "record">("video");

  // Quick Record state
  const [quickNotes, setQuickNotes] = useState("");
  const [quickPrescriptions, setQuickPrescriptions] = useState<Array<{ name: string; dosage: string; duration: string }>>([
    { name: "", dosage: "", duration: "" }
  ]);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [medicinesCatalog, setMedicinesCatalog] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [focusedPrescIdx, setFocusedPrescIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const token = localStorage.getItem("sumaq_token");
        const res = await fetch("/api/medicines", {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMedicinesCatalog(data);
        }
      } catch (err) {
        console.error("Error loading medicines catalog:", err);
      }
    };
    fetchMedicines();
  }, []);

  const [queuePatients, setQueuePatients] = useState<any[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<"telemed" | "patients">("telemed");
  
  // Doctor monthly agenda states
  const [agendaViewMode, setAgendaViewMode] = useState<"day" | "month">("day");
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(new Date());
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  useEffect(() => {
    let interval: any;
    if (isTelemedicineActive) {
      // Poll queue every 3 seconds and sync all dashboard data (like appointments)
      interval = setInterval(async () => {
        try {
          const res = await api.getQueue();
          setQueuePatients(res);
          setQueueError(null);
          if (onRefresh) {
            onRefresh();
          }
        } catch (e: any) {
          console.error(e);
          setQueueError(e.message || "Error cargando la cola");
        }
      }, 3000);
    } else {
      setQueuePatients([]);
      setQueueError(null);
    }
    return () => clearInterval(interval);
  }, [isTelemedicineActive, onRefresh]);

  const handleStartCall = async (pId: string) => {
    try {
      await api.acceptQueue(pId, user?.name || 'Dr. Yawar Quispe');
      setActiveCallPatientId(pId);
      const safeId = pId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      setActiveCallRoom(`sqsala${safeId}`);
      setIsCallActive(true);
    } catch (e) {
      console.error(e);
      alert("Error aceptando la llamada.");
    }
  };

  const handleStartAppointmentCall = (pId: string, apptId: string) => {
    setActiveCallPatientId(pId);
    const safeId = apptId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    setActiveCallRoom(`sqsalaappt${safeId}`);
    setIsCallActive(true);
  };

  const handleEndCall = () => {
    setActiveCallRoom(null);
    setActiveCallPatientId(null);
    setQuickNotes("");
    setQuickPrescriptions([{ name: "", dosage: "", duration: "" }]);
    setShowFullRecord(false);
    setIsCallActive(false);
  };

  const handleSaveQuickRecord = async () => {
    if (!activeCallPatientId) return;
    
    setIsSavingRecord(true);
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch(`/api/patients/${activeCallPatientId}/consultations`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cie10Code: "Z00.0",
          diagnosisTitle: "Consulta por Telemedicina",
          notes: quickNotes,
          prescriptions: quickPrescriptions
            .filter(p => p.name.trim() !== "")
            .map(p => ({
              name: p.name.trim(),
              dosage: p.dosage.trim() || "Según indicaciones",
              duration: p.duration.trim() || "Variable"
            }))
        })
      });
      
      if (res.ok) {
        alert("¡Expediente guardado exitosamente!");
        try {
          await api.leaveQueue(activeCallPatientId);
        } catch (e) {
          console.error("Failed to remove patient from queue", e);
        }
        handleEndCall(); // Cuelga la llamada y limpia el formulario
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el expediente en el servidor: ${errorData.error || res.statusText}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error de red al intentar guardar el expediente: ${e.message}`);
    } finally {
      setIsSavingRecord(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.medicalHistoryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.dni.includes(searchTerm)
  );

  const activeDoc = user?.name || "Dr. Yawar Quispe";
  const doctorAppointments = appointments.filter(a => 
    a.doctorName?.toLowerCase() === activeDoc.toLowerCase()
  );

  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    return doctorAppointments.filter(a => a.startTime.startsWith(dateStr));
  };

  const prevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Fill days from the previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevTotalDays - i,
        monthOffset: -1,
        date: new Date(year, month - 1, prevTotalDays - i)
      });
    }

    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        monthOffset: 0,
        date: new Date(year, month, i)
      });
    }

    // Fill days from the next month to complete the 42-grid cell layout
    const totalGridCells = 42;
    const remainingCells = totalGridCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        monthOffset: 1,
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const monthsES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthsQU = ["Qulla puquy", "Hatun puquy", "Pauqar waray", "Ayriwa", "Aymuray", "Inti raymi", "Anta situwa", "Qhapaq situwa", "Uma raymi", "Kantaray", "Ayamarq'a", "Qhapaq raymi"];

  return (
    <div className="flex-1 overflow-y-auto beautiful-scrollbar bg-slate-50 font-sans w-full relative min-h-screen">
      {/* Premium Background Banner */}
      {!activeCallRoom && (
        <div className="absolute top-0 left-0 right-0 h-[220px] bg-gradient-to-br from-[#00355F] via-[#026783] to-[#0F172A] z-0 overflow-hidden rounded-b-[2.5rem] shadow-lg transition-all duration-500">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-400 opacity-10 rounded-full blur-3xl"></div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 px-4 lg:px-10 pt-4 pb-6 z-10 relative">
        
        {/* Floating Top Controls */}
        {!activeCallRoom && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-1">
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-headline tracking-tight drop-shadow-sm">
                {language === "es" ? `Buen día, ${user?.name || 'Dr. Yawar Quispe'}` : `Allillanchu t'uta, ${user?.name || 'Dr. Yawar Quispe'}`}
              </h2>
              <p className="text-cyan-100/90 font-medium mt-1 text-xs md:text-sm">
                Centro de Telemedicina y Triage Rural
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={onOpenRegisterModal}
                className="bg-blue-500 hover:bg-blue-400 text-white border border-blue-400/50 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
              <button 
                onClick={() => onSetLanguage(language === "es" ? "qu" : "es")}
                className="bg-cyan-700/50 hover:bg-cyan-600 text-white border border-cyan-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5" />
                {language === "es" ? "Runasimi (QU)" : "Español (ES)"}
              </button>
              <button 
                onClick={async () => {
                  if (user && user.name) {
                    try {
                      const token = localStorage.getItem("sumaq_token");
                      await fetch("/api/staff/status", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ name: user.name, status: "offline" })
                      });
                    } catch (e) {
                      console.error("Failed to notify offline status", e);
                    }
                  }
                  setLogout();
                  window.location.reload();
                }}
                className="bg-rose-500/20 hover:bg-rose-500 text-white border border-rose-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 flex items-center gap-2"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                {language === "es" ? "Salir" : "Lluqsiy"}
              </button>
            </div>
          </div>
        )}

        {/* Telemedicine Toggle Section */}
        <div className="flex flex-col md:flex-row justify-end items-center gap-4">

        </div>

        {activeCallRoom ? (
          /* SPLIT VIEW FOR ACTIVE CALL WITH MOBILE TABS */
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:h-[85vh]">
            
            {/* Mobile Tab Selector */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveMobileTab("video")}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                  activeMobileTab === "video"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Video className="w-4 h-4" /> Videollamada
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("record")}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                  activeMobileTab === "record"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <FolderLock className="w-4 h-4" /> Ficha & Receta
                </span>
              </button>
            </div>

            {/* Video Call Column */}
            <div className={`lg:col-span-2 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-[60vh] lg:h-full ${
              activeMobileTab === "video" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <span className="font-bold flex items-center gap-2"><Video className="text-blue-400 w-5 h-5"/> Videollamada en Curso</span>
              </div>
              <div className="flex-1 min-h-0">
                <JitsiCall roomName={activeCallRoom} displayName={user?.name || 'Dr. Yawar Quispe'} onEndCall={handleEndCall} />
              </div>
            </div>
            
            <div className={`flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[500px] lg:h-full ${
              activeMobileTab === "record" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                <span className="font-bold text-blue-800 flex items-center gap-2"><FolderLock className="w-5 h-5"/> Historial Clínico Rápido</span>
                <button onClick={() => setShowFullRecord(true)} className="text-xs bg-white border border-blue-200 px-3 py-1.5 rounded-lg text-blue-700 font-bold hover:bg-blue-100 shadow-sm transition-colors">
                  Ver Expediente Completo
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto beautiful-scrollbar font-sans text-sm">
                <p className="text-slate-500 mb-6 font-medium">Paciente ID: <span className="font-bold text-slate-700">{activeCallPatientId}</span></p>
                
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notas de la Consulta (Tiempo Real)</label>
                <textarea 
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[150px] mb-6 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner" 
                  placeholder="Escribe aquí los síntomas, diagnóstico..."
                ></textarea>
                
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Prescripción Médica (Medicamentos)
                  </label>
                  <span className="text-blue-600 text-[11px] font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5"/> Traducción IA Automática
                  </span>
                </div>

                <div className="space-y-3">
                  {quickPrescriptions.map((presc, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 relative group shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Nombre del medicamento (ej: Paracetamol 500mg)"
                            value={presc.name}
                            onFocus={() => setFocusedPrescIdx(idx)}
                            onBlur={() => setTimeout(() => setFocusedPrescIdx(null), 250)}
                            onChange={(e) => {
                              const newPrescs = [...quickPrescriptions];
                              newPrescs[idx].name = e.target.value;
                              setQuickPrescriptions(newPrescs);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          />
                          
                          {/* Sugerencias dropdown */}
                          {focusedPrescIdx === idx && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 text-xs py-1">
                              {medicinesCatalog.filter(med => 
                                med.name.toLowerCase().includes(presc.name.toLowerCase())
                              ).length === 0 ? (
                                <div className="px-3 py-2 text-slate-400 italic">
                                  No se encontraron coincidencias. Se guardará como texto libre.
                                </div>
                              ) : (
                                medicinesCatalog
                                  .filter(med => med.name.toLowerCase().includes(presc.name.toLowerCase()))
                                  .map((med) => (
                                    <button
                                      key={med.id}
                                      type="button"
                                      onMouseDown={() => {
                                        const newPrescs = [...quickPrescriptions];
                                        newPrescs[idx].name = med.name;
                                        setQuickPrescriptions(newPrescs);
                                        setFocusedPrescIdx(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-100 last:border-0"
                                    >
                                      <span className="font-medium text-slate-700">{med.name}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        med.category === "Tradicional" 
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                          : "bg-blue-50 text-blue-700 border border-blue-100"
                                      }`}>
                                        {med.category}
                                      </span>
                                    </button>
                                  ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pl-7">
                        <input
                          type="text"
                          placeholder="Dosis (ej: 1 tab cada 8h)"
                          value={presc.dosage}
                          onChange={(e) => {
                            const newPrescs = [...quickPrescriptions];
                            newPrescs[idx].dosage = e.target.value;
                            setQuickPrescriptions(newPrescs);
                          }}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <input
                          type="text"
                          placeholder="Duración (ej: 7 días)"
                          value={presc.duration}
                          onChange={(e) => {
                            const newPrescs = [...quickPrescriptions];
                            newPrescs[idx].duration = e.target.value;
                            setQuickPrescriptions(newPrescs);
                          }}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>

                      {quickPrescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPrescs = quickPrescriptions.filter((_, i) => i !== idx);
                            setQuickPrescriptions(newPrescs);
                          }}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          title="Eliminar medicamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setQuickPrescriptions([...quickPrescriptions, { name: "", dosage: "", duration: "" }])}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 px-4 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 rounded-xl text-xs font-bold text-slate-500 bg-white hover:bg-blue-50/20 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4"/> Agregar Medicamento
                </button>
                
                <button 
                  onClick={handleSaveQuickRecord}
                  disabled={isSavingRecord}
                  className="w-full mt-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {isSavingRecord ? "Guardando..." : "Guardar en Expediente y Finalizar"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* QUEUE AND DASHBOARD VIEW */
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Patients in Queue */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Cola de Triage</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-2 font-headline">{queuePatients.length}</h3>
                  </div>
                  <div className={`p-3 rounded-2xl ${isTelemedicineActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center`}>
                    <Users className={`w-6 h-6 ${isTelemedicineActive && queuePatients.length > 0 ? 'animate-bounce' : ''}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${isTelemedicineActive ? 'bg-blue-500 animate-ping' : 'bg-slate-400'}`}></span>
                  <span className="font-semibold text-slate-500">
                    {isTelemedicineActive ? 'Canal de telemedicina activo' : 'Canal desconectado'}
                  </span>
                </div>
              </div>

              {/* Card 2: Consultations completed today */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-colors"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atendidos Hoy</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-2 font-headline">
                      {doctorAppointments.filter(a => a.status === 'Completed').length}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  <span className="font-semibold text-slate-500">Actualizado hace unos instantes</span>
                </div>
              </div>

              {/* Card 3: Avg Consultation Time */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-colors"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiempo Promedio</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-2 font-headline">14 min</h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 text-xs font-semibold text-slate-400">
                  Meta del centro de salud: <span className="text-sky-600 font-bold">12 min</span>
                </div>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Agenda de Citas */}
              <section className="lg:col-span-7 xl:col-span-8 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <h3 className="text-base md:text-lg font-bold font-headline">
                        {language === "es" ? "Agenda y Control de Citas" : "Citas Allichay"}
                      </h3>
                      <p className="text-[11px] text-cyan-100/80 font-medium">
                        {agendaViewMode === "day" 
                          ? (language === "es" ? "Visualización de citas para hoy" : "Kunan p'unchay citas qhaway")
                          : (language === "es" ? "Calendario de citas mensual" : "Killa citas allichay")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onRefresh && (
                      <button 
                        onClick={onRefresh}
                        className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 shadow-sm backdrop-blur-sm transition-all flex items-center gap-1 cursor-pointer"
                        title="Sincronizar citas"
                      >
                        <span>↻ {language === "es" ? "Actualizar" : "Kallpachay"}</span>
                      </button>
                    )}
                    <div className="flex p-0.5 bg-white/10 rounded-lg border border-white/15">
                      <button
                        type="button"
                        onClick={() => setAgendaViewMode("day")}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                          agendaViewMode === "day"
                            ? "bg-white text-blue-800 shadow-sm"
                            : "text-white hover:bg-white/10"
                        }`}
                      >
                        {language === "es" ? "Día" : "P'unchay"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgendaViewMode("month")}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                          agendaViewMode === "month"
                            ? "bg-white text-blue-800 shadow-sm"
                            : "text-white hover:bg-white/10"
                        }`}
                      >
                        {language === "es" ? "Mes" : "Killa"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agenda Content */}
                <div className="p-6 flex-1 flex flex-col min-h-0 bg-slate-50/30">
                  {agendaViewMode === "day" ? (
                    // Day View: Grid of appointments
                    <div className="flex-1 flex flex-col min-h-0">
                      {(() => {
                        const activeAppointments = getAppointmentsForDate(new Date());

                        if (activeAppointments.length === 0) {
                          return (
                            <div className="flex-grow flex flex-col items-center justify-center text-center py-16 px-6">
                              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 border border-slate-200/50">
                                <Calendar className="w-8 h-8" />
                              </div>
                              <p className="text-base font-bold text-slate-700">
                                {language === "es" ? "Agenda libre hoy" : "Qasi kachkan kunan p'unchay"}
                              </p>
                              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                                {language === "es" 
                                  ? "No tienes consultas agendadas para el día de hoy." 
                                  : "Manan kapunchu citas kunan p'unchaypi allichasqa."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeAppointments.map((appt) => {
                              const patientObj = patients.find(p => p.id === appt.patientId);
                              const name = patientObj ? patientObj.name : (language === "es" ? "Paciente registrado" : "Qillqasqa Paciente");
                              const initial = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

                              let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                              let statusLabel = appt.status;
                              if (appt.status === "Completed") {
                                statusColor = "bg-blue-50 text-blue-700 border-blue-200";
                                statusLabel = language === "es" ? "Completado" : "Tukusqa";
                              } else if (appt.status === "Scheduled") {
                                statusColor = "bg-cyan-50 text-cyan-700 border-cyan-200";
                                statusLabel = language === "es" ? "Pendiente" : "Suyanaraq";
                              } else if (appt.status === "Cancelled") {
                                statusColor = "bg-rose-50 text-rose-700 border-rose-200";
                                statusLabel = language === "es" ? "Cancelado" : "Qullusqa";
                              } else if (appt.status === "Up Next") {
                                statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                                statusLabel = language === "es" ? "Siguiente" : "Qatiqnin";
                              } else if (appt.status === "waiting") {
                                statusColor = "bg-orange-50 text-orange-700 border-orange-200";
                                statusLabel = language === "es" ? "En espera" : "Suyasqa";
                              }

                              return (
                                <div 
                                  key={appt.id} 
                                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300/50 transition-all duration-200 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                      <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        {appt.startTime.split(" ").slice(1).join(" ")}
                                      </span>
                                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${statusColor}`}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                                        {patientObj?.avatarUrl ? (
                                          <img src={patientObj.avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                          <span>{initial}</span>
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-slate-800 text-sm font-headline tracking-tight">{name}</h5>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                          {translateApptType(appt.type, language)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {appt.status === "Scheduled" && (
                                    <div className="flex gap-2 w-full mt-2 pt-2 border-t border-slate-100">
                                      <button 
                                        onClick={() => handleStartAppointmentCall(appt.patientId, appt.id)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        {language === "es" ? "Teleconsulta" : "Karuhampiy"}
                                      </button>
                                      <button 
                                        onClick={() => onSelectPatient(appt.patientId)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-slate-200/60"
                                      >
                                        {language === "es" ? "Ver Ficha" : "Qillqata qhaway"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    // Month View: Split Monthly Calendar and appointments side-by-side
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
                      {/* Left side: Mini Calendar Date-Picker */}
                      <div className="md:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <button 
                            type="button" 
                            onClick={prevMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-600"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-black text-slate-700 font-headline uppercase tracking-wider">
                            {language === "es" 
                              ? `${monthsES[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`
                              : `${monthsQU[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`}
                          </span>
                          <button 
                            type="button" 
                            onClick={nextMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-600"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Días de la semana */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          <span>{language === "es" ? "Dom" : "Dom"}</span>
                          <span>{language === "es" ? "Lun" : "Lun"}</span>
                          <span>{language === "es" ? "Mar" : "Mar"}</span>
                          <span>{language === "es" ? "Mie" : "Mie"}</span>
                          <span>{language === "es" ? "Jue" : "Jue"}</span>
                          <span>{language === "es" ? "Vie" : "Vie"}</span>
                          <span>{language === "es" ? "Sab" : "Sab"}</span>
                        </div>

                        {/* Cuadrícula de días */}
                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendarDays().map((cell, idx) => {
                            const dateStr = formatDateString(cell.date);
                            const isSelected = formatDateString(selectedAgendaDate) === dateStr;
                            
                            const dayAppts = getAppointmentsForDate(cell.date);
                            const hasAppts = dayAppts.length > 0;
                            const isCurrentMonth = cell.monthOffset === 0;

                            let btnClasses = "h-8 w-8 text-[11px] rounded-lg flex flex-col items-center justify-center font-bold transition-all relative mx-auto ";
                            
                            if (isSelected) {
                              btnClasses += "bg-blue-600 text-white font-black shadow-md shadow-blue-500/20";
                            } else if (hasAppts) {
                              btnClasses += "bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white cursor-pointer";
                            } else {
                              btnClasses += "text-slate-600 hover:bg-slate-100 cursor-pointer";
                            }

                            if (!isCurrentMonth && !isSelected) {
                              btnClasses += " opacity-40";
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedAgendaDate(cell.date)}
                                className={btnClasses}
                              >
                                <span>{cell.day}</span>
                                {/* Puntito indicador de citas */}
                                {hasAppts && !isSelected && (
                                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right side: Appointments for Selected Date */}
                      <div className="md:col-span-7 flex flex-col min-h-0 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                        <div className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                          <span>
                            {language === "es" ? "Citas del" : "Citas kay p'unchaymanta"} {selectedAgendaDate.toLocaleDateString(language === "es" ? "es-ES" : "es-PE", { day: "numeric", month: "long" })}
                          </span>
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">
                            {getAppointmentsForDate(selectedAgendaDate).length} {language === "es" ? "Citas" : "Citas"}
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto beautiful-scrollbar max-h-[350px]">
                          {(() => {
                            const activeAppointments = getAppointmentsForDate(selectedAgendaDate);

                            if (activeAppointments.length === 0) {
                              return (
                                <div className="flex-grow flex flex-col items-center justify-center text-center py-12 px-6">
                                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                                    <Calendar className="w-6 h-6" />
                                  </div>
                                  <p className="text-xs font-bold text-slate-500">
                                    {language === "es" ? "Sin consultas programadas" : "Manan kapunchu citas"}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {language === "es" 
                                      ? "No hay citas registradas para esta fecha." 
                                      : "Manan allichasqa citas kachkankuchu kay punchaypaq."}
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="relative pl-4 border-l border-slate-100 flex flex-col gap-4 py-2">
                                {activeAppointments.map((appt) => {
                                  const patientObj = patients.find(p => p.id === appt.patientId);
                                  const name = patientObj ? patientObj.name : (language === "es" ? "Paciente registrado" : "Qillqasqa Paciente");
                                  
                                  let statusColor = "bg-slate-100 text-slate-700";
                                  let statusLabel = appt.status;
                                  if (appt.status === "Completed") {
                                    statusColor = "bg-blue-50 text-blue-700 border border-blue-100";
                                    statusLabel = language === "es" ? "Completado" : "Tukusqa";
                                  } else if (appt.status === "Scheduled") {
                                    statusColor = "bg-cyan-50 text-cyan-700 border border-cyan-100";
                                    statusLabel = language === "es" ? "Pendiente" : "Suyanaraq";
                                  } else if (appt.status === "Cancelled") {
                                    statusColor = "bg-rose-50 text-rose-700 border border-rose-100";
                                    statusLabel = language === "es" ? "Cancelado" : "Qullusqa";
                                  } else if (appt.status === "Up Next") {
                                    statusColor = "bg-amber-50 text-amber-700 border border-amber-100";
                                    statusLabel = language === "es" ? "Siguiente" : "Qatiqnin";
                                  } else if (appt.status === "waiting") {
                                    statusColor = "bg-orange-50 text-orange-700 border border-orange-100";
                                    statusLabel = language === "es" ? "En espera" : "Suyasqa";
                                  }

                                  return (
                                    <div key={appt.id} className="relative group">
                                      {/* Círculo del Timeline */}
                                      <div className={`absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all duration-300 ${
                                        appt.status === "Completed" ? "bg-blue-500 scale-110" : "bg-cyan-500"
                                      }`}></div>

                                      <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all duration-200">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                          <span className="text-xs font-bold text-slate-400 font-sans flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {appt.startTime.split(" ").slice(1).join(" ")}
                                          </span>
                                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusColor}`}>
                                            {statusLabel}
                                          </span>
                                        </div>
                                        <h5 className="font-bold text-slate-800 text-sm font-headline mb-1">{name}</h5>
                                        <p className="text-[11px] font-semibold text-slate-500 mb-3">{translateApptType(appt.type, language)}</p>

                                        {appt.status === "Scheduled" && (
                                          <div className="flex gap-2 w-full mt-2">
                                            <button 
                                              onClick={() => handleStartAppointmentCall(appt.patientId, appt.id)}
                                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                                            >
                                              <Video className="w-3.5 h-3.5" /> {language === "es" ? "Teleconsulta" : "Karuhampiy"}
                                            </button>
                                            <button 
                                              onClick={() => onSelectPatient(appt.patientId)}
                                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center cursor-pointer whitespace-nowrap"
                                              title="Ver Ficha Clínica"
                                            >
                                              {language === "es" ? "Ver Ficha" : "Qillqata qhaway"}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Right Column: Sidebar Multifuncional */}
              <section className="lg:col-span-5 xl:col-span-4 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
                {/* Encabezado de Pestañas Moderno */}
                <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
                  <button 
                    onClick={() => setActiveSideTab("telemed")}
                    className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeSideTab === "telemed" 
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50" 
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Video className="w-4 h-4" /> 
                    {language === "es" ? "Teleconsulta" : "Karuhampiy"}
                    {isTelemedicineActive && queuePatients.length > 0 && (
                      <span className="bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.5 animate-pulse font-black">
                        {queuePatients.length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveSideTab("patients")}
                    className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeSideTab === "patients" 
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50" 
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Users className="w-4 h-4" /> 
                    {language === "es" ? "Buscar Paciente" : "Pacientes maskay"}
                  </button>
                </div>

                {/* Contenido de la Pestaña: Telemedicina / Cola en Vivo */}
                {activeSideTab === "telemed" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Toggle status indicator directly in the tab for easy control */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {language === "es" ? "Estado del Canal" : "Kallpaypa kanan"}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isTelemedicineActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {isTelemedicineActive ? (language === "es" ? "ACTIVO" : "HAP'ISQA") : (language === "es" ? "OCUPADO" : "P'ATASQA")}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setIsTelemedicineActive(!isTelemedicineActive)}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 border ${
                          isTelemedicineActive 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500/30'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isTelemedicineActive ? 'bg-white animate-ping' : 'bg-slate-400'}`}></div>
                        {isTelemedicineActive 
                          ? (language === "es" ? "Disponible para Teleconsulta" : "Citaspaq allichasqa")
                          : (language === "es" ? "Ponerse Disponible" : "Allichakuy kunan")}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 beautiful-scrollbar max-h-[380px]">
                      {queueError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-[11px] font-semibold text-rose-600 font-sans">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Error: {queueError}</span>
                        </div>
                      )}
                      {!isTelemedicineActive ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
                          <Video className="w-10 h-10 text-slate-300 mb-3" />
                          <p className="text-xs font-bold text-slate-600">
                            {language === "es" ? "Canal Cerrado" : "Wichq'asqa Hampina"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                            {language === "es" 
                              ? "Cambia tu estado a 'Disponible' en el selector superior para recibir llamadas." 
                              : "Kallpaykita 'Kichasqa' churay karuhampiy chaskinapaq."}
                          </p>
                        </div>
                      ) : queuePatients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3 animate-pulse">
                            <Search className="w-5 h-5 text-blue-400" />
                          </div>
                          <p className="text-xs font-bold text-slate-600">
                            {language === "es" ? "Sala de espera vacía" : "Ch'usaq chaskina sala"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {language === "es" ? "No hay llamadas en cola." : "Manan waqyakuna kanchu suyaypi."}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {queuePatients.map((p, i) => (
                            <div 
                              key={p.patientId} 
                              className="p-3.5 border border-blue-100 bg-gradient-to-r from-blue-50/30 to-white rounded-xl flex flex-col gap-3 hover:shadow-md transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-extrabold text-xs shadow-inner">
                                  #{i+1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" /> 
                                    {p.location || (language === "es" ? 'Zona Rural' : 'Ayllu')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> 
                                  {language === "es" ? `Espera: ${Math.floor((Date.now() - p.timestamp) / 60000)} min` : `Suyay: ${Math.floor((Date.now() - p.timestamp) / 60000)} min`}
                                </span>
                                <button 
                                  onClick={() => handleStartCall(p.patientId)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-3.5 py-1.5 rounded-lg font-bold shadow-[0_2px_8px_rgba(5,150,105,0.2)] transition-all flex items-center gap-1.5"
                                >
                                  <Video className="w-3 h-3"/> {language === "es" ? "Atender" : "Atendey"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contenido de la Pestaña: Base de Datos de Pacientes */}
                {activeSideTab === "patients" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 bg-white border-b border-slate-100">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={language === "es" ? "Buscar por DNI o Nombre..." : "DNI, sutinta maskay..."}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 beautiful-scrollbar max-h-[380px]">
                      {filteredPatients.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-sans">
                          {language === "es" ? `No se encontraron pacientes para "${searchTerm}"` : `Manan tarikuñchu "${searchTerm}"`}
                        </div>
                      ) : (
                        filteredPatients.map((p) => {
                          const nameParts = p.name.split(" ");
                          const initials = nameParts.map(n => n[0]).join("").substring(0, 2).toUpperCase();
                          
                          return (
                            <div 
                              key={p.id}
                              onClick={() => onSelectPatient(p.id)}
                              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {p.avatarUrl ? (
                                  <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  <span>{initials}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate font-headline">{p.name}</p>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">ID: {p.medicalHistoryNumber} • DNI: {p.dni}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Botón de Registro de Pacientes en la base */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-center flex justify-between items-center mt-auto">
                  <button 
                    onClick={onOpenRegisterModal}
                    className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors hover:underline cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {language === "es" ? "Registrar Nuevo Paciente" : "Mosoq pacienteta qillqay"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Full Clinical Record during call */}
      {showFullRecord && activeCallPatientId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 md:p-8 animate-fade-in">
          <div className="bg-white w-full h-full max-w-[1600px] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
            <PatientClinicalRecord 
              language={language}
              patientId={activeCallPatientId}
              onBack={() => setShowFullRecord(false)}
              onRefreshPatients={() => {}} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
