import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  HeartPulse, Wifi, WifiOff, LayoutDashboard, UserCheck, 
  Plus, LogOut, Globe, Building2 
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function TopNavbar({ 
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

  const logout = async () => {
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
  };

  return (
    <header className="w-full h-16 bg-primary text-white flex items-center justify-between px-4 md:px-8 border-b border-[#042A46] shrink-0 shadow-sm z-20">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Sumaq Qhali" className="w-6 h-6 object-contain" />
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold font-headline select-none leading-tight">SUMAQ QHALI</h1>
          <p className="text-[10px] text-cyan-200 uppercase tracking-widest font-semibold leading-none">Bilingual EHR</p>
        </div>
      </div>

      {/* Navigation Links (Center) */}
      <div className="flex-1 flex items-center justify-center px-4">
        {role !== "patient_portal" && (
          <div className="flex gap-1 md:gap-2">
            <button 
              onClick={() => handleNavigation("doctor", "/doctor")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${role === 'doctor' ? 'bg-[#002d50] text-cyan-300' : 'text-slate-300 hover:bg-[#002d50]/50 hover:text-white'}`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Panel Médico</span>
            </button>
            <button 
              onClick={() => handleNavigation("administrator", "/admin")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${role === 'administrator' ? 'bg-[#002d50] text-cyan-300' : 'text-slate-300 hover:bg-[#002d50]/50 hover:text-white'}`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Panel Admin</span>
            </button>
            <button 
              onClick={() => handleNavigation("patient_portal", "/patient")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer hover:bg-[#002d50]/50 text-slate-300 hover:text-white`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Portal Pacientes</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Register Patient Button */}
        {role === "doctor" && (
          <button 
            onClick={onRegisterPatient}
            className="bg-secondary hover:bg-[#004d63] text-white flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold shadow-sm cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> <span className="hidden md:inline">Registrar</span>
          </button>
        )}

        {/* Language Switcher */}
        <button 
          onClick={() => setLanguage(language === "es" ? "qu" : "es")}
          className="bg-[#002b4d] border border-[#042844] hover:bg-[#00213d] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-cyan-100 font-semibold cursor-pointer transition-colors"
          title="Cambiar Idioma"
        >
          <Globe className="w-4 h-4" />
          <span className="bg-cyan-900 border border-cyan-700 text-cyan-200 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
            {language === "es" ? "ES" : "QU"}
          </span>
        </button>

        {/* Connection Toggle */}
        <button 
          onClick={() => setIsOffline(!isOffline)}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${isOffline ? "bg-rose-500 text-white" : "bg-[#0b3c64] text-cyan-300 hover:bg-[#002b4d]"}`}
          title={isOffline ? "Reconectar a la red" : "Simular desconexión"}
        >
          {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
        </button>

        <div className="w-px h-6 bg-[#042A46] mx-1"></div>

        {/* Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {role === "patient_portal" && portalPatient ? (
              <div className="w-8 h-8 rounded-full border border-slate-50 bg-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {portalPatient.name.charAt(0)}
              </div>
            ) : (
              <img 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-slate-50 bg-slate-400 shadow-md" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM5UaqUkh2sx56STozqM32WevhNLGQ_7NBw-fl5xNG78VTY3So6rcpMCqHYVuI1hTJrxQW1fh_K-88lFGYTY-ByA0eBo3d-DKNwLtECMpjFiU2gkTjRzFPluL_8Zy_wQ_Ps9UX0QVcD2I8wNjwuUdPzSA9CrP8UsTJ7gfF32jaelRi1lQTvrOLd3lC0Yey1n9vLJ8LYpzLYscBGmbfzy_hWlL_z2rKzjNcM9-wcQhwZsh6S51INIBlR1Saf0K5ekGo-yIU1gyJGfw"
              />
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-primary"></span>
          </div>
          
          <button 
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer p-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
