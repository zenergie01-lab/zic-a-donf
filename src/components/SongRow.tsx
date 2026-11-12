"use client";

import Link from "next/link";
import { PlayButton } from "./Player";
import type { Song, Track } from "@/lib/types";
import { formatDuration, mainVariant } from "@/lib/utils";

export function SongRow({ song, queue, index }: { song: Song; queue: Track[]; index: number }) {
  const v = mainVariant(song);
  const count = (song.variants ?? []).filter((x) => x.is_published).length;
  return (
    <li className="flex items-center gap-3 py-3">
      <PlayButton tracks={queue} index={index} size="sm" />
      <Link href={`/titre/${song.slug}`} className="min-w-0 flex-1">
        <p className="truncate font-medium">{song.title}</p>
        <p className="truncate text-xs text-stone-400">
          {song.theme ? `${song.theme} · ` : ""}
          {count > 1 ? `${count} variantes` : "1 version"}
          {song.albums?.title ? ` · ${song.albums.title}` : ""}
        </p>
      </Link>
      <span className="text-xs tabular-nums text-stone-500">{formatDuration(v?.duration_seconds)}</span>
    </li>
  );
}
