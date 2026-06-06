import React, { useState } from "react";
import { Hospital, X } from "lucide-react";
import { api } from "../services/api";

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
    if (!form.name || !form.dni || !form.password) {
      alert("Por favor ingrese Nombre, DNI y Contraseña.");
      return;
    }
    try {
      await api.registerPatient(form);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Error registrando paciente.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-gray-200 overflow-hidden font-sans">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base md:text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Hospital className="w-5 h-5 text-secondary" /> Registrar Nuevo Paciente
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-gray-500 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre Completo *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">DNI *</label>
              <input required maxLength={10} value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} className="w-full border rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Contraseña *</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Celular</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg p-2 text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-semibold">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-semibold">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
