import { useAuthStore } from "../store/useAuthStore";

const getHeaders = () => {
  const token = localStorage.getItem("sumaq_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

const handleAuthError = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    useAuthStore.getState().setLogout();
    throw new Error(data.error || "Sesión expirada. Inicia sesión nuevamente.");
  }
  return data;
};

export const api = {
  getPatients: async () => {
    const res = await fetch("/api/patients", { headers: getHeaders() });
    if (res.status === 401) return handleAuthError(res);
    return res.ok ? res.json() : [];
  },
  getAppointments: async () => {
    const res = await fetch("/api/appointments", { headers: getHeaders() });
    if (res.status === 401) return handleAuthError(res);
    return res.ok ? res.json() : [];
  },
  getRecentActivities: async () => {
    const res = await fetch("/api/recent-activities", { headers: getHeaders() });
    if (res.status === 401) return handleAuthError(res);
    return res.ok ? res.json() : [];
  },
  getPatientById: async (id: string) => {
    const res = await fetch(`/api/patients/${id}`, { headers: getHeaders() });
    if (res.status === 401) return handleAuthError(res);
    return res.ok ? res.json() : null;
  },
  registerPatient: async (data: any) => {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const resData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resData.error || "Error registering patient");
    return resData;
  },
  scheduleAppointment: async (data: any) => {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Error scheduling appointment");
    return res.json();
  },
  joinQueue: async (patientId: string, name: string, location: string) => {
    const res = await fetch("/api/queue/join", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ patientId, name, location })
    });
    if (res.status === 401) return handleAuthError(res);
    return res.json();
  },
  getQueueStatus: async (patientId: string) => {
    const res = await fetch(`/api/queue/status/${patientId}?t=${Date.now()}`, { 
      headers: getHeaders(),
      cache: 'no-store'
    });
    if (res.status === 401) return handleAuthError(res);
    return res.ok ? res.json() : { status: 'none', error: 'fetch failed' };
  },
  acceptQueue: async (patientId: string, doctorName: string) => {
    const res = await fetch("/api/queue/accept", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ patientId, doctorName })
    });
    if (res.status === 401) return handleAuthError(res);
    return res.json();
  },
  getQueue: async () => {
    const res = await fetch(`/api/queue?t=${Date.now()}`, { 
      headers: getHeaders(),
      cache: 'no-store'
    });
    const data = await handleAuthError(res);
    if (!res.ok) throw new Error(data.error || "Failed to fetch queue");
    return data;
  },
  leaveQueue: async (patientId: string) => {
    const res = await fetch("/api/queue/leave", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ patientId })
    });
    if (res.status === 401) return handleAuthError(res);
    return res.json();
  },
  getShifts: async () => {
    const res = await fetch("/api/admin/shifts", { headers: getHeaders() });
    if (res.status === 401) return handleAuthError(res);
    return res.ok ? res.json() : [];
  },
  addShift: async (data: any) => {
    const res = await fetch("/api/admin/shifts", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Failed to add shift");
    return resData;
  },
  deleteShift: async (id: string) => {
    const res = await fetch(`/api/admin/shifts/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Failed to delete shift");
    return resData;
  },
  getAgentReports: async () => {
    const res = await fetch("/api/admin/agent-reports", { headers: getHeaders() });
    const resData = await handleAuthError(res);
    if (!res.ok) throw new Error(resData.error || "Failed to fetch reports list");
    return resData;
  },
  getAgentReportById: async (id: string) => {
    const res = await fetch(`/api/admin/agent-reports/${id}`, { headers: getHeaders() });
    const resData = await handleAuthError(res);
    if (!res.ok) throw new Error(resData.error || "Failed to fetch report detail");
    return resData;
  },
  triggerAgentReport: async () => {
    const res = await fetch("/api/admin/agent-reports/trigger", {
      method: "POST",
      headers: getHeaders()
    });
    let resData;
    try {
      resData = await res.json();
    } catch (e) {
      if (!res.ok) {
        throw new Error(`El servidor retornó un error con código ${res.status}`);
      }
      throw new Error("La respuesta del servidor no es un JSON válido.");
    }
    if (!res.ok) throw new Error(resData.error || "Failed to trigger report generation");
    return resData;
  }
};
