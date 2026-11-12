"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Track } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type PlayerState = {
  current: Track | null;
  playing: boolean;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  toggle: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer doit être utilisé dans <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const current = queue[index] ?? null;

  // Change de source quand la piste courante change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.audioUrl;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [current]);

  // Infos sur l'écran verrouillé du téléphone
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: `Zic à donf · ${current.label}`,
      artwork: current.coverUrl ? [{ src: current.coverUrl, sizes: "512x512" }] : [],
    });
  }, [current]);

  const playQueue = useCallback((tracks: Track[], startIndex = 0) => {
    if (!tracks.length) return;
    const same = queue[index]?.variantId === tracks[startIndex]?.variantId;
    if (same) {
      audioRef.current?.play();
      return;
    }
    setQueue(tracks);
    setIndex(startIndex);
  }, [queue, index]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, [current]);

  const next = useCallback(() => setIndex((i) => (i + 1 < queue.length ? i + 1 : i)), [queue.length]);
  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) audio.currentTime = 0;
    else setIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [next, prev]);

  return (
    <PlayerContext.Provider value={{ current, playing, playQueue, toggle }}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => (index + 1 < queue.length ? next() : setPlaying(false))}
      />
      {current && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#14110f]/95 backdrop-blur">
          <input
            aria-label="Position dans le morceau"
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={time}
            onChange={(e) => {
              if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
            }}
            className="player-range block w-full"
          />
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
            {current.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.coverUrl} alt="" className="h-11 w-11 rounded object-cover" />
            ) : (
              <div className="h-11 w-11 rounded bg-gradient-to-br from-amber-700 to-rose-900" />
            )}
            <Link href={`/titre/${current.songSlug}`} className="min-w-0 flex-1">
              <p className="truncate font-medium">{current.title}</p>
              <p className="truncate text-xs text-stone-400">
                {current.label} · {formatDuration(time)} / {formatDuration(duration)}
              </p>
            </Link>
            <button onClick={prev} aria-label="Précédent" className="icon-btn">⏮</button>
            <button onClick={toggle} aria-label={playing ? "Pause" : "Lecture"} className="icon-btn h-11 w-11 bg-amber-500 text-stone-950">
              {playing ? "❚❚" : "▶"}
            </button>
            <button onClick={next} aria-label="Suivant" className="icon-btn">⏭</button>
          </div>
        </div>
      )}
    </PlayerContext.Provider>
  );
}

/** Bouton lecture réutilisable */
export function PlayButton({ tracks, index = 0, size = "md" }: { tracks: Track[]; index?: number; size?: "sm" | "md" }) {
  const { current, playing, playQueue, toggle } = usePlayer();
  const isCurrent = current?.variantId === tracks[index]?.variantId;
  const dim = size === "sm" ? "h-9 w-9 text-sm" : "h-12 w-12";
  return (
    <button
      disabled={!tracks.length}
      onClick={() => (isCurrent ? toggle() : playQueue(tracks, index))}
      aria-label={isCurrent && playing ? "Pause" : "Écouter"}
      className={`icon-btn ${dim} shrink-0 bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40`}
    >
      {isCurrent && playing ? "❚❚" : "▶"}
    </button>
  );
}
