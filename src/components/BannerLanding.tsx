import React, { useState } from "react";
import { Language } from "../types";
import { HeartPulse, Globe, WifiOff, Cpu, DoorOpen, X, UserCheck, Stethoscope } from "lucide-react";

interface LandingProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onLogin: (user: any, token: string) => void;
}

export default function BannerLanding({ language, onSetLanguage, onLogin }: LandingProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authRole, setAuthRole] = useState<"patient" | "staff">("patient");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("Urubamba");

  const texts = {
    heroTitle: language === "es" ? "Salud Integral en el Corazón de los Andes" : "Sumaq Qhalikay Sunqunchikpi Hanan Pacha",
    heroDesc: language === "es" ? "Plataforma médica diseñada para la precisión clínica y la empatía cultural." : "Llaqtanchikpaq sumaq hampi qillqa thak-kuchpi.",
    btnStart: language === "es" ? "Iniciar Sesión" : "Llaqtaman Jaykuy",
    btnInfo: language === "es" ? "Solicitar Información" : "Willaykunata Mañay",
    bentoTitle: language === "es" ? "Precisión Ética para la Salud Rural" : "Sumaq Allin Qhali Kawsaypaq",
    b1Title: language === "es" ? "Atención Bilingüe" : "Iskay Simipi Rimay",
    b2Title: language === "es" ? "Offline First" : "K'anchay Offline-First",
    b3Title: language === "es" ? "Gestión Inteligente" : "Yachay Sapa Rurakuy",
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (authRole === "staff") {
        const res = await fetch("/api/auth/staff-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: dni, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Notify backend that this doctor is online
          if (data.user.role !== "administrator") {
            try {
              await fetch("/api/staff/status", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${data.token}`
                },
                body: JSON.stringify({ name: data.user.name, status: "online" })
              });
            } catch (e) {
              console.error("Failed to notify online status", e);
            }
          }
          onLogin(data.user, data.token);
        } else {
          setErrorMsg(data.error || "Para personal, use la contraseña: admin");
        }
        setLoading(false);
        return;
      }

      // Patient Flow API calls
      if (authMode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni, password })
        });
        const data = await res.json();
        if (data.success) {
          onLogin(data.user, data.token);
        } else {
          setErrorMsg(data.error || "Error al iniciar sesión");
        }
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dni, password, phone, location })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onLogin(data.user, data.token);
        } else {
          setErrorMsg(data.error || "Error al registrar la cuenta");
        }
      }
    } catch (e) {
      setErrorMsg("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-[#F8FAFC]">
      <nav className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-10 py-3 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center p-1.5 overflow-hidden">
            <img src="/logo.svg" alt="Sumaq Qhali" className="w-full h-full object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 font-headline">SUMAQ QHALI</h1>
            <p className="text-[10px] text-gray-500 font-sans tracking-wide uppercase font-bold">Rural Health Unit</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => onSetLanguage(language === "es" ? "qu" : "es")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === "es" ? "Español" : "Quechua"}</span>
          </button>

          <button 
            onClick={() => setShowAuthModal(true)}
            className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
          >
            <DoorOpen className="w-4 h-4" />
            <span>{texts.btnStart}</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-white border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 flex flex-col gap-6 z-10">
            <span className="w-fit bg-blue-50 border border-blue-200 text-blue-700 text-xs px-4 py-1.5 rounded-full font-bold shadow-sm">
              ✨ Portal Bilingüe de Salud v2.4
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 max-w-2xl font-headline tracking-tight leading-[1.1]">
              {texts.heroTitle}
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-xl font-sans leading-relaxed font-medium">
              {texts.heroDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
              >
                <HeartPulse className="w-4 h-4 text-blue-100" />
                {texts.btnStart}
              </button>
            </div>
          </div>

          <div className="flex-1 relative w-full h-[360px] md:h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 group">
            <img 
              alt="Medical professional in the Andes" 
              className="absolute inset-0 w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGrn7eShX_zqKnvoKI3X6lU7a-LFheKfYEtK6RIBqTG7GaIk5uS2cKqoBhjfkHmr9sbbFIPMRFB_LSSoI4sipPwUEm237wwEkbO10FDc81tDhNORCAqc_b1_WRrwPP3Ea_tpKvn4HGQ-bL5Mgzn-kFz8NnjJElf6KDwAUXMNn59DOSM_RUftIenYI5Jr_-OE3c0iztdWNtgOJBOe_LiuvgCfJZ-AL5iSz7NvK64AR-kD-jXLn9kfV4x_z5MIU-qqSAzM7jWMBj2js"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative animate-scale-up">
            <div className="absolute top-4 right-4">
              <button onClick={() => setShowAuthModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <DoorOpen className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 font-headline mb-1">
                {authMode === "login" ? "Bienvenido de vuelta" : "Crear una cuenta"}
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                {authMode === "login" ? "Ingresa tus credenciales para continuar." : "Regístrate para acceder a tus recetas clínicas."}
              </p>

              {/* Role Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button 
                  onClick={() => setAuthRole("patient")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${authRole === "patient" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  <UserCheck className="w-4 h-4" /> Paciente
                </button>
                <button 
                  onClick={() => setAuthRole("staff")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${authRole === "staff" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  <Stethoscope className="w-4 h-4" /> Personal
                </button>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold mb-4 border border-rose-100">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                {authMode === "register" && authRole === "patient" && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Nombre Completo</label>
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Ej. Juan Mamani" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Celular</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all" placeholder="Opcional" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Comunidad</label>
                        <select value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all">
                          <option>Urubamba</option>
                          <option>Pisac</option>
                          <option>Calca</option>
                          <option>Cusco</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">
                    {authRole === "staff" ? "Usuario / DNI" : "Número de DNI"}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={dni} 
                    onChange={e => setDni(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    placeholder="Ej. 45678912" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Contraseña</label>
                  <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    placeholder="••••••••" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? "Procesando..." : (authMode === "login" ? "Ingresar al Portal" : "Registrarse Ahora")}
                </button>
              </form>

              {authRole === "patient" && (
                <div className="mt-6 text-center text-xs font-medium text-slate-500">
                  {authMode === "login" ? (
                    <>¿No tienes una cuenta? <button type="button" onClick={() => setAuthMode("register")} className="text-blue-600 font-bold hover:underline">Regístrate aquí</button></>
                  ) : (
                    <>¿Ya tienes una cuenta? <button type="button" onClick={() => setAuthMode("login")} className="text-blue-600 font-bold hover:underline">Inicia sesión</button></>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
