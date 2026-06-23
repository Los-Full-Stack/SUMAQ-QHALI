import React, { useState, useEffect } from "react";
import { Patient, Consultation, Medication, MedicalFile, Language } from "../types";
import {
  ArrowLeft, 
  AlertTriangle, 
  Activity, 
  Upload, 
  Plus, 
  Trash2, 
  Search, 
  Eye, 
  Check, 
  Sparkles,
  FileText,
  AlertCircle,
  FileImage,
  Info,
  Stethoscope,
  Pill,
  Languages
} from "lucide-react";
import { notify } from "../services/uiFeedback";
import { formatDate } from "../services/exportDocuments";

interface RecordProps {
  language: Language;
  patientId: string;
  onBack: () => void;
  onRefreshPatients: () => void;
}

export default function PatientClinicalRecord({ language, patientId, onBack, onRefreshPatients }: RecordProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "new_consultation" | "evolution">("new_consultation");
  const [loading, setLoading] = useState(true);

  // New Consultation Form state
  const [cie10Search, setCie10Search] = useState("");
  const [cie10Code, setCie10Code] = useState("");
  const [diagnosisTitle, setDiagnosisTitle] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [medications, setMedications] = useState<{ name: string; dosage: string; duration: string }[]>([
    { name: "Amoxicilina 500mg", dosage: "1 tableta cada 8 horas", duration: "7 días" }
  ]);

  // Dynamic context additions
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");

  // AI translator status
  const [aiTranslatorResult, setAiTranslatorResult] = useState("");
  const [translating, setTranslating] = useState(false);

  // Success indicator for saves
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Suggested CIE-10 lists
  const cie10Database = [
    { code: "I10", title: "Hipertensión esencial (primaria)" },
    { code: "E11.9", title: "Diabetes mellitus tipo 2 sin complicaciones" },
    { code: "J45.9", title: "Asma, no especificada" },
    { code: "M19.9", title: "Artrosis, no especificada" },
    { code: "J02.9", title: "Amigdalitis aguda, no especificada" },
    { code: "K35.8", title: "Apendicitis aguda, otra y la no especificada" }
  ];

  // Suggested Medicine database
  const medicineDatabase = [
    "Amoxicilina 500mg", "Amoxicilina 875mg + Ácido Clavulánico", 
    "Ibuprofeno 400mg", "Ibuprofeno 800mg", "Paracetamol 500mg", "Paracetamol 1g",
    "Losartán 50mg", "Enalapril 10mg", "Captopril 25mg",
    "Metformina 850mg", "Glibenclamida 5mg",
    "Omeprazol 20mg", "Pantoprazol 40mg", "Ranitidina 150mg",
    "Azitromicina 500mg", "Ciprofloxacino 500mg", "Ceftriaxona 1g",
    "Loratadina 10mg", "Cetirizina 10mg", "Clorfenamina 4mg",
    "Salbutamol Inhalador", "Bromuro de Ipratropio",
    "Prednisona 20mg", "Dexametasona 4mg", "Hidrocortisona 100mg"
  ];

  const getMedicineSuggestions = (query: string) => {
    if (!query || query.length < 2) return [];
    return medicineDatabase.filter(med => med.toLowerCase().includes(query.toLowerCase()) && med !== query);
  };

  // Fetch Patient EHR on boot / change
  const fetchPatient = async () => {
    try {
      setLoading(true);
      setLoading(true);
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch(`/api/patients/${patientId}`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      } else {
        console.error("Failed to fetch patient:", res.statusText);
      }
    } catch (e) {
      console.error("Error reading patient EHR:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  // Handle adding prescription line
  const addMedicationLine = () => {
    setMedications([...medications, { name: "", dosage: "1 tableta cada 8 horas", duration: "7 días" }]);
  };

  // Handle removing prescription line
  const removeMedicationLine = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  // Safe Prescription Line updates
  const updateMedicationLine = (idx: number, field: string, val: string) => {
    const updated = [...medications];
    updated[idx] = { ...updated[idx], [field]: val };
    setMedications(updated);
  };

  // Submit diagnosis & treatment
  const handleSaveConsultation = async () => {
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch(`/api/patients/${patientId}/consultations`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cie10Code: cie10Code || "Z00.0",
          diagnosisTitle: diagnosisTitle || "Examen médico general",
          notes: clinicalNotes,
          prescriptions: medications.filter(m => m.name.trim() !== ""),
          quechuaSummary: aiTranslatorResult
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        // Clear form
        setClinicalNotes("");
        setCie10Code("");
        setDiagnosisTitle("");
        setCie10Search("");
        setMedications([{ name: "Amoxicilina 500mg", dosage: "1 tableta cada 8 horas", duration: "7 días" }]);
        setAiTranslatorResult("");

        // Refresh EHR in view
        await fetchPatient();
        onRefreshPatients();

        // Banner timeouts and auto-close
        setTimeout(() => {
          setSaveSuccess(false);
          onBack();
        }, 2000);
      }
    } catch (e) {
      console.error(e);
      notify({ type: "error", title: "No se pudo guardar", message: "El registro clínico no fue guardado. Intenta nuevamente." });
    }
  };

  // Gemini translator integration
  const handleTranslateQuechua = async () => {
    if (!clinicalNotes && !diagnosisTitle) {
      notify({ type: "warning", title: "Falta información clínica", message: "Ingresa notas clínicas o diagnóstico antes de traducir." });
      return;
    }
    try {
      setTranslating(true);
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch("/api/gemini/summarize-quechua", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          notes: `Diagnosis: ${diagnosisTitle}. CIE-10: ${cie10Code}. Notas: ${clinicalNotes}. Tratamiento: ${medications.map(m => `${m.name} (${m.dosage} por ${m.duration})`).join(", ")}`,
          patientName: patient?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiTranslatorResult(data.translatedText);
        notify({ type: "success", title: "Traduccion completa", message: "Se genero la version bilingue completa de la indicacion clinica." });
      } else {
        const data = await res.json().catch(() => ({}));
        notify({ type: "error", title: "No se pudo traducir", message: data.error || "Revisa la sesion e intenta nuevamente." });
      }
    } catch (e) {
      console.error(e);
      notify({ type: "error", title: "No se pudo traducir", message: "El servicio de traduccion no respondio." });
    } finally {
      setTranslating(false);
    }
  };

  // Submit Allergy dynamically
  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergy.trim()) return;
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch(`/api/patients/${patientId}/allergies`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: newAllergy, severity: "low" })
      });
      if (res.ok) {
        setNewAllergy("");
        fetchPatient();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Chronic Condition dynamically
  const handleAddChronic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondition.trim()) return;
    try {
      const token = localStorage.getItem("sumaq_token");
      const res = await fetch(`/api/patients/${patientId}/chronic-conditions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: newCondition, diagnosedYear: 2026, status: "Active" })
      });
      if (res.ok) {
        setNewCondition("");
        fetchPatient();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manual & Drag-and-drop file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerFileBase64Save(file);
  };

  const triggerFileBase64Save = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem("sumaq_token");
        const res = await fetch(`/api/patients/${patientId}/files`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            type: file.type.includes("image") ? "image" : "pdf",
            fileBase64: reader.result
          })
        });
        if (res.ok) {
          fetchPatient();
        }
      } catch (e) {
        console.error("Error saving file:", e);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drop Handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    triggerFileBase64Save(file);
  };




  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#F7F9FB] py-20 font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-gray-500 font-sans">Recuperando Historia Clínica del Paciente...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-grow flex items-center justify-center p-10 font-sans">
        <div className="text-center text-red-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm font-bold font-headline">Paciente no encontrado</p>
          <button onClick={onBack} className="text-xs text-secondary mt-2 underline">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto beautiful-scrollbar bg-[#F7F9FB] p-4 md:p-10 font-sans">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-6">
        
        {/* Save success notification flag */}
        {saveSuccess && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs md:text-sm p-4 rounded-xl flex items-center gap-3 shadow-sm font-sans animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">✓</div>
            <div>
              <p className="font-bold">¡Consulta Guardada Exitosamente!</p>
              <p className="opacity-90">El registro médico y la receta se han guardado con persistencia relacional en la base de datos local.</p>
            </div>
          </div>
        )}

        {/* Action Header bar */}
        <div className="flex justify-between items-center bg-transparent">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a Pacientes</span>
          </button>
        </div>

        {/* Patient Bento block card header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-primary" />
          
          <div className="w-24 h-24 rounded-full bg-primary-container text-white border-2 border-slate-50 relative flex items-center justify-center overflow-hidden flex-shrink-0">
            {patient.avatarUrl ? (
              <img 
                src={patient.avatarUrl} 
                alt={patient.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xl font-bold">{patient.name.split(" ").map(n => n[0]).join("")}</span>
            )}
          </div>
          
          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start mb-1">
              <h2 className="text-xl md:text-2xl font-bold text-primary font-headline tracking-tight">{patient.name}</h2>
              <span className="bg-cyan-100 text-[#00637f] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {patient.status === "Active" ? "Paciente Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-sans mb-3 font-medium">Historia Clínica: {patient.medicalHistoryNumber}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Edad</p>
                <p className="text-sm text-gray-900 mt-0.5">{patient.age} años</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <p className="text-[10px] text-gray-400 uppercase">DNI</p>
                <p className="text-sm text-gray-900 mt-0.5">{patient.dni}</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <p className="text-[10px] text-gray-400 uppercase">Grupo Sanguíneo</p>
                <p className="text-sm text-gray-900 mt-0.5">{patient.bloodType}</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <p className="text-[10px] text-gray-400 uppercase">Localidad</p>
                <p className="text-sm text-gray-900 mt-0.5">{patient.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Master layouts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT side EHR view block- tab select & clinical records (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 flex scrollbar-none bg-white p-1 rounded-xl border border-gray-100">
              <button 
                onClick={() => setActiveTab("new_consultation")}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-colors cursor-pointer ${activeTab === "new_consultation" ? "bg-primary text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                Nueva Consulta
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-colors cursor-pointer ${activeTab === "history" ? "bg-primary text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                Historial Médico ({patient.consultations?.length || 0})
              </button>
            </div>

            {activeTab === "new_consultation" ? (
              <div className="flex flex-col gap-6">
                
                {/* Active Diagnosis Entry Form */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="text-base md:text-lg font-bold font-headline text-primary border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-secondary" />
                    <span>Diagnóstico Clínico Actual</span>
                  </h3>

                  {/* Filter / Choose CIE-10 diagnosis */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Código CIE-10</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input 
                          type="text"
                          value={cie10Search || cie10Code}
                          onChange={(e) => {
                            setCie10Search(e.target.value);
                            setCie10Code(e.target.value);
                          }}
                          placeholder="Buscar cód. (ej. I10, J45)"
                          className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-xs md:text-sm font-sans focus:outline-none focus:border-secondary transition-colors"
                        />
                      </div>

                      {/* Floating auto-suggestions container */}
                      {cie10Search && !cie10Code && (
                        <div className="absolute z-10 w-64 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg p-1 max-h-48 overflow-y-auto beautiful-scrollbar">
                          {cie10Database
                            .filter(d => d.code.toLowerCase().includes(cie10Search.toLowerCase()) || d.title.toLowerCase().includes(cie10Search.toLowerCase()))
                            .map((d) => (
                              <button
                                key={d.code}
                                onClick={() => {
                                  setCie10Code(d.code);
                                  setDiagnosisTitle(d.title);
                                  setCie10Search(d.code);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[11px] md:text-xs rounded font-sans flex justify-between items-center"
                              >
                                <span className="font-bold text-secondary">{d.code}</span>
                                <span className="truncate text-gray-600 ml-2">{d.title}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descripción del Diagnóstico</label>
                      <input 
                        type="text"
                        value={diagnosisTitle}
                        onChange={(e) => setDiagnosisTitle(e.target.value)}
                        placeholder="Ej. Hipertensión esencial"
                        className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs md:text-sm font-sans focus:outline-none focus:border-secondary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notas Clínicas & Observaciones</label>
                    <textarea 
                      rows={4}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Ingrese los síntomas del paciente, signos vitales y observaciones generales del examen..."
                      className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs md:text-sm font-sans focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>

                  {/* AI translation trigger block (SUMAQ QHALI core experience) */}
                  <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">Asistente de Consulta Bilingüe AI</p>
                        <p className="text-[11px] text-gray-500">¿Desea generar un resumen de instrucciones médicas adaptadas en Quechua para el paciente?</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleTranslateQuechua}
                      disabled={translating}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {translating ? "Procesando..." : "Traducir a Runa Simi (Quechua)"}
                    </button>
                  </div>

                  {/* Display Translated output */}
                  {aiTranslatorResult && (
                    <div className="bg-[#FFFDF5] border-2 border-dashed border-amber-300/60 p-4 rounded-xl flex gap-3 animate-fade-in relative">
                      <div className="absolute top-2 right-2 text-[8px] font-bold text-amber-800 uppercase tracking-widest bg-amber-100 px-1.5 py-0.5 rounded">
                        Linguistics
                      </div>
                      <Languages className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-950 font-sans leading-relaxed whitespace-pre-wrap">
                        {aiTranslatorResult}
                      </div>
                    </div>
                  )}

                </div>

                {/* Treatment & Prescription inline editor block */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h3 className="text-base font-bold font-headline text-primary flex items-center gap-2">
                      <Pill className="w-5 h-5 text-secondary" />
                      <span>Tratamiento y Receta Médica</span>
                    </h3>
                    <button 
                      onClick={addMedicationLine}
                      className="text-secondary hover:text-[#004d63] p-1.5 hover:bg-cyan-50 rounded-lg transition-all flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Agregar Línea
                    </button>
                  </div>

                  {medications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 font-sans border border-dashed border-gray-200 rounded-xl bg-gray-50">
                      No se han ingresado medicamentos. Haga clic en Agregar Línea para iniciar la receta de salida.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {medications.map((m, idx) => (
                        <div 
                          key={idx} 
                          className="bg-[#F8FAFC] p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-end"
                        >
                          <div className="flex-1 w-full relative">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Medicamento (Buscador)</label>
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                              <input 
                                type="text"
                                value={m.name}
                                onChange={(e) => updateMedicationLine(idx, "name", e.target.value)}
                                placeholder="Buscar medicina... Ej. Ibuprofeno"
                                className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-xs md:text-sm focus:outline-none focus:border-secondary transition-colors"
                              />
                            </div>
                            {m.name.length > 1 && getMedicineSuggestions(m.name).length > 0 && (
                              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 shadow-2xl rounded-lg max-h-48 overflow-y-auto beautiful-scrollbar animate-fade-in">
                                {getMedicineSuggestions(m.name).map((sug, iSug) => (
                                  <li 
                                    key={iSug}
                                    onClick={() => updateMedicationLine(idx, "name", sug)}
                                    className="px-3 py-2 text-xs md:text-sm hover:bg-cyan-50 hover:text-cyan-900 cursor-pointer border-b border-gray-50 last:border-0 font-medium text-gray-700 transition-colors"
                                  >
                                    {sug}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="w-full md:w-40">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dosis / Frecuencia</label>
                            <input 
                              type="text"
                              value={m.dosage}
                              onChange={(e) => updateMedicationLine(idx, "dosage", e.target.value)}
                              placeholder="Ej. 1 pastilla c/8 horas"
                              className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs md:text-sm focus:outline-none focus:border-secondary transition-colors"
                            />
                          </div>

                          <div className="w-full md:w-32">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duración</label>
                            <input 
                              type="text"
                              value={m.duration}
                              onChange={(e) => updateMedicationLine(idx, "duration", e.target.value)}
                              placeholder="Ej. 7 días"
                              className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs md:text-sm focus:outline-none focus:border-secondary transition-colors"
                            />
                          </div>

                          <button 
                            onClick={() => removeMedicationLine(idx)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 p-2 rounded-lg transition-colors shrink-0 mb-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <button 
                      onClick={handleSaveConsultation}
                      className="bg-primary hover:bg-[#0f4c81] text-white px-6 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                      Guardar Expediente Clínico
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* Tab History clinical timeline list output */
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-5">
                <h3 className="text-base md:text-lg font-bold font-headline text-primary border-b border-gray-100 pb-3">Consultas Médicas Anteriores</h3>
                
                {patient.consultations?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No se registran antecedentes médicos anteriores de consulta para este paciente. Use el menú Nueva Consulta para registrar el primero.
                  </div>
                ) : (
                  <div className="relative pl-6 border-l border-gray-200 flex flex-col gap-6">
                    {patient.consultations.map((c) => (
                      <div key={c.id} className="relative">
                        <div className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-white shadow-sm" />
                        
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-gray-400 font-semibold">{new Date(c.date).toLocaleDateString()} {!isNaN(new Date(c.date).getTime()) && `• ${new Date(c.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</span>
                          <span className="bg-slate-100 text-[#42474f] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">CIE-10: {c.cie10Code}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-sm font-bold text-gray-900 font-headline mb-1">{c.diagnosisTitle}</p>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium break-words">Notas: "{c.notes}"</p>

                          {c.prescriptions?.length > 0 && (
                            <div className="mt-3 border-t border-dashed border-gray-200 pt-2">
                              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Prescripciones:</p>
                              <div className="flex flex-wrap gap-2">
                                {c.prescriptions.map((m, idx) => (
                                  <span key={idx} className="bg-cyan-50 border border-cyan-100 text-cyan-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    💊 {m.name} [Frecuencia: {m.dosage}] • {m.duration}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400 font-sans text-right mt-2">Registrado por: {c.createdBy || "Dr. Yawar Quispe"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* RIGHT side side-panels context - allergies, chronic, ecography uploads (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Allergies Card component */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h4 className="text-xs font-bold text-rose-600 flex items-center gap-2 mb-4 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Alergias Registradas</span>
              </h4>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {patient.allergies?.length === 0 ? (
                  <span className="text-xs text-gray-400 font-sans">Sin alergias detectadas.</span>
                ) : (
                  patient.allergies.map(a => (
                    <span 
                      key={a.id} 
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${a.severity === "high" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-gray-100 border-gray-200 text-gray-700"}`}
                    >
                      {a.name}
                    </span>
                  ))
                )}
              </div>

              <form onSubmit={handleAddAllergy} className="mt-4 flex gap-2">
                <input 
                  type="text"
                  placeholder="Agregar alergia..."
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-secondary transition-colors"
                />
                <button 
                  type="submit"
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Chronic Conditions Card component */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h4 className="text-xs font-bold text-secondary flex items-center gap-2 mb-3 uppercase tracking-wider">
                <Activity className="w-4 h-4" />
                <span>Enfermedades Crónicas</span>
              </h4>

              <ul className="text-xs text-gray-700 font-sans flex flex-col gap-2">
                {patient.chronicConditions?.length === 0 ? (
                  <p className="text-xs text-gray-400 font-sans">Sin condiciones crónicas activas registradas.</p>
                ) : (
                  patient.chronicConditions.map(c => (
                    <li key={c.id} className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">{c.name}</p>
                        <p className="text-[10px] text-gray-400">Diag. desde: {c.diagnosedYear}</p>
                      </div>
                      <span className="text-[9px] font-bold bg-[#E6E8EA] border border-gray-300 text-gray-600 px-1.5 py-0.5 rounded">
                        {c.status === "Active" ? (language === "es" ? "Activo" : "Kachkan") : 
                         c.status === "Diagnosed" ? (language === "es" ? "Diagnosticado" : "Killasqa") :
                         (c.status === "Managed" || c.status === "Controlled") ? (language === "es" ? "Controlado" : "Allinyasqa") : c.status}
                      </span>
                    </li>
                  ))
                )}
              </ul>

              <form onSubmit={handleAddChronic} className="mt-4 flex gap-2">
                <input 
                  type="text"
                  placeholder="Nueva condición..."
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-secondary transition-colors"
                />
                <button 
                  type="submit"
                  className="bg-cyan-50 hover:bg-cyan-100 text-secondary p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Files and Imaging Card component with drag zone */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col min-h-[280px]">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-secondary" />
                  <span>Archivos Clínicos e Imágenes</span>
                </h4>
                
                {/* Simulated native upload trigger */}
                <label className="text-secondary hover:text-[#004d63] hover:bg-cyan-50 p-1 rounded-lg transition-colors cursor-pointer shrink-0">
                  <Upload className="w-4 h-4" />
                  <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                </label>
              </div>

              {/* Patient files list */}
              <div className="flex-1 flex flex-col gap-2.5">
                {patient.files?.length === 0 ? (
                  <p className="text-[11px] text-gray-400 font-sans text-center py-6">No se registran ecografías ni placas de Rayos-X para este paciente.</p>
                ) : (
                  patient.files.map(f => (
                    <div 
                      key={f.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-cyan-50 hover:border-gray-200 transition-colors cursor-pointer"
                    >
                      <div className="p-2 bg-slate-100 rounded-lg text-primary">
                        {f.type === "image" ? <FileImage className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-rose-500" />}
                      </div>
                      <div className="flex-1 min-w-0 font-sans">
                        <p className="text-xs font-bold text-gray-900 truncate">{f.name}</p>
                        <p className="text-[9px] text-gray-400">{f.size} • Uploaded: {f.uploadDate}</p>
                      </div>
                      
                      {/* Simulated preview button */}
                      <button 
                        onClick={() => notify({ type: "info", title: "Vista previa clínica", message: `Abriendo ${f.name} para previsualización.` })}
                        className="text-gray-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Drag zone container */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="mt-4 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-[#F8FAFC] opacity-75 hover:opacity-100 transition-opacity cursor-pointer group"
              >
                <Upload className="w-7 h-7 text-gray-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-[11px] font-bold text-[#42474f]">Arrastre ecografías o placas de Rayos X aquí</p>
                <p className="text-[9px] text-gray-400 mt-1">Formato: PNG, JPG, PDF</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
