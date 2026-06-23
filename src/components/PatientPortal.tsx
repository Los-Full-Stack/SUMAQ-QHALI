import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Heart, X, CalendarClock, AlertCircle, ActivitySquare, FileText, MapPin, Droplets, Clock, LogOut, Pill, Globe, Video, ChevronLeft, ChevronRight, MessageSquare, Send, Sparkles, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../services/api";
import JitsiCall from "./JitsiCall";

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

interface PatientPortalProps {
  language?: "es" | "qu";
  onSetLanguage?: (lang: "es" | "qu") => void;
}

const t = {
  es: {
    portalTitle: "Mi Portal Médico",
    portalDesc: "Accede a tus recetas e indicaciones médicas traducidas por Inteligencia Artificial.",
    generateAppt: "Generar Cita",
    logout: "Salir",
    agendaTitle: "Tu Agenda",
    agendaDesc: "Gestiona tus citas programadas y solicita nuevas atenciones.",
    agendaNew: "AGENDAR NUEVA CITA",
    noAppts: "No tienes citas próximas",
    noApptsDesc: "No hay consultas programadas en tu agenda. Si necesitas atención médica, agenda una nueva cita ahora mismo.",
    patientProfile: "Perfil del Paciente",
    active: "Activo",
    blood: "Sangre",
    historyNum: "Expediente",
    currentTreatment: "Tratamiento Actual",
    duration: "Duración",
    noMeds: "No hay medicamentos recetados activos.",
    allergies: "Alergias",
    noAllergies: "Sin alergias registradas.",
    conditions: "Condiciones",
    noConditions: "Sin condiciones crónicas.",
    medicalHistory: "Historial Clínico",
    medicalNotes: "Notas del Médico",
    aiIndications: "Indicaciones Bilingües (AI)",
    recommendation: "Recomendación",
    noHistory: "Sin Historial Clínico",
    noHistoryDesc: "Aún no hay recetas ni diagnósticos registrados en tu expediente por el personal médico.",
    connecting: "Conectando...",
    syncing: "Sincronizando tu expediente clínico con la Nube Andina Segura.",
    modalTitle: "Agendar Nueva Cita",
    specialty: "Especialidad Requerida",
    date: "Fecha",
    time: "Hora",
    confirm: "Confirmar Reserva"
  },
  qu: {
    portalTitle: "Hampi Portalniy",
    portalDesc: "Hampikunaykita yachaykunatawan Inteligencia Artificial nisqawan t'ikrasqata qhaway.",
    generateAppt: "Cita Ruway",
    logout: "Lluqsiy",
    agendaTitle: "Agendayki",
    agendaDesc: "Citasniykita qhaway, musuq atenciontapas mañakuy.",
    agendaNew: "MUSUQ CITA RUWAY",
    noAppts: "Manam citas kanchu",
    noApptsDesc: "Manam citas programadas kanchu agendaykipi. Hampikuyta munaspaqa musuq citata ruway.",
    patientProfile: "Unquqpa Perfilnin",
    active: "Kawsachkan",
    blood: "Yawar",
    historyNum: "Expediente",
    currentTreatment: "Kunan Hampikuy",
    duration: "Unaynin",
    noMeds: "Manam pastillas kanchu.",
    allergies: "Alergias",
    noAllergies: "Manam alergias kanchu.",
    conditions: "Unquykuna",
    noConditions: "Manam unquykuna kanchu.",
    medicalHistory: "Hampikuy Historial",
    medicalNotes: "Hampiqpa Qillqasqan",
    aiIndications: "Bilingüe Yachaykuna (AI)",
    recommendation: "Kamachikuy",
    noHistory: "Manam Historial kanchu",
    noHistoryDesc: "Manaraqmi hampiqkuna recetata nitaq diagnosticota qillqasqakuchu.",
    connecting: "Tinkuchkaspa...",
    syncing: "Expedienteykita Nube Andina Segura nisqawan tinkuchkan.",
    modalTitle: "Musuq Cita Ruway",
    specialty: "Especialidad",
    date: "P'unchaw",
    time: "Hora",
    confirm: "Cita Waqaychay"
  }
};

export default function PatientPortal({ language = "es", onSetLanguage }: PatientPortalProps) {
  const { portalPatient, setPortalPatient, setLogout } = useAuthStore();
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [newApptForm, setNewApptForm] = useState({ date: "", time: "", type: "Medicina General" });
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchPatientData = async () => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) {
      setLoadError("Sesión inválida o expirada.");
      return;
    }
    setIsSyncing(true);
    setLoadError(null);
    try {
      const data = await api.getPatientById(user.id);
      if (data) {
        setPortalPatient(data);
      } else {
        setLoadError("No se pudo cargar el expediente médico. Asegúrese de que el paciente existe en la base de datos.");
      }
    } catch (e: any) {
      console.error(e);
      setLoadError(e.message || "Error de conexión con la Nube Andina Segura.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!portalPatient) {
      fetchPatientData();
    }
  }, [portalPatient]);

  // Calendar states & logic
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const monthsES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthsQU = ["Qulla puquy", "Hatun puquy", "Pauqar waray", "Ayriwa", "Aymuray", "Inti raymi", "Anta situwa", "Qhapaq situwa", "Uma raymi", "Kantaray", "Ayamarq'a", "Qhapaq raymi"];

  const fetchShifts = async () => {
    try {
      const shifts = await api.getShifts();
      setAllShifts(shifts);
    } catch (e) {
      console.error("Failed to fetch shifts for calendar", e);
    }
  };

  useEffect(() => {
    if (isApptModalOpen) {
      fetchShifts();
      setCurrentCalendarDate(new Date());
    }
  }, [isApptModalOpen]);

  const getAvailableDaysForSpecialty = () => {
    const specShifts = allShifts.filter(s => s.Specialty === newApptForm.type);
    const days = new Set<number>(specShifts.map(s => s.DayOfWeek));
    return days;
  };

  const prevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  const getSpecialtyScheduleText = () => {
    if (language === "es") {
      switch(newApptForm.type) {
        case "Medicina General": return "Horario: Lunes, Miércoles y Viernes (Dr. Yawar Quispe)";
        case "Pediatría": return "Horario: Martes y Jueves (Dra. Killa Choque)";
        case "Obstetricia": return "Horario: Lunes, Martes y Jueves (Dra. Suyana Condori)";
        case "Medicina Tradicional": return "Horario: Miércoles y Viernes (Dr. Inti Huaman)";
        case "Control de Presión": return "Horario: Lunes a Viernes (Enf. Sayri Rimachi)";
        default: return "";
      }
    } else {
      switch(newApptForm.type) {
        case "Medicina General": return "Horario: Lunes, Miércoles, Viernes p'unchaykunapi (Dr. Yawar Quispe)";
        case "Pediatría": return "Horario: Martes, Jueves p'unchaykunapi (Dra. Killa Choque)";
        case "Obstetricia": return "Horario: Lunes, Martes, Jueves p'unchaykunapi (Dra. Suyana Condori)";
        case "Medicina Tradicional": return "Horario: Miércoles, Viernes p'unchaykunapi (Dr. Inti Huaman)";
        case "Control de Presión": return "Horario: Lunesmanta Vierneskama p'unchaykunapi (Enf. Sayri Rimachi)";
        default: return "";
      }
    }
  };

  // Telemedicine state
  const [isInQueue, setIsInQueue] = useState(false);
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);

  useEffect(() => {
    let interval: any;
    if ((isInQueue || activeCallRoom) && portalPatient) {
      interval = setInterval(async () => {
        try {
          const res = await api.getQueueStatus(portalPatient.id);
          if (res && res.status === 'accepted' && !activeCallRoom) {
            setIsInQueue(false);
            const safeId = portalPatient.id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            setActiveCallRoom(`sqsala${safeId}`);
          } else if (activeCallRoom && (!res || res.status === 'none')) {
            // The doctor has finished the consultation and removed the patient from the queue
            setActiveCallRoom(null);
            setIsInQueue(false);
            // Optional: Refresh patient data to show the new consultation
            fetchMyAppointments();
          }
        } catch (e) { console.error(e); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isInQueue, activeCallRoom, portalPatient]);

  const handleImmediateAttention = async () => {
    if (!portalPatient) return;
    try {
      const res = await api.joinQueue(portalPatient.id, portalPatient.name, portalPatient.location || 'Zona Rural');
      if (res.error) {
        alert("Error uniéndose a la cola: " + res.error + "\nPor favor inicie sesión nuevamente.");
        return;
      }
      setIsInQueue(true);
      setQueuePosition(1); // En una versión real, esto se calcularía en el backend
    } catch (e) {
      console.error("Join Queue Error:", e);
      alert("Error de conexión con el servidor.");
    }
  };

  const handleCancelQueue = async () => {
    if (!portalPatient) return;
    setIsInQueue(false);
    try {
      await api.leaveQueue(portalPatient.id);
    } catch (e) { console.error(e); }
  };

  const dict = t[language];

  // Get active medications from the most recent consultation
  const activeMeds = portalPatient?.consultations && portalPatient.consultations.length > 0 
    ? portalPatient.consultations[0].prescriptions || []
    : [];

  const fetchMyAppointments = async () => {
    if (!portalPatient) return;
    try {
      const allAppts = await api.getAppointments();
      setMyAppointments(allAppts.filter((a: any) => a.patientId === portalPatient.id && a.status !== "Completed"));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyAppointments();
  }, [portalPatient]);

  // Carga de slots disponibles de forma dinámica
  useEffect(() => {
    const fetchSlots = async () => {
      if (!newApptForm.date || !newApptForm.type) return;
      setIsLoadingSlots(true);
      try {
        const token = localStorage.getItem("sumaq_token");
        const res = await fetch(`/api/appointments/available-slots?specialty=${encodeURIComponent(newApptForm.type)}&date=${newApptForm.date}`, {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const slots = await res.json();
          setAvailableSlots(slots);
          if (slots.length > 0) {
            setNewApptForm(prev => ({ ...prev, time: slots[0] }));
          } else {
            setNewApptForm(prev => ({ ...prev, time: "" }));
          }
        } else {
          setAvailableSlots([]);
          setNewApptForm(prev => ({ ...prev, time: "" }));
        }
      } catch (e) {
        console.error(e);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [newApptForm.date, newApptForm.type]);

  const handleScheduleAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalPatient) return;
    if (!newApptForm.time) {
      alert(language === "es" ? "Por favor seleccione un horario disponible." : "Hampiy horata akllay.");
      return;
    }
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          patientId: portalPatient.id,
          patientName: portalPatient.name,
          startTime: `${newApptForm.date} ${newApptForm.time}`,
          endTime: "TBD",
          type: newApptForm.type,
          status: "Scheduled"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al agendar la cita.");
      }

      setIsApptModalOpen(false);
      alert(language === "es" ? "Cita generada con éxito." : "Cita ruwasqaña.");
      const updated = await api.getPatientById(portalPatient.id);
      if (updated) setPortalPatient(updated);
      await fetchMyAppointments();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error al agendar la cita.");
    }
  };

  // Chatbot states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "bot" | "user"; text: string; time: string; severity?: "low" | "medium" | "high" }>>([
    {
      sender: "bot",
      text: language === "es" 
        ? "Allillanchu (Hola), soy tu asistente de salud Sumaq Qhali. Cuéntame, ¿qué dolor o síntoma sientes hoy?" 
        : "Allillanchu, Sumaq Qhali hampi yanapawaqniykim kani. Willaway, ¿ima nanaytataq sapa p'unchay kawsanki?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle language change for welcome message
  useEffect(() => {
    setChatMessages([
      {
        sender: "bot",
        text: language === "es" 
          ? "Allillanchu (Hola), soy tu asistente de salud Sumaq Qhali. Cuéntame, ¿qué dolor o síntoma sientes hoy?" 
          : "Allillanchu, Sumaq Qhali hampi yanapawaqniykim kani. Willaway, ¿ima nanaytataq sapa p'unchay kawsanki?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [language]);

  const handleSendBotMessage = (text: string) => {
    if (!text.trim()) return;

    // 1. Add user message
    const userMsg = {
      sender: "user" as const,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");

    // 2. Process symptom and generate response
    setTimeout(() => {
      const normalized = text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      let botText = "";
      let isSevere = false;

      if (
        normalized.includes("dolor fuerte") ||
        normalized.includes("pecho") ||
        normalized.includes("respirar") ||
        normalized.includes("sangre") ||
        normalized.includes("urgencia") ||
        normalized.includes("emergencia") ||
        normalized.includes("intenso") ||
        normalized.includes("grave") ||
        normalized.includes("vomito") ||
        normalized.includes("nisyu") ||
        normalized.includes("llaki") ||
        normalized.includes("39") ||
        normalized.includes("40") ||
        normalized.includes("desmayo") ||
        normalized.includes("desmaye") ||
        normalized.includes("desmayarse") ||
        normalized.includes("desmayado") ||
        normalized.includes("pitiy") ||
        normalized.includes("chinkay") ||
        normalized.includes("musphay") ||
        normalized.includes("convulsion") ||
        normalized.includes("convulsiones") ||
        normalized.includes("katatatay") ||
        normalized.includes("infarto") ||
        normalized.includes("paro cardiaco") ||
        normalized.includes("sunqu nanay") ||
        normalized.includes("asfixia") ||
        normalized.includes("ahogo") ||
        normalized.includes("samay phatay") ||
        normalized.includes("hemorragia") ||
        normalized.includes("yawar apamuy") ||
        normalized.includes("intoxica") ||
        normalized.includes("envenena") ||
        normalized.includes("miyu") ||
        normalized.includes("fractura") ||
        normalized.includes("tullu p'aki") ||
        normalized.includes("inconsciente") ||
        normalized.includes("desvaneci") ||
        normalized.includes("perdi") ||
        normalized.includes("perdio") ||
        normalized.includes("pierde el conocimiento") ||
        normalized.includes("conocimiento") ||
        normalized.includes("golpe") ||
        normalized.includes("traumatismo") ||
        normalized.includes("craneo")
      ) {
        isSevere = true;
        botText = language === "es"
          ? "⚠️ ¡Alerta Crítica! Este síntoma (como desmayos, pérdida de conocimiento, convulsiones, dolor de pecho o dificultad respiratoria) es de nivel grave y requiere atención médica inmediata. Por favor, NO te automediques. Te recomendamos agendar una cita urgente o unirte de inmediato a nuestra cola de Telemedicina en el botón de abajo para ser atendido por un médico, o acudir al establecimiento de salud más cercano."
          : "⚠️ ¡Llaki Alerta! Kay unquyniykikunaqa (desmayo, convulsion, sunqu nanay, o samay phatay) nisyu grave unquymi kanman. Ama kikinpaq pastillakunata ukyaychu. Utqayman videollamada Telemedicina nisqaman yaykuy utaq urgentemente hampina wasiman ripuy.";
      } else if (normalized.includes("cabeza") || normalized.includes("uma")) {
        botText = language === "es"
          ? "Para aliviar el dolor de cabeza, te recomendamos descansar en un ambiente silencioso y oscuro. Toma una infusión tibia de Manzanilla o Muña para reducir la tensión física. También puedes aplicar paños fríos sobre la frente."
          : "Uma nanaypaqqa, ch'in ch'isi ukhupi samariy. Manzanilla oqaq o muña yakuta ukyay tensionta qispichinaykipaq. Chiriyachisqa p'achakunatapas mat'iykiman churay.";
      } else if (normalized.includes("fiebre") || normalized.includes("calentura") || normalized.includes("rupapakuy") || normalized.includes("rupha")) {
        botText = language === "es"
          ? "Si es una fiebre leve, mantén la hidratación tomando abundante agua tibia. Una infusión de hojas de Eucalipto es excelente para refrescar. Coloca paños húmedos de agua fría sobre la frente y axilas. Si la fiebre es persistente o muy alta, te sugerimos consultar con un médico en nuestra cola de telemedicina."
          : "Rupapakuy kaqtinqa, q'uñi yakukunata ukyay. Eucalipto yakuta ukyaypis allinmi sampa q'uñikunata refreshing nisqa ruwananpaq. Chiriyachisqa p'achawan mat'iykita llulluy. Nisyu rupapakuy kaqtinqa, hampiqta maskhay.";
      } else if (normalized.includes("estomago") || normalized.includes("colico") || normalized.includes("wiksa") || normalized.includes("panza")) {
        botText = language === "es"
          ? "Para el dolor estomacal o cólicos, te sugerimos tomar una infusión de Muña (de propiedades antiespasmódicas y digestivas) o de Manzanilla. Aplica paños tibios sobre el abdomen y mantén reposo. Evita las comidas pesadas y grasosas."
          : "Wiksa nanaypaqqa muña yakuta ukyay sumaq digestivo kasqanrayku. Q'uñi p'achakunata wiksaykiman churay. Ama llasa mikhuykunata mikhuychu, sampa caldillokunallata ukyay.";
      } else if (normalized.includes("tos") || normalized.includes("resfrio") || normalized.includes("uhu") || normalized.includes("chuqu") || normalized.includes("gripe")) {
        botText = language === "es"
          ? "Para combatir la tos y el resfrío, es clave abrigar bien el pecho. Toma una infusión caliente de Eucalipto o Coca con miel. Adicionalmente, inhalar el vapor de agua hervida con hojas de eucalipto te ayudará a despejar las vías respiratorias."
          : "Uhu o resfríopaqqa, q'asquykita sumaqta abrigay. Eucalipto utaq coca yakuta misk'iyuqta ukyay. Eucalipto wapsichikuypis allinmi ansa samayta kichanapaq.";
      } else if (normalized.includes("espalda") || normalized.includes("wasa") || normalized.includes("cuerpo")) {
        botText = language === "es"
          ? "Para dolores de espalda o musculares, aplica calor local (compresas tibias o bolsa de agua caliente). Prepara una infusión de Coca o Manzanilla para calmar los espasmos musculares. Evita realizar esfuerzos físicos y descansa."
          : "Wasa nanaypaqqa q'uñi yakuyuq bolsata churay nanasqanman. Coca o manzanilla yakuta ukyay aychakuna samananpaq. Ama llasata hoqhariychu.";
      } else {
        botText = language === "es"
          ? "Para malestares generales del cuerpo, te sugerimos reposar abrigado, beber infusiones tibias de Muña o Manzanilla, y aplicar paños tibios en zonas adoloridas. Si las molestias no disminuyen, consulta con nuestro personal médico."
          : "Allinmi. Tukuynin nanaykunapaqqa sumaqta samariy, q'uñita kawsay, muña o manzanilla yakukunatapas ukyay. Astawan nanasqa kaqtinqa hampiqta videoconferenciapi maskhay.";
      }

      const warningDisclaimer = language === "es"
        ? "\n\n⚠️ Importante: Recomendación basada en medicina tradicional y cuidados del hogar. Bajo ninguna circunstancia debes automedicarse con fármacos (Paracetamol, Ibuprofeno, antibióticos, etc.)."
        : "\n\n⚠️ Yachay: Kay yachaykunaqa andino hampikuykunallam. Ama paracetamol utaq ibuprofen pastillakunata ukyaychu.";

      const botMsg = {
        sender: "bot" as const,
        text: botText + warningDisclaimer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: isSevere ? ("high" as const) : undefined
      };

      setChatMessages(prev => [...prev, botMsg]);
    }, 800);
  };

  const toggleLanguage = () => {
    if (onSetLanguage) {
      onSetLanguage(language === "es" ? "qu" : "es");
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-slate-50 font-sans overflow-y-auto beautiful-scrollbar w-full relative min-h-screen">
      {/* Premium Background Banner */}
      <div className="absolute top-0 left-0 right-0 h-[220px] bg-gradient-to-br from-[#00355F] via-[#026783] to-[#0F172A] z-0 overflow-hidden rounded-b-[2.5rem] shadow-lg">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-400 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 px-4 lg:px-10 pt-4 pb-6 z-10 relative">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-1">
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white font-headline tracking-tight drop-shadow-sm">
              {dict.portalTitle}
            </h2>
            <p className="text-cyan-100/90 font-medium mt-1 text-xs md:text-sm">
              {dict.portalDesc}
            </p>
          </div>
          {portalPatient && (
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleLanguage}
                className="bg-cyan-700/50 hover:bg-cyan-600 text-white border border-cyan-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5" />
                {language === "es" ? "Runasimi (QU)" : "Español (ES)"}
              </button>
              <button 
                onClick={() => setLogout()}
                className="bg-rose-500/20 hover:bg-rose-500 text-white border border-rose-500/30 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                title={dict.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                {dict.logout}
              </button>
            </div>
          )}
        </div>

        {portalPatient ? (
          <div className="flex flex-col gap-8 animate-fade-in z-10 relative">
            
            {activeCallRoom ? (
              <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100 flex flex-col items-center h-[70vh]">
                <h3 className="text-xl font-bold text-slate-800 mb-4 font-headline flex items-center gap-2"><Video className="text-blue-500"/> Teleconsulta en Vivo</h3>
                <JitsiCall roomName={activeCallRoom} displayName={portalPatient.name} onEndCall={() => setActiveCallRoom(null)} />
              </div>
            ) : isInQueue ? (
              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 shadow-xl border border-white text-center flex flex-col items-center max-w-2xl mx-auto my-10">
                <div className="w-20 h-20 mb-6 bg-blue-100 rounded-full flex items-center justify-center animate-pulse shadow-inner">
                  <Video className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 font-headline">Buscando médico disponible...</h3>
                <p className="text-slate-500 font-medium mb-6">Por favor, no cierres esta ventana. Serás atendido en breve.</p>
                <div className="bg-blue-50 text-blue-800 px-6 py-3 rounded-2xl border border-blue-100 font-bold text-lg shadow-sm">
                  Eres el número <span className="text-2xl text-blue-600">{queuePosition}</span> en la cola
                </div>
                <button onClick={handleCancelQueue} className="mt-8 text-rose-500 font-bold hover:underline flex items-center gap-1">
                  <X className="w-4 h-4"/> Cancelar solicitud
                </button>
              </div>
            ) : (
              <>
            {/* TOP DASHBOARD WIDGETS (Horizontal Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Column 1: Profile & Allergies/Conditions */}
              <div className="flex flex-col gap-6 h-full">
                {/* 1. Profile Card */}
                <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white flex flex-col gap-6 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300 flex-grow">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-full z-0 opacity-50 transition-transform group-hover:scale-110"></div>
                  
                  <div className="relative z-10 flex items-center gap-4 border-b border-slate-100/60 pb-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-white flex-shrink-0">
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 font-headline leading-tight">{portalPatient.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                        <MapPin className="w-3 h-3 text-blue-500" /> {portalPatient.location}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-2 gap-3 text-sm mt-auto">
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3"/> DNI</span>
                      <span className="font-bold text-slate-700">{portalPatient.dni}</span>
                    </div>
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Droplets className="w-3 h-3 text-rose-400"/> {dict.blood}</span>
                      <span className="font-bold text-slate-700">{portalPatient.bloodType}</span>
                    </div>
                    <div className="col-span-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3"/> {dict.historyNum}</span>
                      <span className="font-bold text-slate-700 font-mono tracking-widest">{portalPatient.medicalHistoryNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Allergies & Conditions */}
                <div className="flex flex-col gap-6 flex-grow">
                  <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                      <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg"><AlertCircle className="w-4 h-4" /></div>
                      <h4 className="text-sm font-bold text-slate-800">{dict.allergies}</h4>
                    </div>
                    {portalPatient.allergies?.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {portalPatient.allergies.map((a: any, i: number) => (
                          <li key={i} className="text-xs font-bold bg-gradient-to-r from-orange-50 to-white text-orange-700 px-3 py-2 rounded-xl border border-orange-100/50 flex justify-between items-center">
                            <span>{a.name}</span>
                            <span className="bg-white px-2 py-0.5 rounded-md text-[9px] uppercase shadow-sm border border-orange-100">{a.severity}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium px-2">{dict.noAllergies}</p>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                      <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><ActivitySquare className="w-4 h-4" /></div>
                      <h4 className="text-sm font-bold text-slate-800">{dict.conditions}</h4>
                    </div>
                    {portalPatient.chronicConditions?.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {portalPatient.chronicConditions.map((c: any, i: number) => (
                          <li key={i} className="text-xs font-bold bg-gradient-to-r from-blue-50 to-white text-blue-700 px-3 py-2 rounded-xl border border-blue-100/50">
                            {c.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium px-2">{dict.noConditions}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Agenda & Medications */}
              <div className="flex flex-col gap-6 h-full">
                {/* 2. Agenda Card */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-5 flex-grow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <CalendarClock className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 font-headline">{dict.agendaTitle}</h3>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleImmediateAttention}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 animate-pulse-slow cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    Atención Inmediata
                  </button>
                  <button 
                    onClick={() => setIsApptModalOpen(true)}
                    className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Programar Cita
                  </button>

                  {myAppointments.length > 0 ? (
                    <div className="flex flex-col gap-3 max-h-[180px] overflow-y-auto beautiful-scrollbar pr-2 mt-2">
                      {myAppointments.map((appt, i) => {
                        const parts = appt.startTime.split(" ");
                        const hasDate = parts.length > 1 && parts[0].includes("-");
                        const datePart = hasDate ? parts[0] : new Date().toISOString().split("T")[0];
                        const timePart = hasDate ? parts.slice(1).join(" ") : appt.startTime;
                        const d = new Date(datePart + "T00:00:00");
                        const month = isNaN(d.getTime()) ? "CITA" : d.toLocaleDateString(language === "es" ? "es-ES" : "qu-PE", { month: "short" }).toUpperCase();
                        const day = isNaN(d.getTime()) ? "00" : d.getDate().toString().padStart(2, "0");

                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="bg-white shadow-sm border border-slate-200 rounded-xl py-1.5 w-12 text-center flex flex-col items-center justify-center">
                                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">{month}</span>
                                <span className="text-base font-black text-slate-800 leading-tight">{day}</span>
                              </div>
                              <div className="flex flex-col">
                                <p className="text-xs font-bold text-slate-800">{translateApptType(appt.type, language)}</p>
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-blue-500" /> {timePart || appt.startTime}
                                </p>
                                {appt.doctorName && (
                                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                    {language === "es" ? "Méd: " : "Hampiq: "}{appt.doctorName}
                                  </p>
                                )}
                              </div>
                            </div>
                            {appt.status === "Scheduled" && (
                              <button
                                onClick={() => {
                                  const safeId = appt.id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                                  setActiveCallRoom(`sqsalaappt${safeId}`);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                title="Iniciar videollamada de la cita"
                              >
                                <Video className="w-3 h-3" />
                                <span>Entrar</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 h-full min-h-[120px]">
                      <CalendarClock className="w-6 h-6 text-slate-300" />
                      <p className="text-xs text-slate-500 font-medium">{dict.noApptsDesc}</p>
                    </div>
                  )}
                </div>

                {/* 3. Active Medications */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-4 flex-grow">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Pill className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 font-headline">{dict.currentTreatment}</h3>
                  </div>
                  {activeMeds.length > 0 ? (
                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto beautiful-scrollbar pr-1">
                      {activeMeds.map((med: any, i: number) => (
                        <div key={i} className="flex flex-col bg-gradient-to-r from-purple-50/50 to-white border border-purple-100/60 p-3.5 rounded-2xl relative overflow-hidden group hover:shadow-sm transition-all">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400"></div>
                          <p className="text-sm font-bold text-purple-900">{med.name}</p>
                          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{med.dosage}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] bg-white text-purple-700 px-2 py-1 rounded-md shadow-sm border border-purple-100 font-bold uppercase tracking-wider">
                              {dict.duration}: {med.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center min-h-[120px]">
                      <Pill className="w-6 h-6 text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 italic font-medium">{dict.noMeds}</p>
                    </div>
                  )}
                </div>
              </div>


            </div>

            {/* BOTTOM SECTION: Consultation History Timeline */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6 w-full">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-headline tracking-tight">{dict.medicalHistory}</h3>
              </div>
              
              {portalPatient.consultations?.length > 0 ? (
                <div className="relative border-l-2 border-blue-100 ml-4 lg:ml-6 space-y-10 py-4">
                  {portalPatient.consultations.map((cons: any, idx: number) => (
                    <div key={idx} className="relative pl-6 lg:pl-10 group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-blue-500 ring-4 ring-white shadow-sm transition-transform group-hover:scale-125 duration-300"></div>
                      
                      {/* Date and Diagnosis */}
                      <div className="flex flex-col mb-4">
                        <span className="text-xs font-black text-blue-600 tracking-wider uppercase mb-1">
                          {new Date(cons.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <h4 className="text-xl font-bold text-slate-800">{cons.diagnosisTitle}</h4>
                      </div>

                      {/* Clinical Notes & AI Prescription Card */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
                        {cons.notes && (
                          <div className="mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <FileText className="w-3 h-3"/> {dict.medicalNotes}
                            </p>
                            <p className="text-sm text-slate-600 font-medium break-words whitespace-pre-wrap leading-relaxed">
                              {cons.notes}
                            </p>
                          </div>
                        )}
                        
                        <div className="bg-white rounded-xl border border-rose-100 p-5 shadow-sm">
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Heart className="w-3 h-3"/> {dict.aiIndications}
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium break-words">
                            {cons.quechuaSummary ? (
                              <span className="block whitespace-pre-wrap">{cons.quechuaSummary}</span>
                            ) : (
                              <>
                                Rimaykullayki unqusqanchis, <span className="font-bold text-blue-700">{portalPatient.name}</span>. Hampiy kashan:<br/><br/>
                                {cons.prescriptions && cons.prescriptions.map((p: any, i: number) => (
                                  <span key={i} className="flex items-center gap-2 mb-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> 
                                    <span className="font-bold">{p.name}:</span> {p.dosage} por {p.duration}.
                                  </span>
                                ))}
                                <span className="block mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs border border-blue-100">
                                  <strong>{dict.recommendation}:</strong> Dr. Yawar Quispepa nisqan hina puririnaykipaq sapa tutam suti unkupis kachita qispilla kawsay.
                                </span>
                              </>
                            )}
                          </p>
                        </div>


                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mb-4" />
                  <h4 className="text-lg font-bold text-slate-700 mb-1">{dict.noHistory}</h4>
                  <p className="text-sm text-slate-500 font-medium max-w-sm">{dict.noHistoryDesc}</p>
                </div>
              )}
            </div>

              </>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl text-center max-w-md mx-auto mt-12 z-10 relative">
            {loadError ? (
              <>
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 font-bold text-xl">!</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Error de Sincronización</h3>
                <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">{loadError}</p>
                <div className="flex gap-4">
                  <button onClick={fetchPatientData} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer">
                    Reintentar
                  </button>
                  <button onClick={() => setLogout()} className="bg-rose-500/20 hover:bg-rose-500 text-rose-700 border border-rose-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
                    Cerrar Sesión
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{dict.connecting}</h3>
                <p className="text-slate-500 font-medium">{dict.syncing}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Nueva Cita */}
      {isApptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-scale-up font-sans flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold font-headline text-lg">{dict.modalTitle}</h3>
              <button onClick={() => setIsApptModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleAppt} className="p-6 flex flex-col gap-4 overflow-y-auto beautiful-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{dict.specialty}</label>
                <select 
                  value={newApptForm.type}
                  onChange={(e) => setNewApptForm({ ...newApptForm, type: e.target.value, date: "", time: "" })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  <option>Medicina General</option>
                  <option>Pediatría</option>
                  <option>Obstetricia</option>
                  <option>Medicina Tradicional</option>
                  <option>Control de Presión</option>
                </select>
                <p className="text-[11px] text-cyan-700 font-semibold mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-600" />
                  {getSpecialtyScheduleText()}
                </p>
              </div>

              {/* Interactive Calendar Component */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Selecciona un Día disponible</label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                    <button 
                      type="button" 
                      onClick={prevMonth}
                      className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-700 font-headline uppercase tracking-wider">
                      {language === "es" 
                        ? `${monthsES[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`
                        : `${monthsQU[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`}
                    </span>
                    <button 
                      type="button" 
                      onClick={nextMonth}
                      className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    <span>Dom</span>
                    <span>Lun</span>
                    <span>Mar</span>
                    <span>Mie</span>
                    <span>Jue</span>
                    <span>Vie</span>
                    <span>Sab</span>
                  </div>

                  {/* Grid cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((cell, idx) => {
                      const dateStr = formatDateString(cell.date);
                      const isSelected = newApptForm.date === dateStr;
                      
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const cellDate = new Date(cell.date);
                      cellDate.setHours(0,0,0,0);
                      const isPast = cellDate < today;

                      const availableDays = getAvailableDaysForSpecialty();
                      const dayOfWeek = cell.date.getDay(); // 0 = Dom, 1 = Lun, etc.
                      const hasService = availableDays.has(dayOfWeek);

                      const isCurrentMonth = cell.monthOffset === 0;

                      let btnClasses = "h-8 w-8 text-[11px] rounded-xl flex items-center justify-center font-black transition-all ";
                      let disabled = false;

                      if (isPast) {
                        btnClasses += "text-slate-300 cursor-not-allowed bg-transparent";
                        disabled = true;
                      } else if (!hasService) {
                        btnClasses += "text-slate-300 cursor-not-allowed bg-transparent";
                        disabled = true;
                      } else if (isSelected) {
                        btnClasses += "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105 border border-blue-600";
                      } else {
                        btnClasses += "bg-blue-500/10 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-500/20 cursor-pointer";
                      }

                      if (!isCurrentMonth && !isSelected && !isPast && hasService) {
                        btnClasses += " opacity-40";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setNewApptForm(prev => ({ ...prev, date: dateStr, time: "" }));
                          }}
                          className={btnClasses}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time slots bubbles grid */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Horarios de Atención</label>
                <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto beautiful-scrollbar p-1">
                  {isLoadingSlots ? (
                    <div className="col-span-3 text-center py-4 text-xs font-semibold text-slate-400">Cargando horarios...</div>
                  ) : !newApptForm.date ? (
                    <div className="col-span-3 text-center py-4 text-xs font-semibold text-slate-400">Seleccione un día en el calendario</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="col-span-3 text-center py-4 text-xs font-semibold text-slate-400">Sin turnos disponibles este día</div>
                  ) : (
                    availableSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewApptForm(prev => ({ ...prev, time: slot }))}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          newApptForm.time === slot
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        {slot}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoadingSlots || !newApptForm.date || !newApptForm.time}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl mt-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer text-sm"
              >
                {dict.confirm}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Chatbot Button */}
      {portalPatient && !activeCallRoom && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-2xl shadow-2xl shadow-blue-500/40 hover:shadow-blue-600/50 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 cursor-pointer"
          title={language === "es" ? "Abrir asistente de síntomas" : "Symptom yanapakuqta kichay"}
        >
          <MessageSquare className="w-6 h-6" />
          {chatMessages.filter(m => m.severity === "high").length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
              {chatMessages.filter(m => m.severity === "high").length}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Window Overlay */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col animate-scale-up overflow-hidden max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-xl">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-headline leading-tight">
                  {language === "es" ? "Asistente de Síntomas" : "Symptom Yanapakuy"}
                </h3>
                <p className="text-[9px] text-white/80 font-medium">
                  {language === "es" ? "Medicina tradicional andina" : "Ande hampikuy"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message list */}
          <div className="flex-grow overflow-y-auto beautiful-scrollbar px-4 py-3 space-y-3 max-h-[350px]">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none shadow-sm"
                    : msg.severity === "high"
                    ? "bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-none shadow-sm"
                    : "bg-slate-100 text-slate-800 rounded-tl-none shadow-inner"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  {msg.severity === "high" && (
                    <button
                      type="button"
                      onClick={handleImmediateAttention}
                      className="mt-2.5 w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-102 cursor-pointer"
                    >
                      <Video className="w-3 h-3 text-white" />
                      {language === "es" ? "Unirse a Telemedicina" : "Telemedicina nisqaman yaykuy"}
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-semibold">{msg.time}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick replies suggestions */}
          <div className="border-t border-slate-100 px-4 pt-2 pb-1 shrink-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              {language === "es" ? "Sugerencias:" : "Kamachiykuna:"}
            </span>
            <div className="flex flex-wrap gap-1 mb-2">
              {language === "es" ? (
                <>
                  <button type="button" onClick={() => handleSendBotMessage("Dolor de cabeza")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Dolor de cabeza</button>
                  <button type="button" onClick={() => handleSendBotMessage("Fiebre")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Fiebre</button>
                  <button type="button" onClick={() => handleSendBotMessage("Dolor de estómago")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Dolor de estómago</button>
                  <button type="button" onClick={() => handleSendBotMessage("Tos y resfrío")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Tos y resfrío</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => handleSendBotMessage("Uma nanay")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Uma nanay</button>
                  <button type="button" onClick={() => handleSendBotMessage("Rupapakuy")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Rupapakuy</button>
                  <button type="button" onClick={() => handleSendBotMessage("Wiksa nanay")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Wiksa nanay</button>
                  <button type="button" onClick={() => handleSendBotMessage("Uhu")} className="bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold py-1 px-2 rounded-lg border border-cyan-100/50 transition-colors cursor-pointer">Uhu</button>
                </>
              )}
            </div>
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendBotMessage(chatInput); }}
            className="flex gap-1.5 items-center px-4 py-3 shrink-0 border-t border-slate-100"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={language === "es" ? "Escribe tu síntoma aquí..." : "Ima nanayniykita qillqay..."}
              className="flex-grow bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
