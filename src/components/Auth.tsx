"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = { session: Session | null; ready: boolean };
const AuthContext = createContext<AuthState>({ session: null, ready: false });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, ready: false });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setState({ session, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Lien vers la connexion qui ramène ensuite sur la page actuelle */
export function LoginLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      href="/connexion"
      className={className}
      onClick={() => {
        try { sessionStorage.setItem("zic-retour", window.location.pathname); } catch {}
      }}
    >
      {children}
    </Link>
  );
}

export function UserMenu() {
  const { session, ready } = useAuth();
  if (!ready) return <span className="w-20" />;
  if (!session) return <LoginLink className="rounded-full bg-white/10 px-3 py-1">Connexion</LoginLink>;
  const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0];
  return (
    <span className="flex items-center gap-2">
      <span className="hidden max-w-32 truncate text-stone-400 sm:inline">{name}</span>
      <button className="rounded-full bg-white/10 px-3 py-1" onClick={() => supabase.auth.signOut()}>
        Déconnexion
      </button>
    </span>
  );
}
