import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export function extOf(file: File) {
  const m = file.name.match(/\.([a-z0-9]+)$/i);
  return (m?.[1] ?? "bin").toLowerCase();
}

export function audioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => { resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : null); URL.revokeObjectURL(url); };
    a.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    a.src = url;
  });
}

export async function uploadFile(bucket: "zic-audio" | "zic-covers", folder: string, file: File) {
  const path = `${folder}/${crypto.randomUUID()}.${extOf(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Envoi de « ${file.name} » impossible : ${error.message}`);
  return path;
}

/** Insère une ligne avec un slug unique (ajoute -2, -3… si déjà pris). */
export async function insertWithSlug<T extends Record<string, unknown>>(
  table: "albums" | "songs",
  title: string,
  row: T,
) {
  const base = slugify(title);
  for (let n = 1; n < 20; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await supabase.from(table).insert({ ...row, title, slug }).select().single();
    if (!error) return data as { id: string; slug: string };
    if (error.code !== "23505") throw error;
  }
  throw new Error("Impossible de générer un identifiant unique.");
}

export async function addVariants(songId: string, files: File[], opts: { style?: string; cover?: File | null; startAt: number }) {
  const coverPath = opts.cover ? await uploadFile("zic-covers", songId, opts.cover) : null;
  let i = opts.startAt;
  for (const file of files) {
    const [audioPath, duration] = await Promise.all([uploadFile("zic-audio", songId, file), audioDuration(file)]);
    const { error } = await supabase.from("variants").insert({
      song_id: songId,
      label: `v${i}`,
      audio_path: audioPath,
      cover_path: coverPath,
      suno_style: opts.style || null,
      duration_seconds: duration,
      is_main: i === 1,
    });
    if (error) throw error;
    i++;
  }
}
