import React, { useState, useEffect } from "react";
import { RecentActivity, Language } from "../types";
import { 
  BarChart, 
  Map, 
  Download, 
  Users, 
  Heart, 
  Calendar, 
  Layers, 
  Activity,
  Building2,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Video,
  Clock,
  Wifi,
  WifiOff,
  Globe2,
  MapPin,
  Plus,
  Trash2,
  Filter
} from "lucide-react";

import { useAuthStore } from "../store/useAuthStore";
import { LogOut } from "lucide-react";
import { api } from "../services/api";

interface AdminProps {
  language: Language;
  recentActivities: RecentActivity[];
  onSetLanguage?: (lang: Language) => void;
}

export default function AdministratorPanel({ language, recentActivities, onSetLanguage }: AdminProps) {
  const [metrics, setMetrics] = useState({
    doctorsOnline: 1,
    patientsWaiting: 0,
    avgWaitTime: "0m 0s",
    successfulCalls: 14
  });

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch("/api/admin/metrics", {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error("Error fetching metrics:", e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeRegions = [
    { name: "Cusco Rural (Paucartambo)", patients: 5, color: "text-blue-500", bg: "bg-blue-500" },
    { name: "Apurímac (Andahuaylas)", patients: 3, color: "text-cyan-500", bg: "bg-cyan-500" },
    { name: "Puno (Juliaca Afueras)", patients: 2, color: "text-sky-500", bg: "bg-sky-500" }
  ];

  const [activeTab, setActiveTab] = useState<"dashboard" | "schedules">("dashboard");
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);
  // Form states
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Quispe");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Consulta General");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Filter states
  const [doctorFilter, setDoctorFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const availableTimeSlots = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  const daysMap: Record<number, string> = {
    0: "Domingo",
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado"
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [doctorFilter, specialtyFilter]);

  const getNextDateForDay = (dayOfWeek: number): string => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    let targetDay = dayOfWeek;
    
    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    const day = targetDate.getDate();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const month = monthNames[targetDate.getMonth()];
    const year = targetDate.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${day} ${monthNames[monthIdx] || ""} ${year}`;
  };

  const fetchShifts = async () => {
    setIsLoadingShifts(true);
    try {
      const data = await api.getShifts();
      setShifts(data);
    } catch (e) {
      console.error("Error fetching shifts:", e);
    } finally {
      setIsLoadingShifts(false);
    }
  };

  useEffect(() => {
    if (activeTab === "schedules") {
      fetchShifts();
    }
  }, [activeTab]);

  const handleDoctorChange = (doc: string) => {
    setSelectedDoctor(doc);
    if (doc === "Dr. Quispe") setSelectedSpecialty("Consulta General");
    else if (doc === "Dra. Rojas") setSelectedSpecialty("Pediatría");
    else if (doc === "Dr. Condori") setSelectedSpecialty("Ginecología");
    else if (doc === "Enf. Huamán") setSelectedSpecialty("Control de Presión");
  };

  const handleToggleSlot = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleAddShifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) {
      alert("Por favor seleccione al menos un horario.");
      return;
    }

    setIsSubmittingShift(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const computedDay = new Date(selectedDate + 'T00:00:00').getDay();

      for (const slot of selectedSlots) {
        try {
          await api.addShift({
            doctorName: selectedDoctor,
            specialty: selectedSpecialty,
            dayOfWeek: computedDay,
            slotTime: slot,
            shiftDate: selectedDate
          });
          successCount++;
        } catch (err: any) {
          console.error(`Error adding shift ${slot}:`, err.message);
          failCount++;
        }
      }

      if (failCount > 0) {
        alert(`Se registraron ${successCount} turnos. ${failCount} turnos fallaron (posiblemente ya existían).`);
      } else {
        alert("¡Todos los turnos se registraron con éxito!");
      }

      setSelectedSlots([]);
      fetchShifts();
    } catch (e: any) {
      console.error(e);
      alert("Error al registrar los turnos.");
    } finally {
      setIsSubmittingShift(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este turno?")) return;
    try {
      await api.deleteShift(shiftId);
      alert("Turno eliminado con éxito.");
      fetchShifts();
    } catch (err: any) {
      console.error(err);
      alert("Error al eliminar el turno: " + err.message);
    }
  };

  const filteredShifts = shifts.filter(s => {
    const matchesDoc = doctorFilter ? s.DoctorName === doctorFilter : true;
    const matchesSpec = specialtyFilter ? s.Specialty === specialtyFilter : true;
    return matchesDoc && matchesSpec;
  });

  const SHIFTS_PER_PAGE = 8;
  const totalPages = Math.ceil(filteredShifts.length / SHIFTS_PER_PAGE);
  const startIndex = (currentPage - 1) * SHIFTS_PER_PAGE;
  const paginatedShifts = filteredShifts.slice(startIndex, startIndex + SHIFTS_PER_PAGE);

  return (
    <div className="flex-1 overflow-y-auto beautiful-scrollbar bg-slate-50 text-slate-800 font-sans w-full relative min-h-screen">
      {/* Premium Background Banner */}
      <div className="absolute top-0 left-0 right-0 h-[220px] bg-gradient-to-br from-[#00355F] via-[#026783] to-[#0F172A] z-0 overflow-hidden rounded-b-[2.5rem] shadow-lg transition-all duration-500">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-400 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 px-4 lg:px-10 pt-4 pb-6 z-10 relative">
        
        {/* Floating Top Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-1">
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white font-headline tracking-tight drop-shadow-sm flex items-center gap-3">
              <Activity className="text-blue-400 w-6 h-6" />
              Sumaq Qhali Command Center
            </h2>
            <p className="text-cyan-100/90 font-medium mt-1 text-xs md:text-sm">
              Monitoreo en Tiempo Real de la Red de Telemedicina Rural
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onSetLanguage && onSetLanguage(language === "es" ? "qu" : "es")}
              className="bg-cyan-700/50 hover:bg-cyan-600 text-white border border-cyan-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-cyan-300" />
              {language === "es" ? "Runasimi (QU)" : "Español (ES)"}
            </button>
            <button 
              onClick={() => {
                useAuthStore.getState().setLogout();
                window.location.reload();
              }}
              className="bg-rose-500/20 hover:bg-rose-500 text-white border border-rose-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              {language === "es" ? "Salir" : "Lluqsiy"}
            </button>
          </div>
        </div>

        {/* Header Controls (Legacy) */}
        <div className="flex justify-end items-center gap-4">
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4 text-blue-400" /> Exportar Logs
            </button>
          </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/60 gap-4 mb-2 z-10 relative">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-white font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Command Center
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'schedules'
                ? 'border-blue-500 text-white font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Gestión de Horarios
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Stethoscope className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Doctores Disponibles</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">{metrics.doctorsOnline}</h4>
              </div>
              
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 border border-orange-100">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Pacientes en Cola Virtual</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">{metrics.patientsWaiting}</h4>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Tiempo de Espera Promedio</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">{metrics.avgWaitTime}</h4>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Video className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 border border-purple-100">
                  <Video className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Teleconsultas Hoy</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">{metrics.successfulCalls}</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Regions Map */}
              <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-md min-h-[500px] flex flex-col">
                <h3 className="text-lg font-bold font-headline text-slate-800 mb-6 flex items-center gap-2">
                  <Globe2 className="text-slate-500" />
                  Demanda de Telemedicina por Región
                </h3>
                
                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200/50 p-6 relative flex items-center justify-center">
                  {/* Abstract Map Visualization */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-50"></div>
                  
                  <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {activeRegions.map((region, idx) => (
                      <div key={idx} className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                        <div className={`w-16 h-16 rounded-full ${region.bg}/20 flex items-center justify-center mb-4 relative`}>
                          <div className={`absolute inset-0 ${region.bg} opacity-20 rounded-full animate-ping`}></div>
                          <MapPin className={`w-8 h-8 ${region.color}`} />
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{region.name}</h4>
                        <p className="text-3xl font-black font-headline text-slate-700 my-2">{region.patients}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pacientes Conectados</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Connection Logs */}
              <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md flex flex-col">
                <h3 className="text-lg font-bold font-headline text-slate-800 mb-6 flex items-center gap-2">
                  <Wifi className="text-slate-500" />
                  Logs de Conectividad Rural
                </h3>
                
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 beautiful-scrollbar">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4 items-start">
                    <div className="mt-1 bg-blue-50 p-1.5 rounded-lg text-blue-600 border border-blue-100">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Llamada iniciada exitosamente</p>
                      <p className="text-xs text-slate-600 mt-0.5">Dr. Rojas conectado con Paciente #142 (Apurímac)</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">Hace 2 min</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4 items-start">
                    <div className="mt-1 bg-rose-50 p-1.5 rounded-lg text-rose-600 border border-rose-100">
                      <WifiOff className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-600">Caída de conexión (Latencia Alta)</p>
                      <p className="text-xs text-slate-600 mt-0.5">La conexión en Puno Rural cayó por debajo de 50kbps. Intentando reconexión Jitsi...</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">Hace 5 min</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4 items-start">
                    <div className="mt-1 bg-sky-50 p-1.5 rounded-lg text-sky-600 border border-sky-100">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nuevo paciente en cola</p>
                      <p className="text-xs text-slate-600 mt-0.5">Ingreso desde terminal satelital (Cusco Rural).</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">Hace 12 min</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4 items-start opacity-70">
                    <div className="mt-1 bg-slate-200 p-1.5 rounded-lg text-slate-600">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Balanceo de carga activado</p>
                      <p className="text-xs text-slate-500 mt-0.5">Re-enrutando pacientes en cola al servidor Jitsi secundario.</p>
                      <p className="text-[10px] text-slate-450 mt-2 font-mono">Hace 1 hora</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {activeTab === "schedules" && (
          <div className="flex flex-col gap-8 animate-fade-in z-10 relative">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Total Bloques Horarios</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">{shifts.length}</h4>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Stethoscope className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-4 border border-cyan-100">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Médicos Configurados</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">
                  {new Set(shifts.map(s => s.DoctorName)).size}
                </h4>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Layers className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 border border-purple-100">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Especialidades Cubiertas</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">
                  {new Set(shifts.map(s => s.Specialty)).size}
                </h4>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-32 h-32 text-slate-400" />
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">Turnos Habilitados</p>
                <h4 className="text-4xl font-black font-headline text-slate-800 mt-1">
                  {shifts.filter(s => s.IsActive).length}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Registration Form (Col 1) */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md relative overflow-hidden">
                <h3 className="text-lg font-bold font-headline text-slate-800 mb-6 flex items-center gap-2">
                  <Plus className="text-blue-600" />
                  Asignar Nuevo Turno
                </h3>
                <form onSubmit={handleAddShifts} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Médico</label>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => handleDoctorChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                    >
                      <option>Dr. Quispe</option>
                      <option>Dra. Rojas</option>
                      <option>Dr. Condori</option>
                      <option>Enf. Huamán</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidad</label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                    >
                      <option>Consulta General</option>
                      <option>Pediatría</option>
                      <option>Ginecología</option>
                      <option>Control de Presión</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha y Día de Trabajo</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 font-medium">
                      Día de la semana: <span className="font-bold text-blue-600">
                        {daysMap[new Date(selectedDate + 'T00:00:00').getDay()]}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Bloques de Horarios</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableTimeSlots.map((slot) => {
                        const isSelected = selectedSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(slot)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 text-blue-600 border-blue-200 shadow-inner"
                                : "bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingShift}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-3 transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmittingShift ? "Registrando..." : "Registrar Turnos"}
                  </button>
                </form>
              </div>

              {/* Shift Listing Table (Col 2 & 3) */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-md flex flex-col min-h-[500px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold font-headline text-slate-800 flex items-center gap-2">
                    <ClipboardList className="text-slate-500" />
                    Listado de Horarios en Activo
                  </h3>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <Filter className="w-3.5 h-3.5 text-slate-450" />
                      <select
                        value={doctorFilter}
                        onChange={(e) => setDoctorFilter(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-650 focus:outline-none cursor-pointer"
                      >
                        <option value="">Todos los Médicos</option>
                        <option>Dr. Quispe</option>
                        <option>Dra. Rojas</option>
                        <option>Dr. Condori</option>
                        <option>Enf. Huamán</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <Filter className="w-3.5 h-3.5 text-slate-455" />
                      <select
                        value={specialtyFilter}
                        onChange={(e) => setSpecialtyFilter(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-650 focus:outline-none cursor-pointer"
                      >
                        <option value="">Todas las Especialidades</option>
                        <option>Consulta General</option>
                        <option>Pediatría</option>
                        <option>Ginecología</option>
                        <option>Control de Presión</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-grow overflow-x-auto beautiful-scrollbar">
                  {isLoadingShifts ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-550 text-sm font-semibold">Cargando turnos de base de datos...</p>
                    </div>
                  ) : filteredShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                      <Calendar className="w-12 h-12 text-slate-400 mb-4" />
                      <p className="text-slate-500 text-sm font-semibold">No se encontraron turnos configurados.</p>
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Médico</th>
                            <th className="py-3 px-4">Especialidad</th>
                            <th className="py-3 px-4">Día / Fecha</th>
                            <th className="py-3 px-4">Hora</th>
                            <th className="py-3 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedShifts.map((shift, i) => {
                            let badgeColor = "bg-blue-50 text-blue-600 border-blue-100";
                            if (shift.Specialty === "Pediatría") badgeColor = "bg-purple-50 text-purple-600 border-purple-100";
                            else if (shift.Specialty === "Ginecología") badgeColor = "bg-blue-50 text-blue-600 border-blue-100";
                            else if (shift.Specialty === "Control de Presión") badgeColor = "bg-orange-50 text-orange-600 border-orange-100";

                            return (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                                  <Stethoscope className="w-4 h-4 text-blue-500" />
                                  {shift.DoctorName}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                                    {shift.Specialty}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-600">
                                  {daysMap[shift.DayOfWeek]} ({shift.ShiftDate ? formatDate(shift.ShiftDate) : getNextDateForDay(shift.DayOfWeek)})
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-700">
                                  {shift.SlotTime}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShift(shift.ShiftID)}
                                    className="text-xs font-bold text-rose-600 hover:text-rose-500 hover:underline flex items-center gap-1.5 ml-auto cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4 bg-slate-50/40 rounded-b-2xl mt-4">
                        <div className="text-xs text-slate-500">
                          Mostrando <span className="font-bold text-slate-700">{filteredShifts.length > 0 ? startIndex + 1 : 0}</span> a{" "}
                          <span className="font-bold text-slate-700">
                            {Math.min(startIndex + SHIFTS_PER_PAGE, filteredShifts.length)}
                          </span>{" "}
                          de <span className="font-bold text-slate-700">{filteredShifts.length}</span> turnos
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Anterior
                          </button>
                          <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                            {currentPage} / {totalPages || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
