"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { publicUrl, supabase } from "@/lib/supabase";
import { cleanLyrics, fmtTime, parseTime } from "@/lib/lyrics";
import type { SyncLine, Variant } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useAuth } from "@/components/Auth";
import { drawFrame, type ClipData } from "./draw";

type Loaded = Variant & { songs: { title: string; slug: string; lyrics: string | null } };

const SITE = "zic-a-donf.vercel.app";
const MIMES = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];

export function ClipStudio({ variantId }: { variantId: string }) {
  const { session, ready } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [v, setV] = useState<Loaded | null>(null);
  const [lines, setLines] = useState<SyncLine[]>([]);
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(45);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tapIndex, setTapIndex] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [video, setVideo] = useState<{ url: string; name: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chargement : droits + variante
  useEffect(() => {
    if (!session) return;
    supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
    supabase.from("variants").select("*, songs(title, slug, lyrics)").eq("id", variantId).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setMsg("Variante introuvable"); return; }
        const d = data as Loaded;
        setV(d);
        setLines(d.lyrics_sync?.length ? d.lyrics_sync : cleanLyrics(d.songs.lyrics).map((text) => ({ t: null, text })));
        setStart(Number(d.short_start ?? 0));
        setDuration(Number(d.short_duration ?? 45));
      });
  }, [session, variantId]);

  const clip = useCallback((): ClipData => ({
    title: v?.songs.title ?? "",
    lines: lines.filter((l) => l.t != null).sort((a, b) => a.t! - b.t!),
    start, duration, site: SITE,
  }), [v, lines, start, duration]);

  // Aperçu : redessine en continu à l'heure du lecteur
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current, a = audioRef.current;
      if (c && a) {
        const ctx = c.getContext("2d");
        if (ctx) drawFrame(ctx, c.width, c.height, a.currentTime, clip());
        setNow(a.currentTime);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clip]);

  // Mode tap : Espace = « cette ligne commence maintenant »
  const tap = useCallback(() => {
    const a = audioRef.current;
    if (tapIndex == null || !a) return;
    const t = Math.round(a.currentTime * 10) / 10;
    setLines((ls) => ls.map((l, i) => (i === tapIndex ? { ...l, t } : l)));
    setTapIndex((i) => (i != null && i + 1 < lines.length ? i + 1 : null));
  }, [tapIndex, lines.length]);

  useEffect(() => {
    if (tapIndex == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tapIndex, tap]);

  if (!ready) return <p className="py-10 text-center text-stone-400">Chargement…</p>;
  if (!session || isAdmin === false) return <p className="py-10 text-center">Réservé au créateur. <Link href="/admin" className="text-amber-400">Se connecter</Link></p>;
  if (!v) return <p className="py-10 text-center text-stone-400">{msg ?? "Chargement…"}</p>;

  const audioUrl = publicUrl("zic-audio", v.audio_path) ?? "";
  const setLine = (i: number, patch: Partial<SyncLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const playFrom = (t: number) => { const a = audioRef.current; if (a) { a.currentTime = Math.max(0, t); a.play(); } };
  const current = (() => { let k = -1; lines.forEach((l, i) => { if (l.t != null && l.t <= now) k = i; }); return k; })();

  async function autoSync() {
    setBusy("Synchro IA en cours (30 s à 1 min)…"); setMsg(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/align", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ variantId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error + (body.detail ? ` — ${body.detail}` : ""));
      setLines(body.lines);
      setMsg(`✅ ${body.found}/${body.total} lignes calées automatiquement. Vérifie en écoutant, puis corrige avec ⏱ ou ±.`);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  async function save() {
    setBusy("Enregistrement…");
    const { error } = await supabase.from("variants").update({ lyrics_sync: lines, short_start: start, short_duration: duration }).eq("id", variantId);
    setBusy(null);
    setMsg(error ? `❌ ${error.message}` : "✅ Synchro et réglages enregistrés");
  }

  async function exportVideo() {
    const mime = MIMES.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
    if (!mime) { setMsg("❌ Ce navigateur ne sait pas enregistrer de vidéo. Utilise Chrome ou Edge sur ordinateur."); return; }
    audioRef.current?.pause();
    setVideo(null);
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const data = clip();

    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.src = audioUrl;
    a.preload = "auto";
    try {
      setBusy("Préparation de l’audio…");
      await new Promise<void>((ok, ko) => { a.oncanplaythrough = () => ok(); a.onerror = () => ko(new Error("Audio inaccessible")); a.load(); });
      a.currentTime = start;
      await new Promise((ok) => { a.onseeked = ok; });

      const ac = new AudioContext();
      const src = ac.createMediaElementSource(a);
      const gain = ac.createGain();
      const dest = ac.createMediaStreamDestination();
      src.connect(gain); gain.connect(dest); gain.connect(ac.destination);
      const end = Math.min(start + duration, a.duration || start + duration);
      const len = end - start;
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(1, ac.currentTime + 0.8);           // fondu d'entrée
      gain.gain.setValueAtTime(1, ac.currentTime + Math.max(0.9, len - 1.5));
      gain.gain.linearRampToValueAtTime(0, ac.currentTime + len);           // fondu de sortie

      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((ok) => { rec.onstop = () => ok(); });

      drawFrame(ctx, W, H, start, data);
      rec.start(1000);
      await a.play();
      await new Promise<void>((ok) => {
        const step = () => {
          drawFrame(ctx, W, H, a.currentTime, data);
          setBusy(`🎬 Enregistrement… ${Math.round(a.currentTime - start)} / ${Math.round(len)} s — garde cet onglet au premier plan`);
          if (a.currentTime >= end || a.ended) ok(); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      a.pause();
      rec.stop();
      await done;
      await ac.close();
      const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mime.split(";")[0] });
      setVideo({ url: URL.createObjectURL(blob), name: `${slugify(v!.songs.title)}-${slugify(v!.label)}-short.${ext}` });
      setMsg(`✅ Vidéo prête (${(blob.size / 1048576).toFixed(1)} Mo, ${ext.toUpperCase()}).`);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const synced = lines.filter((l) => l.t != null).length;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-amber-400">← Espace créateur</Link>
          <h1 className="text-3xl">Clip · {v.songs.title} <span className="text-stone-400">({v.label})</span></h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={autoSync} disabled={!!busy}>🤖 Synchro auto (IA)</button>
          <button className="btn-ghost" onClick={() => { setTapIndex(0); playFrom(0); }} disabled={!!busy || !lines.length}>⌨ Mode tap</button>
          <button className="btn" onClick={save} disabled={!!busy}>Enregistrer</button>
        </div>
      </div>

      {(busy || msg) && <p className="card p-3 text-sm">{busy ?? msg}</p>}
      {tapIndex != null && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-500/50 p-3 text-sm">
          <span>Appuie sur <b>Espace</b> (ou le bouton) au début de : <b className="text-amber-300">« {lines[tapIndex]?.text} »</b></span>
          <span className="flex gap-2">
            <button className="btn" onClick={tap}>Maintenant !</button>
            <button className="btn-ghost" onClick={() => setTapIndex(null)}>Arrêter</button>
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" controls preload="metadata" className="w-full" />
          <p className="text-xs text-stone-400">{synced}/{lines.length} lignes calées · position {fmtTime(now)}</p>
          {lines.length === 0 && <p className="text-sm text-rose-300">Pas de paroles : ajoute-les au titre dans « Mes titres ».</p>}
          <ol className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {lines.map((l, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${i === current ? "bg-amber-500/15" : ""}`}>
                <button className="icon-btn h-8 min-h-8 w-8 min-w-8 bg-white/5 text-xs" title="Écouter depuis cette ligne" onClick={() => playFrom((l.t ?? 0) - 1)}>▶</button>
                <input
                  key={`t-${i}-${l.t}`}
                  className="field w-24 px-2 py-1 font-mono text-xs"
                  defaultValue={l.t == null ? "" : fmtTime(l.t)}
                  placeholder="--:--.-"
                  onBlur={(e) => setLine(i, { t: e.target.value.trim() ? parseTime(e.target.value) : null })}
                />
                <button className="btn-ghost px-2 py-1 text-xs" title="Caler sur la position actuelle" onClick={() => setLine(i, { t: Math.round((audioRef.current?.currentTime ?? 0) * 10) / 10 })}>⏱</button>
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => l.t != null && setLine(i, { t: Math.max(0, Math.round((l.t - 0.2) * 10) / 10) })}>−</button>
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => l.t != null && setLine(i, { t: Math.round((l.t + 0.2) * 10) / 10 })}>+</button>
                <input className="field flex-1 px-2 py-1 text-sm" value={l.text} onChange={(e) => setLine(i, { text: e.target.value })} />
              </li>
            ))}
          </ol>
        </div>

        <aside className="space-y-4">
          <canvas ref={canvasRef} width={540} height={960} className="w-full rounded-xl border border-white/10" />
          <div className="card space-y-3 p-4 text-sm">
            <p className="font-medium">Extrait Short (9:16)</p>
            <label className="flex items-center justify-between gap-2">
              Début
              <span className="flex gap-1">
                <input key={`s-${start}`} className="field w-24 px-2 py-1 font-mono text-xs" defaultValue={fmtTime(start)} onBlur={(e) => setStart(parseTime(e.target.value) ?? start)} />
                <button className="btn-ghost px-2 py-1 text-xs" title="Début = position actuelle" onClick={() => setStart(Math.round((audioRef.current?.currentTime ?? 0) * 10) / 10)}>⏱</button>
              </span>
            </label>
            <label className="block space-y-1">
              <span className="flex justify-between">Durée <b>{duration} s</b></span>
              <input type="range" min={15} max={90} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-amber-500" />
            </label>
            <button className="btn-ghost w-full" onClick={() => playFrom(start)}>▶ Prévisualiser l’extrait</button>
            <button className="btn w-full" onClick={exportVideo} disabled={!!busy || !synced}>🎬 Créer la vidéo</button>
            {video && (
              <a href={video.url} download={video.name} className="btn-ghost block text-center">⬇ Télécharger {video.name.split(".").pop()?.toUpperCase()}</a>
            )}
            <p className="text-xs text-stone-500">L’enregistrement dure le temps de l’extrait, son audible. Garde l’onglet affiché jusqu’à la fin.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
