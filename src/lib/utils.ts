import { publicUrl } from "./supabase";
import type { Song, Track, Variant } from "./types";

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "titre";
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Variante principale : celle marquée « principale », sinon la plus ancienne. */
export function mainVariant(song: Song): Variant | undefined {
  const list = (song.variants ?? []).filter((v) => v.is_published);
  return list.find((v) => v.is_main) ?? [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
}

export function toTrack(song: Song, variant: Variant): Track {
  return {
    variantId: variant.id,
    title: song.title,
    label: variant.label,
    audioUrl: publicUrl("zic-audio", variant.audio_path) ?? "",
    coverUrl: publicUrl("zic-covers", variant.cover_path ?? song.albums?.cover_path ?? null),
    songSlug: song.slug,
  };
}
