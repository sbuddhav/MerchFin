import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('merchfin_token'),
  isLoading: true,

  login: async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token, user } = res.data;
    localStorage.setItem('merchfin_token', token);
    set({ token, user, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('merchfin_token');
    set({ user: null, token: null, isLoading: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('merchfin_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const res = await authApi.me();
      set({ user: res.data.user, isLoading: false });
    } catch {
      localStorage.removeItem('merchfin_token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
