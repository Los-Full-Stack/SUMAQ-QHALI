import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X, TriangleAlert } from "lucide-react";
import { ConfirmPayload, NoticePayload } from "../services/uiFeedback";

interface Notice extends NoticePayload {
  id: number;
}

const noticeStyles = {
  success: {
    icon: CheckCircle2,
    box: "border-emerald-100 bg-white text-slate-800",
    iconClass: "text-emerald-600 bg-emerald-50"
  },
  error: {
    icon: AlertCircle,
    box: "border-rose-100 bg-white text-slate-800",
    iconClass: "text-rose-600 bg-rose-50"
  },
  warning: {
    icon: TriangleAlert,
    box: "border-amber-100 bg-white text-slate-800",
    iconClass: "text-amber-600 bg-amber-50"
  },
  info: {
    icon: Info,
    box: "border-blue-100 bg-white text-slate-800",
    iconClass: "text-blue-600 bg-blue-50"
  }
};

export default function FeedbackCenter() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null);

  useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<NoticePayload>).detail;
      const id = Date.now() + Math.random();
      const nextNotice: Notice = { id, type: detail.type || "info", title: detail.title, message: detail.message };
      setNotices((current) => [...current, nextNotice].slice(-4));
      window.setTimeout(() => {
        setNotices((current) => current.filter((notice) => notice.id !== id));
      }, 4200);
    };

    const onConfirm = (event: Event) => {
      setConfirm((event as CustomEvent<ConfirmPayload>).detail);
    };

    window.addEventListener("sumaq:notify", onNotify);
    window.addEventListener("sumaq:confirm", onConfirm);
    return () => {
      window.removeEventListener("sumaq:notify", onNotify);
      window.removeEventListener("sumaq:confirm", onConfirm);
    };
  }, []);

  const closeConfirm = (accepted: boolean) => {
    if (!confirm) return;
    confirm.resolve(accepted);
    setConfirm(null);
  };

  return (
    <>
      <div className="fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 pointer-events-none">
        {notices.map((notice) => {
          const type = notice.type || "info";
          const style = noticeStyles[type];
          const Icon = style.icon;
          return (
            <div
              key={notice.id}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-xl shadow-slate-900/10 backdrop-blur-sm animate-fade-in ${style.box}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-850">{notice.title}</h4>
                  {notice.message && <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">{notice.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  aria-label="Cerrar notificación"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl shadow-slate-950/20">
            <div className="p-6">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${confirm.tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                {confirm.tone === "danger" ? <TriangleAlert className="h-6 w-6" /> : <Info className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-black text-slate-850 font-headline">{confirm.title}</h3>
              {confirm.message && <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{confirm.message}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                {confirm.cancelLabel || "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-xl px-4 py-2 text-xs font-black text-white transition-colors cursor-pointer ${confirm.tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                {confirm.confirmLabel || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
