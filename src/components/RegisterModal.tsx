import React, { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { api } from "../services/api";
import { notify } from "../services/uiFeedback";

export default function RegisterModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [form, setForm] = useState({
    name: "", dni: "", age: "", gender: "Masculino", 
    bloodType: "O+", location: "Urubamba", email: "", phone: "", password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.dni) {
      notify({ type: "warning", title: "Datos incompletos", message: "Ingresa nombre completo y DNI para registrar al paciente." });
      return;
    }
    const payload = {
      ...form,
      password: form.password || form.dni
    };
    try {
      await api.registerPatient(payload);
      notify({ type: "success", title: "Paciente registrado", message: "La historia clínica fue creada correctamente." });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      notify({ type: "error", title: "No se pudo registrar", message: err.message || "Revisa los datos e intenta nuevamente." });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden font-sans transition-all duration-300">
        <div className="p-5 bg-slate-50 border-b border-slate-200/60 flex justify-between items-center">
          <h3 className="text-base md:text-lg font-bold font-headline text-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-secondary" /> Registrar Nuevo Paciente
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto beautiful-scrollbar pr-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">DNI *</label>
              <input required maxLength={10} value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Edad</label>
              <input type="number" placeholder="Ej: 35" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Género</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none bg-white transition-all">
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grupo Sanguíneo</label>
              <select value={form.bloodType} onChange={e => setForm({...form, bloodType: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none bg-white transition-all">
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Localidad / Comunidad</label>
              <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none bg-white transition-all">
                <option value="Urubamba">Urubamba</option>
                <option value="Pisac">Pisac</option>
                <option value="Calca">Calca</option>
                <option value="Paucartambo">Paucartambo</option>
                <option value="Andahuaylas">Andahuaylas</option>
                <option value="Cusco">Cusco</option>
                <option value="Otro">Otro / Comunidad Lejana</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Celular</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input type="email" placeholder="paciente@correo.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none transition-all" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contraseña (Opcional)</label>
              <input type="password" placeholder="Por defecto será su DNI" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-sans focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 bg-primary hover:bg-[#062944] text-white rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
