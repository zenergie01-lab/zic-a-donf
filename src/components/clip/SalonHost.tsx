"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { SALON_HOST, ServerClock, type HostSession } from "@/lib/salon";

const KEY = "zic-salon-host";
const LAT_KEY = "zic-salon-latency";
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Panneau animateur : lance une session, affiche le QR code et diffuse la position de lecture. */
export function SalonHost({ audio, variantId }: { audio: HTMLAudioElement | null; variantId: string }) {
  const [session, setSession] = useState<HostSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || "null") as HostSession | null;
      return s && s.variantId === variantId ? s : null;
    } catch { return null; }
  });
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const clock = useRef(new ServerClock());
  // Retard de l'enceinte (Bluetooth, TV…) : décale tout le monde pour coller au son réellement entendu
  const [latency, setLatency] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try { return Number(localStorage.getItem(LAT_KEY) || 0); } catch { return 0; }
  });
  const changeLatency = (v: number) => {
    const x = r2(Math.min(3, Math.max(0, v)));
    setLatency(x);
    try { localStorage.setItem(LAT_KEY, String(x)); } catch {}
  };

  const link = session ? `${SALON_HOST}/salon/${session.pin}` : "";

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 600, color: { dark: "#1c1917", light: "#fff6ea" } }).then(setQr);
  }, [link]);

  const push = useCallback(async () => {
    if (!session || !audio) return;
    const { error } = await supabase.rpc("update_session", {
      p_session: session.session_id,
      p_token: session.host_token,
      p_playing: !audio.paused && !audio.ended,
      p_position: Math.max(0, audio.currentTime - latency),
      p_at: clock.current.now(),
      p_variant: variantId,
    });
    if (error) setMsg("⚠️ Synchro interrompue : " + error.message);
  }, [session, audio, variantId, latency]);

  // Diffusion : à chaque action du lecteur + battement régulier
  useEffect(() => {
    if (!session || !audio) return;
    clock.current.calibrate().then(push);
    // « playing » = le son sort vraiment (après la mise en mémoire tampon), plus fiable que « play »
    const events = ["play", "playing", "pause", "waiting", "seeked", "ended", "ratechange"] as const;
    events.forEach((e) => audio.addEventListener(e, push));
    const beat = setInterval(async () => {
      const t0 = Date.now() / 1000;
      const { data } = await supabase.rpc("server_time");
      if (typeof data === "number") clock.current.sample(data, t0, Date.now() / 1000);
      push();
    }, 2000);
    return () => { events.forEach((e) => audio.removeEventListener(e, push)); clearInterval(beat); };
  }, [session, audio, push]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("start_session", { p_code: code, p_variant: variantId });
    setBusy(false);
    if (error || !data?.[0]) { setMsg(error?.message.includes("invalide") ? "Code animateur incorrect." : "Impossible de lancer la session."); return; }
    const s: HostSession = { ...data[0], variantId };
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    setSession(s);
    setBig(true);
  }

  async function end() {
    if (!session) return;
    await supabase.rpc("end_session", { p_session: session.session_id, p_token: session.host_token });
    try { sessionStorage.removeItem(KEY); } catch {}
    setSession(null); setQr(null); setBig(false); setOpen(false);
  }

  if (!session) {
    return open ? (
      <form onSubmit={start} className="card mx-auto flex max-w-xl flex-wrap items-center gap-2 p-3">
        <span className="text-sm">👥 Mode salon · code animateur :</span>
        <input className="field w-36 flex-1" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex. teddy" autoFocus autoCapitalize="off" autoComplete="off" />
        <button className="btn" disabled={busy || !code.trim()}>{busy ? "…" : "Lancer"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
        {msg && <p className="w-full text-sm text-rose-300">{msg}</p>}
      </form>
    ) : (
      <div className="text-center">
        <button className="btn-ghost text-sm" onClick={() => setOpen(true)}>👥 Mode salon : faire suivre les paroles sur les téléphones</button>
      </div>
    );
  }

  return (
    <>
      <div className="card mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 border-amber-500/40 p-3 text-sm">
        <span>👥 Session <b className="font-mono text-lg text-amber-300">{session.pin}</b> · les téléphones suivent ta lecture</span>
        <span className="flex gap-2">
          <button className="btn" onClick={() => setBig(true)}>Afficher le QR</button>
          <button className="btn-ghost" onClick={end}>Terminer</button>
        </span>
        <span className="flex w-full flex-wrap items-center gap-2 text-xs text-stone-300">
          🔈 Retard de l’enceinte :
          <button className="btn-ghost px-2 py-0.5" onClick={() => changeLatency(latency - 0.05)}>−</button>
          <b className="w-14 text-center font-mono">{latency.toFixed(2)} s</b>
          <button className="btn-ghost px-2 py-0.5" onClick={() => changeLatency(latency + 0.05)}>+</button>
          <button className="btn-ghost px-2 py-0.5" onClick={() => changeLatency(0)}>Filaire 0</button>
          <button className="btn-ghost px-2 py-0.5" onClick={() => changeLatency(0.25)}>Bluetooth 0,25</button>
          <span className="w-full text-stone-500">Si tous les téléphones sont en avance sur le son, augmente cette valeur.</span>
        </span>
        {msg && <p className="w-full text-xs text-amber-200">{msg}</p>}
      </div>
      {big && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-[#0f0d0b]/95 p-6 text-center" onClick={() => setBig(false)}>
          <p className="font-serif text-3xl">Scanne pour suivre les paroles 🎤</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt={`QR code de la session ${session.pin}`} className="w-[min(70vw,60vh)] rounded-2xl" />}
          <p className="text-stone-300">ou va sur <b>{SALON_HOST.replace("https://", "")}/salon</b> et tape</p>
          <p className="font-mono text-6xl tracking-[0.3em] text-amber-400">{session.pin}</p>
          <p className="text-xs text-stone-500">Touchez l’écran pour revenir au karaoké</p>
        </div>
      )}
    </>
  );
}
