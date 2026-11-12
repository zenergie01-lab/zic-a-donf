"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Album, Song } from "@/lib/types";
import { AddSong } from "./AddSong";
import { Albums } from "./Albums";
import { Manage } from "./Manage";

type Tab = "add" | "albums" | "manage";

export function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [adminCheck, setAdminCheck] = useState<{ userId: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle()
      .then(({ data }) => setAdminCheck({ userId, ok: Boolean(data) }));
  }, [session]);

  const isAdmin = session && adminCheck?.userId === session.user.id ? adminCheck.ok : null;

  if (session === undefined) return <p className="py-10 text-center text-stone-400">Chargement…</p>;
  if (!session) return <Login />;
  if (isAdmin === null) return <p className="py-10 text-center text-stone-400">Vérification des droits…</p>;
  if (!isAdmin)
    return (
      <div className="card mx-auto mt-10 max-w-md space-y-3 p-6 text-center">
        <p>Ce compte ({session.user.email}) n’a pas les droits créateur.</p>
        <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </div>
    );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card mx-auto mt-10 max-w-sm space-y-3 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setMsg(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg("Connexion refusée : vérifie l’email et le mot de passe.");
        setBusy(false);
      }}
    >
      <h1 className="text-2xl">Espace créateur</h1>
      <input className="field" type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="field" type="password" required autoComplete="current-password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
      {msg && <p className="text-sm text-rose-300">{msg}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("add");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);

  const reload = useCallback(() => {
    return Promise.all([
      supabase.from("albums").select("*").order("position").order("created_at", { ascending: false }),
      supabase.from("songs").select("*, variants(*), albums(title, slug, cover_path)").order("created_at", { ascending: false }),
    ]).then(([a, s]) => {
      setAlbums((a.data as Album[]) ?? []);
      setSongs((s.data as Song[]) ?? []);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const tabs: [Tab, string][] = [["add", "Ajouter un titre"], ["albums", "Albums"], ["manage", `Mes titres (${songs.length})`]];

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Espace créateur</h1>
        <div className="flex items-center gap-3 text-sm text-stone-400">
          <span className="hidden sm:inline">{email}</span>
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === id ? "bg-amber-500 text-stone-950" : "bg-white/5"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "add" && <AddSong albums={albums} onDone={() => { reload(); setTab("manage"); }} />}
      {tab === "albums" && <Albums albums={albums} onChange={reload} />}
      {tab === "manage" && <Manage songs={songs} albums={albums} onChange={reload} />}
    </div>
  );
}
