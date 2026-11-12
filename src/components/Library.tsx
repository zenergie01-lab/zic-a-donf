"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchLibrary } from "@/lib/queries";
import { publicUrl } from "@/lib/supabase";
import type { Album, Song } from "@/lib/types";
import { mainVariant, toTrack } from "@/lib/utils";
import { Cover } from "./Cover";
import { SongRow } from "./SongRow";
import { ErrorBox, Loading } from "./States";

export function Library() {
  const [data, setData] = useState<{ albums: Album[]; songs: Song[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchLibrary().then(setData).catch((e) => setError(e.message ?? String(e)));
  }, []);

  const songs = useMemo(() => {
    const list = (data?.songs ?? []).filter((s) => mainVariant(s));
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s) =>
      [s.title, s.theme, s.lyrics, s.albums?.title].some((t) => t?.toLowerCase().includes(term)),
    );
  }, [data, q]);

  const queue = useMemo(() => songs.map((s) => toTrack(s, mainVariant(s)!)), [songs]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-12">
      <section className="pt-4">
        <h1 className="text-4xl sm:text-5xl">Des chansons pour se (re)découvrir</h1>
        <p className="mt-3 max-w-2xl text-stone-300">
          Musique à texte, créée avec Suno, autour de la connaissance de Soi. Écoute, compare les variantes, et bientôt : vote pour celles qui te touchent.
        </p>
      </section>

      {data.albums.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl">Albums</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.albums.map((a) => (
              <li key={a.id}>
                <Link href={`/album/${a.slug}`} className="group block">
                  <Cover url={publicUrl("zic-covers", a.cover_path)} alt={a.title} className="transition group-hover:opacity-90" />
                  <p className="mt-2 truncate font-medium">{a.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl">Tous les titres</h2>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un titre, un thème, une parole…"
            className="field max-w-xs"
          />
        </div>
        {songs.length === 0 ? (
          <p className="py-6 text-stone-400">Aucun titre pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {songs.map((s, i) => (
              <SongRow key={s.id} song={s} queue={queue} index={i} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
