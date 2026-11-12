/** Lecture publique côté serveur (aperçus réseaux, métadonnées). */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type PublicSong = {
  title: string;
  theme: string | null;
  lyrics: string | null;
  albums: { title: string; cover_path: string | null } | null;
  variants: { id: string; is_published: boolean; cover_path: string | null }[];
};

export async function getPublicSong(slug: string): Promise<PublicSong | null> {
  if (!URL_ || !ANON) return null;
  try {
    const q = `${URL_}/rest/v1/songs?slug=eq.${encodeURIComponent(slug)}&select=title,theme,lyrics,albums(title,cover_path),variants(id,is_published,cover_path)&limit=1`;
    const res = await fetch(q, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Accept-Profile": "zic" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as PublicSong[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export function coverPublicUrl(path?: string | null) {
  return path ? `${URL_}/storage/v1/object/public/zic-covers/${path}` : null;
}

/** Première ligne chantée, pour donner envie dans la description */
export function firstLyric(lyrics?: string | null) {
  const line = (lyrics ?? "").split(/\r?\n/).map((l) => l.replace(/\[[^\]]*\]/g, "").trim()).find((l) => l.length > 8);
  return line ? `« ${line.slice(0, 90)}${line.length > 90 ? "…" : ""} »` : null;
}
