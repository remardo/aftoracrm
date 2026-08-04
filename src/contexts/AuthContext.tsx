import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import supabase from '../lib/supabase';
import { api } from '../lib/api';
import { signInWithGoogle } from '../lib/googleAuth';
import type { Profile } from '../lib/types';

interface AuthValue {
  profile: Profile | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  google: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({} as AuthValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const p = await api.get<Profile>('/api/auth');
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;

    const applySession = (nextSession: any) => {
      setSession(nextSession);
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      refreshTimer = window.setTimeout(() => {
        void refresh().finally(() => {
          if (active) setLoading(false);
        });
      }, 0);
    };

    supabase.auth.getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => applySession(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => applySession(s));
    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      subscription.unsubscribe();
    };
  }, [refresh]);

  const value: AuthValue = {
    profile, session, loading,
    signIn: async (email, password) => { const r = await supabase.auth.signInWithPassword({ email, password }); if (r.error) throw r.error; return r.data; },
    signUp: async (email, password) => { const r = await supabase.auth.signUp({ email, password }); if (r.error) throw r.error; return r.data; },
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); setSession(null); },
    google: () => signInWithGoogle('Aftora CRM'),
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
