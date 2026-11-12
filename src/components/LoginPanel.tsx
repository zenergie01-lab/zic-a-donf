"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./Auth";

// URL de retour simple (sans paramètres) : elle doit figurer dans la liste autorisée du serveur
function returnUrl() {
  return `${window.location.origin}/connexion`;
}

export function LoginPanel() {
  const { session, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Une fois connecté : retour à la page d'origine
  useEffect(() => {
    if (!ready || !session) return;
    let retour = "/";
    try { retour = sessionStorage.getItem("zic-retour") || "/"; sessionStorage.removeItem("zic-retour"); } catch {}
    router.replace(retour.startsWith("/") && !retour.startsWith("/connexion") ? retour : "/");
  }, [ready, session, router]);

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: returnUrl(), shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError("Envoi impossible pour le moment. Réessaie dans une minute.");
    else setSent(true);
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: returnUrl() } });
    if (error) setError("Connexion Google indisponible pour le moment.");
  }

  if (ready && session) return <p className="py-10 text-center text-stone-400">Connexion réussie, redirection…</p>;

  return (
    <div className="card mx-auto mt-8 max-w-sm space-y-5 p-6">
      <div>
        <h1 className="text-2xl">Rejoindre l’écoute</h1>
        <p className="mt-1 text-sm text-stone-400">Un compte permet de noter les titres et de départager les variantes. Pas de mot de passe à retenir.</p>
      </div>

      <button onClick={google} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 font-medium text-stone-900">
        <span aria-hidden className="font-bold text-blue-600">G</span> Continuer avec Google
      </button>

      <div className="flex items-center gap-3 text-xs text-stone-500"><span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" /></div>

      {sent ? (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
          📩 Un lien de connexion a été envoyé à <b>{email}</b>. Ouvre-le sur cet appareil (pense à regarder les spams).
        </p>
      ) : (
        <form onSubmit={magicLink} className="space-y-3">
          <input className="field" type="email" required autoComplete="email" placeholder="ton@email.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn w-full" disabled={busy}>{busy ? "Envoi…" : "Recevoir un lien de connexion"}</button>
        </form>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <p className="text-xs text-stone-500">Ton email sert uniquement à te connecter. Il n’est jamais affiché ni partagé.</p>
    </div>
  );
}
