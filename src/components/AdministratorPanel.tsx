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
    { name: "Cusco Rural (Paucartambo)", patients: 5, color: "text-emerald-500", bg: "bg-emerald-500" },
    { name: "Apurímac (Andahuaylas)", patients: 3, color: "text-teal-500", bg: "bg-teal-500" },
    { name: "Puno (Juliaca Afueras)", patients: 2, color: "text-sky-500", bg: "bg-sky-500" }
  ];

  const [activeTab, setActiveTab] = useState<"dashboard" | "schedules">("dashboard");
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

  // Form states
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Quispe");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Consulta General");
  const [selectedDay, setSelectedDay] = useState(1); // 1 = Lunes
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Filter states
  const [doctorFilter, setDoctorFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  const availableTimeSlots = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
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
      for (const slot of selectedSlots) {
        try {
          await api.addShift({
            doctorName: selectedDoctor,
            specialty: selectedSpecialty,
            dayOfWeek: selectedDay,
            slotTime: slot
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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-sans w-full relative min-h-screen">
      {/* Premium Background Banner */}
      <div className="absolute top-0 left-0 right-0 h-[220px] bg-gradient-to-br from-[#064E3B] via-[#0F766E] to-[#0F172A] z-0 overflow-hidden rounded-b-[2.5rem] shadow-lg transition-all duration-500">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-emerald-400 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 px-4 lg:px-10 pt-4 pb-6 z-10 relative">
        
        {/* Floating Top Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-1">
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white font-headline tracking-tight drop-shadow-sm flex items-center gap-3">
              <Activity className="text-emerald-400 w-6 h-6" />
              Sumaq Qhali Command Center
            </h2>
            <p className="text-teal-100/90 font-medium mt-1 text-xs md:text-sm">
              Monitoreo en Tiempo Real de la Red de Telemedicina Rural
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onSetLanguage && onSetLanguage(language === "es" ? "qu" : "es")}
              className="bg-teal-700/50 hover:bg-teal-600 text-white border border-teal-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap"
            >
              <Globe2 className="w-3.5 h-3.5" />
              {language === "es" ? "Runasimi (QU)" : "Español (ES)"}
            </button>
            <button 
              onClick={() => {
                useAuthStore.getState().setLogout();
                window.location.reload();
              }}
              className="bg-rose-500/20 hover:bg-rose-500 text-white border border-rose-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              {language === "es" ? "Salir" : "Lluqsiy"}
            </button>
          </div>
        </div>

        {/* Header Controls (Legacy) */}
        <div className="flex justify-end items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              SISTEMA ONLINE
            </span>
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Exportar Logs
            </button>
          </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/60 gap-4 mb-2 z-10 relative">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 hover:text-white cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Command Center
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 hover:text-white cursor-pointer ${
              activeTab === 'schedules'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400'
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
              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Stethoscope className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Doctores Disponibles</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">{metrics.doctorsOnline}</h4>
              </div>
              
              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/30">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Pacientes en Cola Virtual</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">{metrics.patientsWaiting}</h4>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Tiempo de Espera Promedio</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">{metrics.avgWaitTime}</h4>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Video className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30">
                  <Video className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Teleconsultas Hoy</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">{metrics.successfulCalls}</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Regions Map */}
              <section className="lg:col-span-2 bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl min-h-[500px] flex flex-col">
                <h3 className="text-lg font-bold font-headline text-white mb-6 flex items-center gap-2">
                  <Globe2 className="text-slate-400" />
                  Demanda de Telemedicina por Región
                </h3>
                
                <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-700/50 p-6 relative flex items-center justify-center">
                  {/* Abstract Map Visualization */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-slate-900 to-slate-900"></div>
                  
                  <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {activeRegions.map((region, idx) => (
                      <div key={idx} className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                        <div className={`w-16 h-16 rounded-full ${region.bg}/20 flex items-center justify-center mb-4 relative`}>
                          <div className={`absolute inset-0 ${region.bg} opacity-20 rounded-full animate-ping`}></div>
                          <MapPin className={`w-8 h-8 ${region.color}`} />
                        </div>
                        <h4 className="font-bold text-white mb-1">{region.name}</h4>
                        <p className="text-3xl font-black font-headline text-slate-300 my-2">{region.patients}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pacientes Conectados</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Connection Logs */}
              <section className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl flex flex-col">
                <h3 className="text-lg font-bold font-headline text-white mb-6 flex items-center gap-2">
                  <Wifi className="text-slate-400" />
                  Logs de Conectividad Rural
                </h3>
                
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 beautiful-scrollbar">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex gap-4 items-start">
                    <div className="mt-1 bg-emerald-500/20 p-1.5 rounded-lg text-emerald-500">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">Llamada iniciada exitosamente</p>
                      <p className="text-xs text-slate-400 mt-0.5">Dr. Rojas conectado con Paciente #142 (Apurímac)</p>
                      <p className="text-[10px] text-slate-500 mt-2 font-mono">Hace 2 min</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex gap-4 items-start">
                    <div className="mt-1 bg-rose-500/20 p-1.5 rounded-lg text-rose-500">
                      <WifiOff className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-400">Caída de conexión (Latencia Alta)</p>
                      <p className="text-xs text-slate-400 mt-0.5">La conexión en Puno Rural cayó por debajo de 50kbps. Intentando reconexión Jitsi...</p>
                      <p className="text-[10px] text-slate-500 mt-2 font-mono">Hace 5 min</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex gap-4 items-start">
                    <div className="mt-1 bg-sky-500/20 p-1.5 rounded-lg text-sky-500">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">Nuevo paciente en cola</p>
                      <p className="text-xs text-slate-400 mt-0.5">Ingreso desde terminal satelital (Cusco Rural).</p>
                      <p className="text-[10px] text-slate-500 mt-2 font-mono">Hace 12 min</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex gap-4 items-start opacity-70">
                    <div className="mt-1 bg-slate-700 p-1.5 rounded-lg text-slate-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300">Balanceo de carga activado</p>
                      <p className="text-xs text-slate-500 mt-0.5">Re-enrutando pacientes en cola al servidor Jitsi secundario.</p>
                      <p className="text-[10px] text-slate-600 mt-2 font-mono">Hace 1 hora</p>
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
              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Total Bloques Horarios</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">{shifts.length}</h4>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Stethoscope className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center mb-4 border border-teal-500/30">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Médicos Configurados</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">
                  {new Set(shifts.map(s => s.DoctorName)).size}
                </h4>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Layers className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Especialidades Cubiertas</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">
                  {new Set(shifts.map(s => s.Specialty)).size}
                </h4>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Turnos Habilitados</p>
                <h4 className="text-4xl font-black font-headline text-white mt-1">
                  {shifts.filter(s => s.IsActive).length}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Registration Form (Col 1) */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-bold font-headline text-white mb-6 flex items-center gap-2">
                  <Plus className="text-emerald-400" />
                  Asignar Nuevo Turno
                </h3>
                <form onSubmit={handleAddShifts} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Médico</label>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => handleDoctorChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm font-medium text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option>Dr. Quispe</option>
                      <option>Dra. Rojas</option>
                      <option>Dr. Condori</option>
                      <option>Enf. Huamán</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Especialidad</label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm font-medium text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option>Consulta General</option>
                      <option>Pediatría</option>
                      <option>Ginecología</option>
                      <option>Control de Presión</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Día de Trabajo</label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm font-medium text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value={1}>Lunes</option>
                      <option value={2}>Martes</option>
                      <option value={3}>Miércoles</option>
                      <option value={4}>Jueves</option>
                      <option value={5}>Viernes</option>
                      <option value={6}>Sábado</option>
                      <option value={0}>Domingo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bloques de Horarios</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableTimeSlots.map((slot) => {
                        const isSelected = selectedSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(slot)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-inner"
                                : "bg-slate-900 text-slate-400 border-slate-700/60 hover:bg-slate-750"
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
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-3 transition-all shadow-lg shadow-teal-500/10 hover:shadow-teal-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmittingShift ? "Registrando..." : "Registrar Turnos"}
                  </button>
                </form>
              </div>

              {/* Shift Listing Table (Col 2 & 3) */}
              <div className="lg:col-span-2 bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl flex flex-col min-h-[500px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                    <ClipboardList className="text-slate-400" />
                    Listado de Horarios en Activo
                  </h3>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={doctorFilter}
                        onChange={(e) => setDoctorFilter(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="">Todos los Médicos</option>
                        <option>Dr. Quispe</option>
                        <option>Dra. Rojas</option>
                        <option>Dr. Condori</option>
                        <option>Enf. Huamán</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={specialtyFilter}
                        onChange={(e) => setSpecialtyFilter(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
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
                      <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-400 text-sm font-semibold">Cargando turnos de base de datos...</p>
                    </div>
                  ) : filteredShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-700 rounded-2xl bg-slate-900/40">
                      <Calendar className="w-12 h-12 text-slate-600 mb-4" />
                      <p className="text-slate-400 text-sm font-semibold">No se encontraron turnos configurados.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">Médico</th>
                          <th className="py-3 px-4">Especialidad</th>
                          <th className="py-3 px-4">Día</th>
                          <th className="py-3 px-4">Hora</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {filteredShifts.map((shift, i) => {
                          let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          if (shift.Specialty === "Pediatría") badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                          else if (shift.Specialty === "Ginecología") badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                          else if (shift.Specialty === "Control de Presión") badgeColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";

                          return (
                            <tr key={i} className="hover:bg-slate-750/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                                <Stethoscope className="w-4 h-4 text-emerald-400" />
                                {shift.DoctorName}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                                  {shift.Specialty}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-300">
                                {daysMap[shift.DayOfWeek]}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-200">
                                {shift.SlotTime}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteShift(shift.ShiftID)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline flex items-center gap-1.5 ml-auto cursor-pointer"
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
