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
  const meta = session.user.user_metadata ?? {};
  const full: string = meta.full_name || meta.name || session.user.email?.split("@")[0] || "";
  const first = full.split(" ")[0];
  const avatar: string | undefined = meta.avatar_url || meta.picture;
  return (
    <span className="flex items-center gap-2">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold uppercase text-stone-950">
          {first.slice(0, 1)}
        </span>
      )}
      <span className="max-w-20 truncate text-stone-300 sm:max-w-32">{first}</span>
      <button className="rounded-full bg-white/10 px-2.5 py-1 text-xs sm:text-sm" onClick={() => supabase.auth.signOut()} aria-label="Se déconnecter">
        <span className="sm:hidden">⎋</span><span className="hidden sm:inline">Déconnexion</span>
      </button>
    </span>
  );
}
