"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchLibrary, fetchScores } from "@/lib/queries";
import type { Score, Song } from "@/lib/types";
import { CRITERIA } from "@/lib/types";
import { toTrack } from "@/lib/utils";
import { PlayButton } from "./Player";
import { ScoreSummary } from "./Rating";
import { ErrorBox, Loading } from "./States";

/** Score de « potentiel » sur 100 : moyenne des notes (70 %) + taux de victoire en duel (30 %),
 *  avec un léger lissage pour ne pas surévaluer une version notée une seule fois. */
function potential(s?: Score) {
  if (!s) return 0;
  const n = s.rating_count;
  const avg = s.avg_global ?? 0;
  const rated = n ? ((avg * n + 3 * 2) / (n + 2)) / 5 : 0; // lissage vers 3/5
  const duel = s.duel_total ? (s.duel_wins + 1) / (s.duel_total + 2) : 0.5;
  if (!n && !s.duel_total) return 0;
  return Math.round(100 * (n ? 0.7 * rated + 0.3 * duel : duel));
}

export function Ranking() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchLibrary(), fetchScores()])
      .then(([lib, sc]) => { setSongs(lib.songs); setScores(sc); })
      .catch((e) => setError(e.message ?? String(e)));
  }, []);

  const rows = useMemo(() => {
    if (!songs) return [];
    return songs
      .flatMap((song) => (song.variants ?? []).filter((v) => v.is_published).map((v) => ({ song, v, s: scores[v.id], p: potential(scores[v.id]) })))
      .filter((r) => r.s && (r.s.rating_count || r.s.duel_total))
      .sort((x, y) => y.p - x.p);
  }, [songs, scores]);

  const queue = useMemo(() => rows.map((r) => ({ ...toTrack(r.song, r.v), label: `${r.v.label}` })), [rows]);

  if (error) return <ErrorBox message={error} />;
  if (!songs) return <Loading />;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-4xl">Classement</h1>
        <p className="mt-2 max-w-2xl text-stone-300">
          Le potentiel de chaque version, d’après vos notes ({CRITERIA.map((c) => c.label).join(", ")}) et les duels à l’aveugle.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="card p-6 text-stone-400">Pas encore assez de votes. <Link href="/duel" className="text-amber-400">Lance un duel</Link> ou note un titre pour commencer !</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.v.id} className="card flex items-center gap-3 p-3">
              <span className="w-8 text-center font-serif text-xl text-stone-500">{i + 1}</span>
              <PlayButton tracks={queue} index={i} size="sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/titre/${r.song.slug}`} className="block truncate font-medium">
                  {r.song.title} <span className="text-sm text-stone-400">· {r.v.label}</span>
                </Link>
                <ScoreSummary score={r.s} />
              </div>
              <span className="text-right">
                <span className="block font-serif text-2xl text-amber-400">{r.p}</span>
                <span className="text-[10px] uppercase tracking-wider text-stone-500">potentiel</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
