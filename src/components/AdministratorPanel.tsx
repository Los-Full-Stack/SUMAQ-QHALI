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
  Filter,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square
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

  const [activeTab, setActiveTab] = useState<"schedules" | "agent">("schedules");
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoadingReportDetail, setIsLoadingReportDetail] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // AI Agent frontend interactive states
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const [activeRecTopicIdx, setActiveRecTopicIdx] = useState(0);
  const [completedActions, setCompletedActions] = useState<{[reportId: string]: boolean[]}>({});
  const [isQuechuaCollapsed, setIsQuechuaCollapsed] = useState(false);

  useEffect(() => {
    setIsAnalysisExpanded(false);
    setActiveRecTopicIdx(0);
    setIsQuechuaCollapsed(false);
  }, [selectedReportId]);

  const fetchReportsList = async (selectFirst = false) => {
    setIsLoadingReports(true);
    setReportError(null);
    try {
      const list = await api.getAgentReports();
      setReportsList(list);
      if (list.length > 0 && (selectFirst || !selectedReportId)) {
        setSelectedReportId(list[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || "Error al cargar la lista de reportes.");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchReportDetail = async (id: string) => {
    setIsLoadingReportDetail(true);
    setReportError(null);
    try {
      const report = await api.getAgentReportById(id);
      setSelectedReport(report);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || "Error al cargar el detalle del reporte.");
    } finally {
      setIsLoadingReportDetail(false);
    }
  };

  const triggerNewReport = async () => {
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const res = await api.triggerAgentReport();
      if (res && res.success) {
        await fetchReportsList(true);
      } else {
        throw new Error("Respuesta inválida");
      }
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || "Error al solicitar la generación del reporte.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);
  // Form states
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Yawar Quispe");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Medicina General");
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
    } else if (activeTab === "agent") {
      fetchReportsList();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedReportId) {
      fetchReportDetail(selectedReportId);
    } else {
      setSelectedReport(null);
    }
  }, [selectedReportId]);

  const handleDoctorChange = (doc: string) => {
    setSelectedDoctor(doc);
    if (doc === "Dr. Yawar Quispe") setSelectedSpecialty("Medicina General");
    else if (doc === "Dra. Killa Choque") setSelectedSpecialty("Pediatría");
    else if (doc === "Dra. Suyana Condori") setSelectedSpecialty("Obstetricia");
    else if (doc === "Dr. Inti Huaman") setSelectedSpecialty("Medicina Tradicional");
    else if (doc === "Enf. Sayri Rimachi") setSelectedSpecialty("Control de Presión");
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
              {language === "es" ? "Centro de Control Sumaq Qhali" : "Sumaq Qhali Kamachina Wasi"}
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
          <button
            onClick={() => setActiveTab('agent')}
            className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'agent'
                ? 'border-blue-500 text-white font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            Agente Autónomo IA
          </button>
        </div>



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
                      <option>Dr. Yawar Quispe</option>
                      <option>Dra. Killa Choque</option>
                      <option>Dra. Suyana Condori</option>
                      <option>Dr. Inti Huaman</option>
                      <option>Enf. Sayri Rimachi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidad</label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                    >
                      <option>Medicina General</option>
                      <option>Pediatría</option>
                      <option>Obstetricia</option>
                      <option>Medicina Tradicional</option>
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
                        <option>Dr. Yawar Quispe</option>
                        <option>Dra. Killa Choque</option>
                        <option>Dra. Suyana Condori</option>
                        <option>Dr. Inti Huaman</option>
                        <option>Enf. Sayri Rimachi</option>
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
                        <option>Medicina General</option>
                        <option>Pediatría</option>
                        <option>Obstetricia</option>
                        <option>Medicina Tradicional</option>
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

        {activeTab === 'agent' && (
          <div className="flex flex-col gap-6 animate-fade-in z-10 relative">
            
            {/* Header del Agente */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
              <div className="z-10">
                <h3 className="text-xl font-bold font-headline text-white flex items-center gap-2">
                  <Sparkles className="text-cyan-400 animate-pulse w-5 h-5" />
                  Agente Epidemiológico y Clínico Autónomo IA
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl font-medium">
                  Este módulo opera de forma 100% autónoma en el servidor de SUMAQ QHALI. Recopila periódicamente el estado clínico de la población y redacta resúmenes sanitarios interculturales organizando los datos de la base de datos sin intervención manual.
                </p>
              </div>
              <button
                type="button"
                onClick={triggerNewReport}
                disabled={isGeneratingReport}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25 flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer self-start md:self-auto shrink-0 z-10"
              >
                <Bot className="w-5 h-5" />
                {isGeneratingReport ? "Generando Reporte..." : "Forzar Análisis Semanal"}
              </button>
            </div>

            {reportError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 relative z-10 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Error del Agente</h4>
                  <p className="mt-0.5">{reportError}</p>
                </div>
              </div>
            )}

            {/* Layout de Historial + Detalle */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Columna Izquierda: Historial de Reportes Semanales */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-md flex flex-col gap-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Historial de Reportes
                </h4>

                {isLoadingReports ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2" />
                    <span className="text-[10px] text-slate-400 font-bold">Cargando historial...</span>
                  </div>
                ) : reportsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No hay reportes autónomos en el historial.</p>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1 beautiful-scrollbar">
                    {reportsList.map((rep) => {
                      const isSelected = selectedReportId === rep.id;
                      return (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => setSelectedReportId(rep.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-300 shadow-sm"
                              : "bg-slate-50/50 hover:bg-slate-50 border-slate-100"
                          }`}
                        >
                          <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                            {rep.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(rep.date).toLocaleDateString()} - {new Date(rep.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Detalle Estructurado y Visual del Reporte Seleccionado */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                
                {isLoadingReportDetail || isGeneratingReport ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-md flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <p className="text-slate-600 font-bold text-sm animate-pulse">
                      {isGeneratingReport ? "El agente está recolectando datos y procesando con Gemini..." : "Obteniendo reporte estructurado..."}
                    </p>
                  </div>
                ) : !selectedReport ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-md flex flex-col items-center justify-center text-center min-h-[300px]">
                    <Bot className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="font-bold text-slate-700">Selecciona un reporte</h4>
                    <p className="text-xs text-slate-500 mt-1">Elige un reporte de la lista de la izquierda para ver su análisis.</p>
                  </div>
                ) : (
                  <>
                    {/* Tarjetas KPI del Reporte */}
                    {selectedReport.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md relative overflow-hidden group">
                          <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users className="w-20 h-20 text-slate-400" />
                          </div>
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 border border-blue-100">
                            <Users className="w-5 h-5" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pacientes Analizados</p>
                          <h4 className="text-2xl font-black font-headline text-slate-800 mt-0.5">{selectedReport.summary.totalPatients}</h4>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md relative overflow-hidden group">
                          <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Calendar className="w-20 h-20 text-slate-400" />
                          </div>
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 border border-emerald-100">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Citas Totales</p>
                          <h4 className="text-2xl font-black font-headline text-slate-800 mt-0.5">{selectedReport.summary.totalAppointments}</h4>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md relative overflow-hidden group">
                          <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Video className="w-20 h-20 text-slate-400" />
                          </div>
                          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-3 border border-orange-100">
                            <Video className="w-5 h-5" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cola de Telemedicina</p>
                          <h4 className="text-2xl font-black font-headline text-slate-800 mt-0.5">{selectedReport.summary.telemedicineQueueCount}</h4>
                        </div>
                      </div>
                    )}

                    {/* Visual Dashboard Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                      {/* Background decoration */}
                      <div className="absolute right-0 bottom-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute left-0 top-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                      
                      {/* Title */}
                      <div className="col-span-12 border-b border-slate-700/40 pb-3 mb-1">
                        <h5 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                          Dashboard de Control Epidemiológico y Capacidad (Red Andina)
                        </h5>
                      </div>

                      {/* 1. Risk Gauge Column (col-span-4) */}
                      <div className="col-span-12 md:col-span-4 flex flex-col items-center justify-center text-center bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Índice de Riesgo Epidemiológico</span>
                        
                        {(() => {
                          const highAlertCount = selectedReport.content.alertas?.filter((a: any) => a.nivel === 'alto').length || 0;
                          const mediumAlertCount = selectedReport.content.alertas?.filter((a: any) => a.nivel === 'medio').length || 0;
                          const queueCount = selectedReport.summary?.telemedicineQueueCount || 0;
                          
                          const riskScore = Math.min(100, Math.max(15, (highAlertCount * 30) + (mediumAlertCount * 12) + (queueCount * 6)));
                          
                          // Circular progress variables
                          const radius = 38;
                          const circ = 2 * Math.PI * radius; // 238.76
                          const strokeDashoffset = circ - (riskScore / 100) * circ;
                          
                          let riskText = "Bajo";
                          let riskColor = "text-emerald-400";
                          if (riskScore > 75) {
                            riskText = "Crítico";
                            riskColor = "text-rose-500";
                          } else if (riskScore > 50) {
                            riskText = "Alto";
                            riskColor = "text-orange-400";
                          } else if (riskScore > 25) {
                            riskText = "Moderado";
                            riskColor = "text-yellow-400";
                          }

                          return (
                            <div className="flex flex-col items-center relative">
                              <div className="relative w-36 h-36 flex items-center justify-center">
                                {/* SVG Ring */}
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="72" cy="72" r={radius} stroke="#1e293b" strokeWidth="6" fill="transparent" />
                                  <circle 
                                    cx="72" 
                                    cy="72" 
                                    r={radius} 
                                    stroke="url(#riskGradientGauge)" 
                                    strokeWidth="8" 
                                    fill="transparent" 
                                    strokeDasharray={circ} 
                                    strokeDashoffset={strokeDashoffset} 
                                    strokeLinecap="round" 
                                    className="transition-all duration-1000 ease-out"
                                  />
                                  <defs>
                                    <linearGradient id="riskGradientGauge" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#10b981" />
                                      <stop offset="60%" stopColor="#f59e0b" />
                                      <stop offset="100%" stopColor="#ef4444" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                
                                {/* Inner Text */}
                                <div className="absolute flex flex-col items-center justify-center">
                                  <span className="text-3xl font-black font-headline tracking-tighter text-white">{riskScore}%</span>
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${riskColor} mt-0.5`}>{riskText}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium mt-3 px-2">
                                Calculado según alertas activas y volumen de pacientes en espera.
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 2. Capacidades de Centros (col-span-8) */}
                      <div className="col-span-12 md:col-span-8 flex flex-col gap-4 bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacidad y Carga de Centros Clínicos</span>
                        
                        {(() => {
                          const queueCount = selectedReport.summary?.telemedicineQueueCount || 0;
                          
                          const cuscoCap = Math.min(100, 45 + (queueCount * 12));
                          const apurimacCap = Math.min(100, 30 + (queueCount * 8));
                          const punoCap = Math.min(100, 20 + (queueCount * 5));

                          const getCapColor = (cap: number) => {
                            if (cap > 80) return "bg-rose-500";
                            if (cap > 60) return "bg-orange-500";
                            if (cap > 40) return "bg-yellow-500";
                            return "bg-emerald-500";
                          };

                          return (
                            <div className="flex flex-col gap-4">
                              {/* Cusco */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="flex items-center gap-1.5 text-slate-200">
                                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                                    Cusco Rural (Paucartambo)
                                  </span>
                                  <span className="text-slate-350">{cuscoCap}% capacidad</span>
                                </div>
                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ${getCapColor(cuscoCap)}`} style={{ width: `${cuscoCap}%` }} />
                                </div>
                              </div>

                              {/* Apurimac */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="flex items-center gap-1.5 text-slate-200">
                                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                                    Apurímac (Andahuaylas)
                                  </span>
                                  <span className="text-slate-350">{apurimacCap}% capacidad</span>
                                </div>
                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ${getCapColor(apurimacCap)}`} style={{ width: `${apurimacCap}%` }} />
                                </div>
                              </div>

                              {/* Puno */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="flex items-center gap-1.5 text-slate-200">
                                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                                    Puno (Juliaca Afueras)
                                  </span>
                                  <span className="text-slate-350">{punoCap}% capacidad</span>
                                </div>
                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ${getCapColor(punoCap)}`} style={{ width: `${punoCap}%` }} />
                                </div>
                              </div>

                              {/* Priority Levels block */}
                              <div className="flex items-center justify-between border-t border-slate-700/40 pt-3 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribución de Prioridades</span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 uppercase">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    Urgente: {queueCount > 0 ? "Alta" : "Baja"}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] font-black text-yellow-400 uppercase">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Monitoreo: Medio
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Rutina: Estable
                                  </span>
                                </div>
                              </div>

                            </div>
                          );
                        })()}
                      </div>

                    </div>

                    {/* Contenedor Principal del Reporte Estructurado */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-md flex flex-col gap-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="text-lg font-black font-headline text-slate-800">
                          {selectedReport.title}
                        </h4>
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-100 shrink-0">
                          Autónomo - Gemini 3.5 Activo
                        </span>
                      </div>

                      {/* 1. Resumen Intercultural en Quechua (Pisi Rimaypi) */}
                      {selectedReport.content.resumenQuechua && (
                        <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-5 rounded-2xl relative overflow-hidden transition-all duration-300">
                          <div className="absolute right-3 top-3 opacity-10">
                            <Globe2 className="w-16 h-16 text-amber-600" />
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              <Globe2 className="w-3.5 h-3.5 animate-pulse text-amber-650" />
                              Pisi rimaypi (Resumen Ejecutivo en Quechua)
                            </h5>
                            <button
                              type="button"
                              onClick={() => setIsQuechuaCollapsed(!isQuechuaCollapsed)}
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20"
                            >
                              {isQuechuaCollapsed ? "Mostrar" : "Ocultar"}
                            </button>
                          </div>
                          {!isQuechuaCollapsed && (
                            <p className="text-xs font-bold text-amber-905 leading-relaxed italic font-serif animate-fade-in">
                              "{selectedReport.content.resumenQuechua}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* 2. Análisis Clínico de la Población */}
                      {selectedReport.content.analisisComunitario && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              Análisis General de la Población
                            </h5>
                            <button
                              type="button"
                              onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                            >
                              {isAnalysisExpanded ? (
                                <>
                                  Ver menos <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  Ver más <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          </div>
                          <div
                            className={`bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed font-sans transition-all duration-300 relative overflow-hidden ${
                              isAnalysisExpanded ? "max-h-[1000px]" : "max-h-[110px]"
                            }`}
                          >
                            {selectedReport.content.analisisComunitario}
                            {!isAnalysisExpanded && (
                              <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* 2.1 Desglose de Diagnósticos y Alergias (Métricas Clave) */}
                      {selectedReport.summary && (selectedReport.summary.topDiagnoses || selectedReport.summary.topAllergies) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 font-sans">
                          {selectedReport.summary.topDiagnoses && selectedReport.summary.topDiagnoses.length > 0 && (
                            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                              <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                                CIE-10 Diagnósticos Registrados
                              </h6>
                              <div className="flex flex-col gap-3">
                                {selectedReport.summary.topDiagnoses.map((diag: string, i: number) => {
                                  const match = diag.match(/^(.*?)\s*\((.*?)\):\s*(\d+)\s*(.*)$/);
                                  const name = match ? match[1] : diag;
                                  const code = match ? match[2] : "";
                                  const count = match ? parseInt(match[3]) : 1;
                                  const maxCount = 10;
                                  const pct = Math.min(100, (count / maxCount) * 100);
                                  return (
                                    <div key={i} className="flex flex-col bg-white p-3.5 rounded-xl border border-slate-100 text-xs shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <span className="bg-blue-50 text-blue-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-blue-100 font-mono shrink-0">
                                            {code || `D${i}`}
                                          </span>
                                          <span className="font-bold text-slate-700 truncate">{name}</span>
                                        </div>
                                        {count && (
                                          <span className="bg-blue-50 text-blue-800 font-black text-[10px] px-2 py-0.5 rounded-full shrink-0 border border-blue-100">
                                            {count} {count === 1 ? "caso" : "casos"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500" 
                                          style={{ width: `${pct}%` }} 
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {selectedReport.summary.topAllergies && selectedReport.summary.topAllergies.length > 0 && (
                            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                              <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                Alergias Detectadas en Población
                              </h6>
                              <div className="flex flex-col gap-3">
                                {selectedReport.summary.topAllergies.map((allergy: string, i: number) => {
                                  const match = allergy.match(/^(.*?):\s*(\d+)\s*(.*)$/);
                                  const name = match ? match[1] : allergy;
                                  const count = match ? parseInt(match[2]) : 1;
                                  const maxCount = 5;
                                  const pct = Math.min(100, (count / maxCount) * 100);
                                  return (
                                    <div key={i} className="flex flex-col bg-white p-3.5 rounded-xl border border-slate-100 text-xs shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700 truncate">{name}</span>
                                        {count && (
                                          <span className="bg-rose-50 text-rose-600 font-black text-[10px] px-2 py-0.5 rounded-full border border-rose-100 shrink-0">
                                            {count} {count === 1 ? "pax" : "pax"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-gradient-to-r from-rose-400 to-orange-400 h-full rounded-full transition-all duration-500" 
                                          style={{ width: `${pct}%` }} 
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Alertas Sanitarias (Visuales por Nivel de Gravedad) */}
                      {selectedReport.content.alertas && selectedReport.content.alertas.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 font-sans">
                            Alertas Epidemiológicas e Inmunológicas
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedReport.content.alertas.map((al: any, idx: number) => {
                              const isHigh = al.nivel === 'alto';
                              const isMedium = al.nivel === 'medio';
                              
                              let colorClass = "bg-yellow-500/5 border-yellow-500/20 text-yellow-855";
                              let badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                              let iconColor = "text-yellow-600";
                              
                              if (isHigh) {
                                colorClass = "bg-rose-500/5 border-rose-500/20 text-rose-855";
                                badgeClass = "bg-rose-105 text-rose-700 border-rose-200";
                                iconColor = "text-rose-600";
                              } else if (isMedium) {
                                colorClass = "bg-orange-500/5 border-orange-500/20 text-orange-855";
                                badgeClass = "bg-orange-100 text-orange-700 border-orange-200";
                                iconColor = "text-orange-600";
                              }
                              
                              return (
                                <div key={idx} className={`border p-4 rounded-2xl flex gap-3 items-start ${colorClass} font-sans shadow-sm`}>
                                  <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="font-extrabold text-xs">{al.titulo}</span>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${badgeClass}`}>
                                        {al.nivel}
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90 font-medium">{al.descripcion}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. Recomendaciones Preventivas (Visor de Dos Columnas: Medicina Occidental vs Tradicional) */}
                      {selectedReport.content?.recomendaciones && selectedReport.content.recomendaciones.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 font-sans">
                            Planes de Intervención Intercultural
                          </h5>

                          {/* Tabs/Pills selector */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedReport.content.recomendaciones.map((rec: any, idx: number) => {
                              const isActive = activeRecTopicIdx === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setActiveRecTopicIdx(idx)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {rec.tema}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Topic Content */}
                          {selectedReport.content.recomendaciones[activeRecTopicIdx] && (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm font-sans animate-fade-in">
                              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-blue-500" />
                                <span className="font-bold text-xs text-slate-800">
                                  Tema: {selectedReport.content.recomendaciones[activeRecTopicIdx].tema}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2">
                                {/* Columna Medicina Occidental */}
                                <div className="p-4 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                                    Tratamiento Clínico Occidental
                                  </span>
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                    {selectedReport.content.recomendaciones[activeRecTopicIdx].clinico}
                                  </p>
                                </div>
                                {/* Columna Medicina Tradicional Andina */}
                                <div className="p-4 bg-emerald-500/5">
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                                    Fitoterapia / Enfoque Andino
                                  </span>
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                    {selectedReport.content.recomendaciones[activeRecTopicIdx].intercultural}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. Acciones Sanitarias Urgentes */}
                      {selectedReport.content.accionesUrgentes && selectedReport.content.accionesUrgentes.length > 0 && (
                        <div className="border-t border-slate-100 pt-6 font-sans">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4">
                            Acciones Sanitarias Inmediatas Sugeridas (Listado de Tareas)
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedReport.content.accionesUrgentes.map((action: string, idx: number) => {
                              const reportId = selectedReport.id;
                              const isCompleted = !!(completedActions[reportId] && completedActions[reportId][idx]);
                              
                              const toggleAction = () => {
                                const currentActions = completedActions[reportId] ? [...completedActions[reportId]] : [];
                                while(currentActions.length <= idx) currentActions.push(false);
                                currentActions[idx] = !currentActions[idx];
                                setCompletedActions({
                                  ...completedActions,
                                  [reportId]: currentActions
                                });
                              };

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={toggleAction}
                                  className={`w-full text-left p-4 rounded-xl flex gap-3.5 items-start border transition-all hover:bg-slate-50 cursor-pointer ${
                                    isCompleted 
                                      ? "bg-slate-50/40 border-slate-100 opacity-60" 
                                      : "bg-white border-slate-100 shadow-sm"
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isCompleted ? (
                                      <CheckSquare className="w-5 h-5 text-blue-500 transition-all" />
                                    ) : (
                                      <Square className="w-5 h-5 text-slate-350 hover:text-slate-500 transition-all" />
                                    )}
                                  </div>
                                  <p className={`text-xs font-bold leading-relaxed text-slate-705 ${isCompleted ? "line-through text-slate-400 font-medium" : ""}`}>
                                    {action}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </>
                )}

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
