"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchSong } from "@/lib/queries";
import type { Song } from "@/lib/types";
import { formatDuration, toTrack } from "@/lib/utils";
import { Cover } from "./Cover";
import { PlayButton } from "./Player";
import { ErrorBox, Loading } from "./States";

export function SongView({ slug }: { slug: string }) {
  const [song, setSong] = useState<Song | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSong(slug).then(setSong).catch((e) => setError(e.message ?? String(e)));
  }, [slug]);

  const variants = useMemo(
    () =>
      (song?.variants ?? [])
        .filter((v) => v.is_published)
        .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.created_at.localeCompare(b.created_at)),
    [song],
  );
  const queue = useMemo(() => (song ? variants.map((v) => toTrack(song, v)) : []), [song, variants]);

  if (error) return <ErrorBox message={error} />;
  if (song === undefined) return <Loading />;
  if (song === null) return <p className="py-10 text-center">Titre introuvable.</p>;

  return (
    <div className="grid gap-8 pt-4 md:grid-cols-[18rem_1fr]">
      <div className="space-y-4">
        <Cover url={queue[0]?.coverUrl ?? null} alt={song.title} />
        {song.albums && (
          <Link href={`/album/${song.albums.slug}`} className="block text-sm text-amber-500">
            ← {song.albums.title}
          </Link>
        )}
      </div>
      <div className="space-y-6">
        <div>
          {song.theme && <p className="text-xs uppercase tracking-widest text-amber-500">{song.theme}</p>}
          <h1 className="text-4xl">{song.title}</h1>
        </div>

        <section className="card p-4">
          <h2 className="mb-2 text-lg">Variantes ({variants.length})</h2>
          <ul className="divide-y divide-white/5">
            {variants.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 py-2">
                <PlayButton tracks={queue} index={i} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {v.label} {v.is_main && <span className="ml-1 rounded bg-amber-500/20 px-1.5 text-xs text-amber-300">principale</span>}
                  </p>
                  {v.suno_style && <p className="truncate text-xs text-stone-400">{v.suno_style}</p>}
                </div>
                <span className="text-xs tabular-nums text-stone-500">{formatDuration(v.duration_seconds)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone-500">Bientôt : note chaque variante et fais-les s’affronter en duel.</p>
        </section>

        {song.lyrics && (
          <section>
            <h2 className="mb-2 text-lg">Paroles</h2>
            <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-stone-200">{song.lyrics}</p>
          </section>
        )}
      </div>
    </div>
  );
}
