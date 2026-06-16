import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  HeartPulse, Wifi, WifiOff, LayoutDashboard, UserCheck, 
  Plus, LogOut, Globe, Building2 
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function Sidebar({ 
  language, 
  setLanguage, 
  onRegisterPatient 
}: { 
  language: "es" | "qu", 
  setLanguage: (l: "es" | "qu") => void,
  onRegisterPatient: () => void 
}) {
  const navigate = useNavigate();
  const { role, setRole, portalPatient, user, setLogout } = useAuthStore();
  const [isOffline, setIsOffline] = useState(false);

  const handleNavigation = (newRole: "doctor" | "administrator" | "patient_portal", path: string) => {
    setRole(newRole);
    navigate(path);
  };

  return (
    <aside className="w-full lg:w-56 bg-primary text-white flex flex-col border-b lg:border-b-0 lg:border-r border-[#042A46] shrink-0 lg:h-screen overflow-y-auto beautiful-scrollbar relative z-20">
      {/* Header */}
      <div className="p-6 border-b border-[#042A46] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Sumaq Qhali" className="w-6 h-6 object-contain" />
          <div>
            <h1 className="text-lg font-bold font-headline select-none">SUMAQ QHALI</h1>
            <p className="text-[10px] text-cyan-200 uppercase tracking-widest font-semibold">Bilingual EHR</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOffline(!isOffline)}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${isOffline ? "bg-rose-500 text-white" : "bg-[#0b3c64] text-cyan-300"}`}
        >
          {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
        </button>
      </div>

      {/* Profile Block */}
      <div className="p-6 border-b border-[#042A46] bg-[#002f54] flex items-center gap-3">
        <div className="relative">
          {role === "patient_portal" && portalPatient ? (
            <div className="w-12 h-12 rounded-full border-2 border-slate-50 bg-cyan-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              {portalPatient.name.charAt(0)}
            </div>
          ) : (
            <img 
              alt="Profile" 
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 bg-slate-400 shadow-md" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM5UaqUkh2sx56STozqM32WevhNLGQ_7NBw-fl5xNG78VTY3So6rcpMCqHYVuI1hTJrxQW1fh_K-88lFGYTY-ByA0eBo3d-DKNwLtECMpjFiU2gkTjRzFPluL_8Zy_wQ_Ps9UX0QVcD2I8wNjwuUdPzSA9CrP8UsTJ7gfF32jaelRi1lQTvrOLd3lC0Yey1n9vLJ8LYpzLYscBGmbfzy_hWlL_z2rKzjNcM9-wcQhwZsh6S51INIBlR1Saf0K5ekGo-yIU1gyJGfw"
            />
          )}
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-primary"></span>
        </div>
        <div className="font-sans text-white">
          <h4 className="text-sm font-bold truncate">
            {role === "patient_portal" && portalPatient ? portalPatient.name : (user?.name || "Dr. Quispe")}
          </h4>
          <p className="text-[10px] text-cyan-200">
            {role === "patient_portal" ? "Paciente Registrado" : "Director Regional Urubamba"}
          </p>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="p-4 flex-1 flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-cyan-300 uppercase tracking-widest font-semibold px-2.5 mb-1">Módulos</p>
          {role === "doctor" && (
            <button 
              onClick={() => handleNavigation("doctor", "/doctor")}
              className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer bg-white text-primary shadow-sm`}
            >
              <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4 shrink-0" />Panel Médico</span>
            </button>
          )}

          {role === "administrator" && (
            <>
              <button 
                onClick={() => handleNavigation("administrator", "/admin")}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer bg-white text-primary shadow-sm`}
              >
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4 shrink-0" />Panel Admin</span>
              </button>
              <button 
                onClick={() => handleNavigation("doctor", "/doctor")}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer hover:bg-[#002d50] text-[#cfdbe5] mt-1`}
              >
                <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4 shrink-0" />Panel Médico</span>
              </button>
              <button 
                onClick={() => handleNavigation("patient_portal", "/patient")}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer hover:bg-[#002d50] text-[#cfdbe5] mt-1`}
              >
                <span className="flex items-center gap-2"><UserCheck className="w-4 h-4 shrink-0" />Portal de Pacientes</span>
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2">
          <button 
            onClick={() => setLanguage(language === "es" ? "qu" : "es")}
            className="w-full bg-[#002b4d] border border-[#042844] hover:bg-[#00213d] flex items-center justify-between px-3 py-2 rounded-lg text-xs text-cyan-100 font-semibold cursor-pointer"
          >
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Idioma:</span>
            <span className="bg-cyan-900 border border-cyan-700 text-cyan-200 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
              {language === "es" ? "ES" : "QU"}
            </span>
          </button>

          {role === "doctor" && (
            <button 
              onClick={onRegisterPatient}
              className="w-full bg-secondary hover:bg-[#004d63] text-white flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrar Paciente
            </button>
          )}

          <button 
            onClick={async () => {
              if (user && user.name && user.role !== "patient_portal") {
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
            }}
            className="w-full border-t border-[#042A46] pt-3 flex items-center gap-2 text-xs font-semibold text-[#b8c9d6] hover:text-white transition-colors cursor-pointer text-left pl-3"
          >
            <LogOut className="w-4 h-4 text-rose-400" /> Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
