import { supabase } from "./supabase";
import type { Album, Rating, Score, Song } from "./types";

const SONG_SELECT = "*, variants(*), albums(title, slug, cover_path)";

export async function fetchLibrary() {
  const [albums, songs] = await Promise.all([
    supabase.from("albums").select("*").order("position").order("created_at", { ascending: false }),
    supabase.from("songs").select(SONG_SELECT).order("created_at", { ascending: false }),
  ]);
  if (albums.error) throw albums.error;
  if (songs.error) throw songs.error;
  return { albums: albums.data as Album[], songs: songs.data as Song[] };
}

export async function fetchAlbum(slug: string) {
  const { data: album, error } = await supabase.from("albums").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!album) return null;
  const { data: songs, error: e2 } = await supabase
    .from("songs")
    .select(SONG_SELECT)
    .eq("album_id", album.id)
    .order("track_number", { nullsFirst: false })
    .order("created_at");
  if (e2) throw e2;
  return { album: album as Album, songs: songs as Song[] };
}

export async function fetchSong(slug: string) {
  const { data, error } = await supabase.from("songs").select(SONG_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Song | null;
}

export async function fetchScores(variantIds?: string[]) {
  let q = supabase.from("variant_scores").select("*");
  if (variantIds) q = q.in("variant_id", variantIds);
  const { data, error } = await q;
  if (error) throw error;
  return Object.fromEntries((data as Score[]).map((s) => [s.variant_id, s])) as Record<string, Score>;
}

export async function fetchMyRatings(variantIds: string[]) {
  const { data, error } = await supabase.from("ratings").select("variant_id, message, emotion, melody").in("variant_id", variantIds);
  if (error) throw error;
  return Object.fromEntries((data as Rating[]).map((r) => [r.variant_id, r])) as Record<string, Rating>;
}
