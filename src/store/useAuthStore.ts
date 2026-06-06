import { create } from 'zustand';
import { Role, Patient } from '../types';

interface AuthState {
  isLoggedIn: boolean;
  role: Role;
  token: string | null;
  user: any | null;
  portalDni: string;
  portalPatient: Patient | null;
  isCallActive: boolean;
  setLogin: (user: any, token: string) => void;
  setLogout: () => void;
  setRole: (role: Role) => void;
  setPortalPatient: (patient: Patient | null) => void;
  setPortalDni: (dni: string) => void;
  setIsCallActive: (active: boolean) => void;
}

// Read persisted session synchronously at store creation time
// This is the SINGLE source of truth for initial auth state
function getInitialAuth(): { isLoggedIn: boolean; user: any | null; token: string | null; role: Role; portalDni: string } {
  try {
    const saved = localStorage.getItem("sumaq_user");
    const token = localStorage.getItem("sumaq_token");
    if (saved && token) {
      const user = JSON.parse(saved);
      return {
        isLoggedIn: true,
        user,
        token,
        role: user.role || 'doctor',
        portalDni: user.dni || ''
      };
    }
  } catch (e) {
    // Corrupted localStorage — wipe it
    localStorage.removeItem("sumaq_user");
    localStorage.removeItem("sumaq_token");
  }
  return { isLoggedIn: false, user: null, token: null, role: 'doctor', portalDni: '' };
}

const initial = getInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: initial.isLoggedIn,
  role: initial.role,
  token: initial.token,
  user: initial.user,
  portalDni: initial.portalDni,
  portalPatient: null,
  isCallActive: false,
  setLogin: (user, token) => {
    localStorage.setItem("sumaq_user", JSON.stringify(user));
    localStorage.setItem("sumaq_token", token);
    set({ isLoggedIn: true, user, role: user.role || 'doctor', token, portalDni: user.dni || '' });
  },
  setLogout: () => {
    localStorage.removeItem("sumaq_user");
    localStorage.removeItem("sumaq_token");
    set({ isLoggedIn: false, user: null, token: null, role: 'doctor', portalDni: '', portalPatient: null, isCallActive: false });
  },
  setRole: (role) => set({ role }),
  setPortalPatient: (portalPatient) => set({ portalPatient }),
  setPortalDni: (portalDni) => set({ portalDni }),
  setIsCallActive: (isCallActive) => set({ isCallActive })
}));
