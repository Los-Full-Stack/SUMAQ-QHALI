import React, { useState, useEffect } from "react";
import { RecentActivity, Language } from "../types";
import { 
  BarChart, 
  Map, 
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
  Search,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  CalendarPlus
} from "lucide-react";

import { useAuthStore } from "../store/useAuthStore";
import { LogOut } from "lucide-react";
import { api } from "../services/api";
import { confirmAction, notify } from "../services/uiFeedback";

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

  const communityRiskZones = [
    { name: "Cusco Rural (Paucartambo)", baseLoad: 52, focus: "Cardiometabólico", patients: 5 },
    { name: "Apurímac (Andahuaylas)", baseLoad: 38, focus: "Respiratorio y nutrición", patients: 3 },
    { name: "Puno (Juliaca Afueras)", baseLoad: 31, focus: "Osteoarticular y renal", patients: 2 }
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

  const parseMetricCount = (value: string) => {
    const match = value.match(/:\s*(\d+)/);
    return match ? Number(match[1]) : 1;
  };

  const getReportRisk = (report: any) => {
    const highAlertCount = report?.content?.alertas?.filter((a: any) => a.nivel === "alto").length || 0;
    const mediumAlertCount = report?.content?.alertas?.filter((a: any) => a.nivel === "medio").length || 0;
    const queueCount = report?.summary?.telemedicineQueueCount || 0;
    const diagnosisLoad = report?.summary?.topDiagnoses?.reduce((total: number, diag: string) => total + parseMetricCount(diag), 0) || 0;
    const score = Math.min(100, Math.max(12, (highAlertCount * 28) + (mediumAlertCount * 14) + (queueCount * 7) + Math.min(24, diagnosisLoad * 2)));

    if (score >= 76) return { score, label: "Crítico", tone: "rose", nextStep: "Activar ronda de controles domiciliarios" };
    if (score >= 51) return { score, label: "Alto", tone: "orange", nextStep: "Priorizar pacientes con comorbilidades" };
    if (score >= 26) return { score, label: "Moderado", tone: "yellow", nextStep: "Monitoreo preventivo de crónicos" };
    return { score, label: "Bajo", tone: "emerald", nextStep: "Seguimiento rutinario" };
  };

  const getRiskBadgeClass = (tone: string) => {
    if (tone === "rose") return "bg-rose-50 text-rose-700 border-rose-200";
    if (tone === "orange") return "bg-orange-50 text-orange-700 border-orange-200";
    if (tone === "yellow") return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const getRiskBarClass = (score: number) => {
    if (score >= 76) return "bg-rose-500";
    if (score >= 51) return "bg-orange-500";
    if (score >= 26) return "bg-yellow-500";
    return "bg-emerald-500";
  };

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
      notify({ type: "warning", title: "Selecciona un horario", message: "Debes elegir al menos un bloque antes de registrar turnos." });
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
        notify({ type: "warning", title: "Registro parcial", message: `Se registraron ${successCount} turnos. ${failCount} fallaron, posiblemente porque ya existían.` });
      } else {
        notify({ type: "success", title: "Turnos registrados", message: "Todos los bloques se guardaron correctamente." });
      }

      setSelectedSlots([]);
      fetchShifts();
    } catch (e: any) {
      console.error(e);
      notify({ type: "error", title: "No se pudieron registrar", message: "Revisa la conexión o intenta nuevamente." });
    } finally {
      setIsSubmittingShift(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch("/api/db/sql-logs", {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron exportar los logs.");

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sumaq-qhali-sql-logs-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify({ type: "success", title: "Logs exportados", message: "Se descargó el archivo JSON de actividad SQL." });
    } catch (err: any) {
      notify({ type: "error", title: "No se pudo exportar", message: err.message || "Intenta nuevamente." });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    const accepted = await confirmAction({
      title: "Eliminar turno",
      message: "Esta acción quitará el bloque de la agenda disponible.",
      confirmLabel: "Eliminar",
      tone: "danger"
    });
    if (!accepted) return;
    try {
      await api.deleteShift(shiftId);
      notify({ type: "success", title: "Turno eliminado", message: "El bloque ya no aparece en la agenda." });
      fetchShifts();
    } catch (err: any) {
      console.error(err);
      notify({ type: "error", title: "No se pudo eliminar", message: err.message || "Intenta nuevamente." });
    }
  };

  const filteredShifts = shifts.filter(s => {
    const matchesDoc = doctorFilter ? s.DoctorName.toLowerCase().includes(doctorFilter.toLowerCase()) : true;
    const matchesSpec = specialtyFilter ? s.Specialty === specialtyFilter : true;
    return matchesDoc && matchesSpec;
  });



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
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
            Observatorio Crónico IA
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
                  <CalendarPlus className="text-blue-600" />
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
                    <CalendarPlus className="w-4 h-4" />
                    {isSubmittingShift ? "Registrando..." : "Registrar Turnos"}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-md flex flex-col min-h-[500px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold font-headline text-slate-800 flex items-center gap-2">
                    <ClipboardList className="text-slate-500" />
                    Listado de Horarios en Activo
                  </h3>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-48 sm:w-56 shadow-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar médico..."
                        value={doctorFilter}
                        onChange={(e) => setDoctorFilter(e.target.value)}
                        className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none placeholder-slate-400 w-full"
                      />
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

                {/* Cards Container (Doctor Grid Layout) */}
                <div className="flex-grow beautiful-scrollbar pr-1">
                  {isLoadingShifts ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 text-sm font-semibold">Cargando turnos de base de datos...</p>
                    </div>
                  ) : filteredShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                      <Calendar className="w-12 h-12 text-slate-400 mb-4" />
                      <p className="text-slate-500 text-sm font-semibold">No se encontraron turnos configurados.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(() => {
                        // Group shifts by doctor name
                        const grouped: Record<string, { doctorName: string; specialty: string; slots: any[] }> = {};
                        filteredShifts.forEach(shift => {
                          const docName = shift.DoctorName;
                          if (!grouped[docName]) {
                            grouped[docName] = {
                              doctorName: docName,
                              specialty: shift.Specialty,
                              slots: []
                            };
                          }
                          grouped[docName].slots.push(shift);
                        });

                        return Object.values(grouped).map((docGroup: any, i) => {
                          let cardAccentColor = "border-t-blue-500";
                          let specialtyBg = "bg-blue-50 text-blue-700 border-blue-100";
                          
                          if (docGroup.specialty === "Pediatría") {
                            cardAccentColor = "border-t-purple-500";
                            specialtyBg = "bg-purple-50 text-purple-700 border-purple-100";
                          } else if (docGroup.specialty === "Obstetricia" || docGroup.specialty === "Ginecología") {
                            cardAccentColor = "border-t-pink-500";
                            specialtyBg = "bg-pink-50 text-pink-700 border-pink-100";
                          } else if (docGroup.specialty === "Medicina Tradicional") {
                            cardAccentColor = "border-t-emerald-500";
                            specialtyBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
                          } else if (docGroup.specialty === "Control de Presión") {
                            cardAccentColor = "border-t-orange-500";
                            specialtyBg = "bg-orange-50 text-orange-700 border-orange-100";
                          }

                          return (
                            <div 
                              key={i} 
                              className={`bg-white rounded-2xl border-t-4 ${cardAccentColor} border-r border-b border-l border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4`}
                            >
                              {/* Doctor Card Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                    <Stethoscope className="w-5 h-5 text-slate-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{docGroup.doctorName}</h4>
                                    <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold border ${specialtyBg}`}>
                                      {docGroup.specialty}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Doctor Slots List */}
                              <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Bloques Asignados
                                </span>
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 beautiful-scrollbar">
                                  {docGroup.slots.map((slot: any) => (
                                    <div 
                                      key={slot.ShiftID} 
                                      className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                                    >
                                      <div className="flex flex-col leading-tight">
                                        <span className="text-slate-500 text-[10px]">
                                          {daysMap[slot.DayOfWeek]} ({slot.ShiftDate ? formatDate(slot.ShiftDate) : getNextDateForDay(slot.DayOfWeek)})
                                        </span>
                                        <span className="text-slate-800 font-bold mt-0.5">{slot.SlotTime}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteShift(slot.ShiftID)}
                                        className="text-rose-500 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Eliminar este turno"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="flex flex-col gap-6 animate-fade-in z-10 relative">
            
            {/* Header del Observatorio de Crónicos */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="z-10">
                <h3 className="text-xl font-bold font-headline text-white flex items-center gap-2">
                  <Heart className="text-rose-500 w-5 h-5" />
                  Observatorio de Enfermedades Crónicas IA
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl font-medium">
                  Monitorea prevalencia, comorbilidades, continuidad de controles y carga familiar de pacientes con enfermedades crónicas en la red rural.
                </p>
              </div>
              <button
                type="button"
                onClick={triggerNewReport}
                disabled={isGeneratingReport}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-rose-500/10 hover:shadow-rose-500/25 flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer self-start md:self-auto shrink-0 z-10"
              >
                <Bot className="w-5 h-5" />
                {isGeneratingReport ? "Analizando crónicos..." : "Actualizar observatorio"}
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
              {/* Columna Izquierda: Historial de Escaneos de Brotes */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-md flex flex-col gap-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Cortes del Observatorio
                </h4>

                {isLoadingReports ? (
                   <div className="flex flex-col items-center py-8">
                     <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-2" />
                     <span className="text-[10px] text-slate-400 font-bold">Actualizando observatorio...</span>
                   </div>
                ) : reportsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No se registran cortes del observatorio.</p>
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
                              ? "bg-rose-50/80 border-rose-300 shadow-sm"
                              : "bg-slate-50/50 hover:bg-slate-50 border-slate-100"
                          }`}
                        >
                          <span className={`text-xs font-black leading-tight ${isSelected ? "text-rose-700" : "text-slate-700"}`}>
                            {rep.title.replace("Reporte Epidemiológico Autónomo", "Observatorio de Crónicos").replace("Reporte Epidemiológico Semanal", "Observatorio de Crónicos").replace("Observatorio de Enfermedades Crónicas Rural", "Observatorio de Crónicos")}
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
                    <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin mb-4" />
                    <p className="text-slate-650 font-bold text-sm animate-pulse">
                      {isGeneratingReport ? "SUMAQ QHALI está analizando prevalencia, comorbilidades y controles pendientes..." : "Cargando observatorio de crónicos..."}
                    </p>
                  </div>
                ) : !selectedReport ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-md flex flex-col items-center justify-center text-center min-h-[300px]">
                    <Bot className="w-12 h-12 text-slate-350 mb-3 animate-bounce" />
                    <h4 className="font-bold text-slate-750">Selecciona un corte del observatorio</h4>
                    <p className="text-xs text-slate-550 mt-1 font-medium">Elige un registro para ver prevalencia, comorbilidades y plan de seguimiento.</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const risk = getReportRisk(selectedReport);
                      const queueCount = selectedReport.summary?.telemedicineQueueCount || 0;
                      const alerts = selectedReport.content?.alertas || [];
                      const highBurdenAlerts = alerts.filter((a: any) => a.nivel === "alto");
                      const diagnoses = selectedReport.summary?.topDiagnoses || [];
                      const chronicConditions = selectedReport.summary?.topChronicConditions || diagnoses;
                      const chronicByLocation = selectedReport.summary?.chronicByLocation || [];
                      const allergies = selectedReport.summary?.topAllergies || [];
                      const actions = selectedReport.content?.accionesUrgentes || [];
                      const completed = completedActions[selectedReport.id] || [];
                      const responseProgress = actions.length ? Math.round((completed.filter(Boolean).length / actions.length) * 100) : 0;
                      const chronicTotal = chronicConditions.reduce((total: number, item: string) => total + parseMetricCount(item), 0);

                      return (
                        <div className="flex flex-col gap-5">
                          <div className="bg-white border border-slate-100 rounded-3xl shadow-md overflow-hidden">
                            <div className="grid grid-cols-1 xl:grid-cols-12">
                              <div className="xl:col-span-4 bg-slate-950 text-white p-6 flex flex-col justify-between gap-8">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">Observatorio crónico</span>
                                  <h3 className="text-3xl font-black font-headline leading-tight mt-2">Carga {risk.label}</h3>
                                  <p className="text-sm text-slate-300 mt-3 font-medium leading-relaxed">
                                    {highBurdenAlerts.length > 0
                                      ? `${highBurdenAlerts.length} grupo de pacientes requiere control prioritario.`
                                      : "Carga estable; mantener controles periódicos y educación familiar."}
                                  </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                  <div>
                                    <div className="flex items-end justify-between mb-2">
                                      <span className="text-5xl font-black tracking-tight">{risk.score}%</span>
                                      <span className="text-[10px] font-black uppercase text-slate-400">índice crónico</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${getRiskBarClass(risk.score)}`} style={{ width: `${risk.score}%` }} />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                                      <span className="block text-2xl font-black">{chronicConditions.length}</span>
                                      <span className="text-[9px] font-bold uppercase text-slate-400">grupos</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                                      <span className="block text-2xl font-black">{chronicTotal}</span>
                                      <span className="text-[9px] font-bold uppercase text-slate-400">crónicos</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                                      <span className="block text-2xl font-black">{queueCount}</span>
                                      <span className="text-[9px] font-bold uppercase text-slate-400">controles</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="xl:col-span-8 p-6">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                                  <div>
                                    <h4 className="text-xl font-black text-slate-850 font-headline">
                                      {selectedReport.title.replace("Reporte Epidemiológico Autónomo", "Observatorio de Crónicos").replace("Reporte Epidemiológico Semanal", "Observatorio de Crónicos").replace("Observatorio de Enfermedades Crónicas Rural", "Observatorio de Crónicos")}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                      {new Date(selectedReport.date || Date.now()).toLocaleDateString()} · seguimiento longitudinal activo
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={triggerNewReport}
                                    disabled={isGeneratingReport}
                                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 self-start cursor-pointer"
                                  >
                                    <Activity className="w-4 h-4" />
                                    Recalcular observatorio
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                  <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pacientes analizados</span>
                                    <strong className="block text-2xl font-black text-slate-850 mt-1">{selectedReport.summary?.totalPatients || 0}</strong>
                                  </div>
                                  <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Seguimiento completado</span>
                                    <strong className="block text-2xl font-black text-slate-850 mt-1">{responseProgress}%</strong>
                                  </div>
                                  <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Citas registradas</span>
                                    <strong className="block text-2xl font-black text-slate-850 mt-1">{selectedReport.summary?.totalAppointments || 0}</strong>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                  <div className="border border-slate-100 rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mapa de carga crónica</h5>
                                      <Map className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="relative min-h-[260px] rounded-2xl bg-slate-950 overflow-hidden p-4">
                                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,#38bdf8,transparent_30%),radial-gradient(circle_at_70%_60%,#fb7185,transparent_28%)]" />
                                      {communityRiskZones.map((zone, idx) => {
                                        const locationEntry = chronicByLocation[idx];
                                        const locationLoad = locationEntry ? parseMetricCount(locationEntry) * 8 : 0;
                                        const load = Math.min(100, zone.baseLoad + locationLoad + (queueCount * (idx + 2)) + (highBurdenAlerts.length * 10));
                                        const positions = ["left-[15%] top-[18%]", "right-[18%] top-[38%]", "left-[38%] bottom-[14%]"];
                                        return (
                                          <div key={zone.name} className={`absolute ${positions[idx]} w-36`}>
                                            <div className={`w-4 h-4 rounded-full ring-4 ${load >= 70 ? "bg-rose-500 ring-rose-500/20" : load >= 45 ? "bg-orange-400 ring-orange-400/20" : "bg-emerald-400 ring-emerald-400/20"}`} />
                                            <div className="mt-2 bg-white/95 rounded-xl border border-white/20 p-2 shadow-lg">
                                              <span className="block text-[10px] font-black text-slate-800 leading-tight">{zone.name}</span>
                                              <span className="block text-[9px] font-bold text-slate-500 mt-0.5">{load}% carga · {zone.focus}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="border border-slate-100 rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Prioridades clínicas</h5>
                                      <AlertCircle className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto beautiful-scrollbar pr-1">
                                      {alerts.length === 0 ? (
                                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl p-4 text-xs font-bold">
                                          No hay prioridades críticas en este corte.
                                        </div>
                                      ) : alerts.map((al: any, idx: number) => {
                                        const tone = al.nivel === "alto" ? "rose" : al.nivel === "medio" ? "orange" : "emerald";
                                        return (
                                          <div key={idx} className={`border rounded-2xl p-4 ${getRiskBadgeClass(tone)}`}>
                                            <div className="flex items-center justify-between gap-3">
                                              <strong className="text-xs">{al.titulo}</strong>
                                              <span className="text-[9px] font-black uppercase">{al.nivel}</span>
                                            </div>
                                            <p className="text-[11px] font-semibold leading-relaxed mt-2 opacity-90">{al.descripcion}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-md p-6">
                              <div className="flex items-center justify-between mb-5">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Plan de seguimiento crónico</h4>
                                <span className="text-[10px] font-black uppercase text-slate-400">{completed.filter(Boolean).length}/{actions.length || 0} completadas</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(actions.length ? actions : [risk.nextStep]).map((action: string, idx: number) => {
                                  const isCompleted = !!completed[idx];
                                  const toggleAction = () => {
                                    const currentActions = completedActions[selectedReport.id] ? [...completedActions[selectedReport.id]] : [];
                                    while (currentActions.length <= idx) currentActions.push(false);
                                    currentActions[idx] = !currentActions[idx];
                                    setCompletedActions({ ...completedActions, [selectedReport.id]: currentActions });
                                  };

                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={toggleAction}
                                      className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${isCompleted ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-slate-50 border-slate-100 hover:bg-white text-slate-750"}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        {isCompleted ? <CheckSquare className="w-5 h-5 shrink-0 text-emerald-600" /> : <Square className="w-5 h-5 shrink-0 text-slate-400" />}
                                        <span className={`text-xs font-bold leading-relaxed ${isCompleted ? "line-through" : ""}`}>{action}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-3xl shadow-md p-6">
                              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-5">Prevalencia crónica</h4>
                              <div className="flex flex-col gap-4">
                                {chronicConditions.slice(0, 7).map((condition: string, idx: number) => {
                                  const match = condition.match(/^(.*?)\s*\((.*?)\):\s*(\d+)/);
                                  const simpleMatch = condition.match(/^(.*?):\s*(\d+)/);
                                  const name = match ? match[1] : simpleMatch ? simpleMatch[1] : condition;
                                  const code = match ? match[2] : "CR";
                                  const count = match ? Number(match[3]) : simpleMatch ? Number(simpleMatch[2]) : parseMetricCount(condition);
                                  const pct = Math.min(100, Math.max(16, count * 14));
                                  return (
                                    <div key={`${code}-${idx}`}>
                                      <div className="flex items-center justify-between gap-3 mb-1">
                                        <span className="text-xs font-black text-slate-700 truncate">{name}</span>
                                        <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{code}</span>
                                      </div>
                                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400">{count} pacientes</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {allergies.length > 0 && (
                                <div className="border-t border-slate-100 mt-5 pt-4">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alergias relevantes</span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {allergies.slice(0, 4).map((allergy: string, idx: number) => (
                                      <span key={idx} className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded-lg">
                                        {allergy}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-3xl shadow-md p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Lectura clínica longitudinal</h4>
                              <button
                                type="button"
                                onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer self-start"
                              >
                                {isAnalysisExpanded ? "Compactar" : "Ver informe completo"}
                                {isAnalysisExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                            <p className={`text-sm text-slate-650 font-medium leading-relaxed ${isAnalysisExpanded ? "" : "line-clamp-3"}`}>
                              {selectedReport.content?.analisisComunitario || "Sin análisis narrativo disponible para este corte del observatorio."}
                            </p>
                            {selectedReport.content?.resumenQuechua && (
                              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Mensaje comunitario</span>
                                <p className="text-xs font-bold text-amber-900 leading-relaxed mt-1 italic">"{selectedReport.content.resumenQuechua}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

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
