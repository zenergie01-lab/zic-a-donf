"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { withWords } from "@/lib/lyrics";
import { positionNow, ServerClock, type SalonState } from "@/lib/salon";
import type { Variant } from "@/lib/types";
import { drawFrame, type ClipData } from "./draw";

type Loaded = Variant & { songs: { title: string } };

const ADJ_KEY = "zic-salon-adj";
const r2 = (x: number) => Math.round(x * 100) / 100;

const subscribe = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
const isPortrait = () => window.innerHeight > window.innerWidth;

/** Participant : affiche les paroles karaoké calées sur la lecture de l'animateur (sans son). */
export function SalonView({ pin }: { pin: string }) {
  const [state, setState] = useState<SalonState | null | undefined>(undefined);
  const [variant, setVariant] = useState<Loaded | null>(null);
  const [joined, setJoined] = useState(false);
  const clock = useRef(new ServerClock());
  const stateRef = useRef<SalonState | null>(null);
  // Réglage fin de CE téléphone (négatif = paroles retardées)
  const [adj, setAdj] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try { return Number(localStorage.getItem(ADJ_KEY) || 0); } catch { return 0; }
  });
  const adjRef = useRef(adj);
  const changeAdj = (v: number) => {
    const x = r2(Math.min(3, Math.max(-3, v)));
    adjRef.current = x;
    setAdj(x);
    try { localStorage.setItem(ADJ_KEY, String(x)); } catch {}
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const portrait = useSyncExternalStore(subscribe, isPortrait, () => true);

  // Interrogation de la session chaque seconde (+ recalage d'horloge)
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const t0 = Date.now() / 1000;
      const { data, error } = await supabase.rpc("get_session", { p_pin: pin });
      const t1 = Date.now() / 1000;
      if (!alive) return;
      if (error) return;
      const s = (data as SalonState[] | null)?.[0] ?? null;
      if (s) clock.current.sample(s.server_now, t0, t1);
      stateRef.current = s;
      setState(s);
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => { alive = false; clearInterval(id); };
  }, [pin]);

  // Paroles de la variante en cours
  const variantId = state?.variant_id;
  useEffect(() => {
    if (!variantId) return;
    supabase.from("variants").select("*, songs(title)").eq("id", variantId).maybeSingle()
      .then(({ data }) => setVariant(data as Loaded));
  }, [variantId]);

  const data = useMemo<ClipData | null>(() => {
    if (!variant?.lyrics_sync?.length) return null;
    return { title: variant.songs.title, lines: withWords(variant.lyrics_sync), start: 0, duration: variant.duration_seconds || 180, site: `Session ${pin}`, style: "karaoke" };
  }, [variant, pin]);

  // Dessin en continu à la position estimée
  useEffect(() => {
    if (!data || !joined) return;
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current, s = stateRef.current;
      const ctx = c?.getContext("2d");
      if (c && ctx && s) drawFrame(ctx, c.width, c.height, positionNow(s, clock.current.now()) + adjRef.current, data);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [data, joined, portrait]);

  // Écran toujours allumé pendant la session
  useEffect(() => {
    if (!joined || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const ask = () => { if (document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    ask();
    document.addEventListener("visibilitychange", ask);
    return () => { document.removeEventListener("visibilitychange", ask); lock?.release().catch(() => {}); };
  }, [joined]);

  if (state === undefined) return <p className="py-10 text-center text-stone-400">Connexion à la session {pin}…</p>;
  if (state === null)
    return (
      <div className="card mx-auto mt-10 max-w-sm space-y-3 p-6 text-center">
        <p>Session <b>{pin}</b> introuvable.</p>
        <Link href="/salon" className="btn inline-block">Saisir un autre code</Link>
      </div>
    );
  if (state.ended) return <p className="card mx-auto mt-10 max-w-sm p-6 text-center">🎶 La session {pin} est terminée. Merci d’avoir chanté !</p>;

  if (!joined)
    return (
      <div className="card mx-auto mt-10 max-w-sm space-y-4 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-amber-500">Session {pin}</p>
        <h1 className="text-3xl">{variant?.songs.title ?? "Karaoké de groupe"}</h1>
        <p className="text-stone-300">Les paroles vont défiler sur ton écran, en rythme avec la musique diffusée dans la salle. Ton téléphone ne joue pas de son.</p>
        <button
          className="btn w-full py-3 text-lg"
          onClick={() => { setJoined(true); document.documentElement.requestFullscreen?.().catch(() => {}); }}
        >
          🎤 Rejoindre
        </button>
      </div>
    );

  return (
    <div ref={wrapRef} className="flex flex-col items-center gap-3 bg-black pt-2">
      {data ? (
        <canvas
          ref={canvasRef}
          width={portrait ? 720 : 1280}
          height={portrait ? 1280 : 720}
          onDoubleClick={() => wrapRef.current?.requestFullscreen?.().catch(() => {})}
          className="h-auto max-h-[92vh] w-full max-w-[100vh] rounded-xl"
          style={{ maxWidth: portrait ? "56vh" : undefined }}
        />
      ) : (
        <p className="py-10 text-center text-stone-400">Les paroles de ce titre ne sont pas encore synchronisées.</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-stone-300">
        <span>Réglage fin :</span>
        <button className="btn-ghost px-2 py-1" onClick={() => changeAdj(adj - 0.1)} aria-label="Retarder les paroles de 0,1 seconde">⏪ Paroles en avance</button>
        <b className="w-16 text-center font-mono">{adj > 0 ? "+" : ""}{adj.toFixed(1)} s</b>
        <button className="btn-ghost px-2 py-1" onClick={() => changeAdj(adj + 0.1)} aria-label="Avancer les paroles de 0,1 seconde">Paroles en retard ⏩</button>
        {adj !== 0 && <button className="btn-ghost px-2 py-1" onClick={() => changeAdj(0)}>Réinitialiser</button>}
      </div>
      <p className="text-center text-xs text-stone-500">
        {state.playing ? "🔴 En direct avec l’animateur" : "⏸ En attente de l’animateur…"} · double-touche pour le plein écran
      </p>
    </div>
  );
}
