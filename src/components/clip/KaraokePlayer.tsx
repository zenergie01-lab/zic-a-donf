"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { publicUrl, supabase } from "@/lib/supabase";
import { withWords } from "@/lib/lyrics";
import type { Variant } from "@/lib/types";
import { usePlayer } from "@/components/Player";
import { drawFrame, type ClipData } from "./draw";

type Loaded = Variant & { songs: { title: string; slug: string } };

const subscribe = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
const isPortrait = () => window.innerHeight > window.innerWidth;

export function KaraokePlayer({ variantId }: { variantId: string }) {
  const [v, setV] = useState<Loaded | null | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const portrait = useSyncExternalStore(subscribe, isPortrait, () => false);
  const global = usePlayer();

  useEffect(() => {
    supabase.from("variants").select("*, songs(title, slug)").eq("id", variantId).maybeSingle()
      .then(({ data }) => setV((data as Loaded) ?? null));
  }, [variantId]);

  const data = useMemo<ClipData | null>(() => {
    if (!v?.lyrics_sync?.length) return null;
    return { title: v.songs.title, lines: withWords(v.lyrics_sync), start: 0, duration: dur || v.duration_seconds || 180, site: "zic-zic.eclairerlinvisible.org", style: "karaoke" };
  }, [v, dur]);

  useEffect(() => {
    if (!data) return;
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current, a = audioRef.current;
      const ctx = c?.getContext("2d");
      if (c && a && ctx) drawFrame(ctx, c.width, c.height, a.currentTime, data);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [data, portrait]);

  if (v === undefined) return <p className="py-10 text-center text-stone-400">Chargement…</p>;
  if (!v || !data) return <p className="py-10 text-center">Ce karaoké n’est pas encore disponible. <Link href="/" className="text-amber-400">Retour</Link></p>;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { if (global.playing) global.toggle(); a.play(); } else a.pause();
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/titre/${v.songs.slug}`} className="text-sm text-amber-400">← {v.songs.title}</Link>
          <h1 className="text-3xl">🎤 Karaoké <span className="text-stone-400">· {v.label}</span></h1>
        </div>
        <button className="btn-ghost text-sm" onClick={() => wrapRef.current?.requestFullscreen?.()}>⛶ Plein écran</button>
      </div>
      <div ref={wrapRef} className="relative mx-auto flex items-center justify-center bg-black" style={{ maxWidth: portrait ? 480 : "100%" }}>
        <canvas
          ref={canvasRef}
          width={portrait ? 720 : 1280}
          height={portrait ? 1280 : 720}
          onClick={toggle}
          className="h-auto max-h-[100vh] w-full cursor-pointer rounded-xl"
        />
        {!playing && (
          <button onClick={toggle} aria-label="Lancer le karaoké"
            className="icon-btn absolute h-20 w-20 bg-amber-500 text-3xl text-stone-950 shadow-2xl">▶</button>
        )}
      </div>
      <audio
        ref={audioRef}
        src={publicUrl("zic-audio", v.audio_path) ?? ""}
        crossOrigin="anonymous"
        controls
        preload="auto"
        className="mx-auto w-full max-w-xl"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
      />
      <p className="text-center text-xs text-stone-500">Les mots s’allument au rythme du chant. Les points ● ● ● annoncent la reprise : 3, 2, 1… chante !</p>
    </div>
  );
}
