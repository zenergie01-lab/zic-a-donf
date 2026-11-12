"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAlbum } from "@/lib/queries";
import { publicUrl } from "@/lib/supabase";
import type { Album, Song } from "@/lib/types";
import { mainVariant, toTrack } from "@/lib/utils";
import { Cover } from "./Cover";
import { PlayButton } from "./Player";
import { SongRow } from "./SongRow";
import { ErrorBox, Loading } from "./States";

export function AlbumView({ slug }: { slug: string }) {
  const [data, setData] = useState<{ album: Album; songs: Song[] } | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbum(slug).then(setData).catch((e) => setError(e.message ?? String(e)));
  }, [slug]);

  const songs = useMemo(() => (data?.songs ?? []).filter((s) => mainVariant(s)), [data]);
  const queue = useMemo(() => songs.map((s) => toTrack(s, mainVariant(s)!)), [songs]);

  if (error) return <ErrorBox message={error} />;
  if (data === undefined) return <Loading />;
  if (data === null) return <p className="py-10 text-center">Album introuvable.</p>;

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="w-48 shrink-0 sm:w-56">
          <Cover url={publicUrl("zic-covers", data.album.cover_path)} alt={data.album.title} />
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-amber-500">Album</p>
          <h1 className="text-4xl">{data.album.title}</h1>
          {data.album.description && <p className="max-w-xl whitespace-pre-line text-stone-300">{data.album.description}</p>}
          <div className="flex items-center gap-3">
            <PlayButton tracks={queue} />
            <span className="text-sm text-stone-400">{songs.length} titre{songs.length > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-white/5">
        {songs.map((s, i) => (
          <SongRow key={s.id} song={s} queue={queue} index={i} />
        ))}
      </ul>
    </div>
  );
}
