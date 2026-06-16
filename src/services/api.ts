const getHeaders = () => {
  const token = localStorage.getItem("sumaq_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export const api = {
  getPatients: async () => {
    const res = await fetch("/api/patients", { headers: getHeaders() });
    return res.ok ? res.json() : [];
  },
  getAppointments: async () => {
    const res = await fetch("/api/appointments", { headers: getHeaders() });
    return res.ok ? res.json() : [];
  },
  getRecentActivities: async () => {
    const res = await fetch("/api/recent-activities", { headers: getHeaders() });
    return res.ok ? res.json() : [];
  },
  getPatientById: async (id: string) => {
    const res = await fetch(`/api/patients/${id}`, { headers: getHeaders() });
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
    return res.json();
  },
  getQueueStatus: async (patientId: string) => {
    const res = await fetch(`/api/queue/status/${patientId}?t=${Date.now()}`, { 
      headers: getHeaders(),
      cache: 'no-store'
    });
    return res.ok ? res.json() : { status: 'none', error: 'fetch failed' };
  },
  acceptQueue: async (patientId: string, doctorName: string) => {
    const res = await fetch("/api/queue/accept", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ patientId, doctorName })
    });
    return res.json();
  },
  getQueue: async () => {
    const res = await fetch(`/api/queue?t=${Date.now()}`, { 
      headers: getHeaders(),
      cache: 'no-store'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch queue");
    return data;
  },
  leaveQueue: async (patientId: string) => {
    const res = await fetch("/api/queue/leave", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ patientId })
    });
    return res.json();
  },
  getShifts: async () => {
    const res = await fetch("/api/admin/shifts", { headers: getHeaders() });
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
  }
};
