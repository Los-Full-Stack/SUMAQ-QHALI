const fs = require('fs');
let code = fs.readFileSync('src/components/PatientPortal.tsx', 'utf8');

// 1. Remove HERO SECTION
code = code.replace(/\{\/\* HERO SECTION: Appointments \*\/\}[\s\S]*?(?=<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">)/, '');

// 2. Insert Agenda Card before Active Medications
const agendaCard = `
              {/* Agenda (Moved to Sidebar) */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 font-headline">{dict.agendaTitle}</h3>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsApptModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <CalendarClock className="w-4 h-4" />
                  {dict.agendaNew}
                </button>

                {myAppointments.length > 0 ? (
                  <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto beautiful-scrollbar pr-2">
                    {myAppointments.map((appt, i) => {
                      const parts = appt.startTime.split(" ");
                      const datePart = parts[0];
                      const timePart = parts.slice(1).join(" ");
                      const d = new Date(datePart);
                      const month = isNaN(d.getTime()) ? "MES" : d.toLocaleDateString(language === "es" ? "es-ES" : "qu-PE", { month: "short" }).toUpperCase();
                      const day = isNaN(d.getTime()) ? "00" : d.getDate().toString().padStart(2, "0");

                      return (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="bg-white shadow-sm border border-slate-200 rounded-xl py-1.5 w-14 text-center flex flex-col items-center justify-center">
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{month}</span>
                              <span className="text-lg font-black text-slate-800 leading-tight">{day}</span>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-sm font-bold text-slate-800">{appt.type || "Consulta General"}</p>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-emerald-500" /> {timePart || appt.startTime}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
                    <CalendarClock className="w-6 h-6 text-slate-300" />
                    <p className="text-xs text-slate-500 font-medium">{dict.noApptsDesc}</p>
                  </div>
                )}
              </div>

`;
code = code.replace('{/* Active Medications */}', agendaCard + '              {/* Active Medications */}');

// 3. Update col-spans
code = code.replace('lg:col-span-3 flex flex-col gap-6', 'lg:col-span-4 flex flex-col gap-6');
code = code.replace('lg:col-span-9 flex flex-col', 'lg:col-span-8 flex flex-col');

fs.writeFileSync('src/components/PatientPortal.tsx', code);
console.log('Refactor complete.');
