import { createClient } from "@supabase/supabase-js";
import { alignLines, cleanLyrics, type TimedWord } from "@/lib/lyrics";

export const maxDuration = 120;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/**
 * POST /api/align  { variantId }
 * Réservé aux créateurs : transcrit l'audio (Whisper, mots horodatés) puis cale chaque ligne de paroles.
 * La clé API reste côté serveur (variable OPENAI_API_KEY sur Vercel).
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: "Synchro IA non configurée : ajoute OPENAI_API_KEY dans Vercel." }, 503);

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Connexion requise" }, 401);

  // Client agissant au nom de l'utilisateur : les règles RLS s'appliquent
  const db = createClient(SUPABASE_URL, ANON, {
    db: { schema: "zic" },
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData } = await db.auth.getUser(token);
  if (!userData.user) return json({ error: "Session invalide" }, 401);
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!admin) return json({ error: "Réservé au créateur" }, 403);

  const { variantId } = (await req.json().catch(() => ({}))) as { variantId?: string };
  if (!variantId) return json({ error: "variantId manquant" }, 400);

  const { data: variant, error } = await db
    .from("variants")
    .select("id, audio_path, songs(lyrics)")
    .eq("id", variantId)
    .maybeSingle();
  if (error || !variant) return json({ error: "Variante introuvable" }, 404);

  const song = Array.isArray(variant.songs) ? variant.songs[0] : variant.songs;
  const lines = cleanLyrics((song as { lyrics?: string } | null)?.lyrics);
  if (!lines.length) return json({ error: "Ce titre n'a pas de paroles enregistrées." }, 400);

  // Télécharge l'audio depuis le stockage public
  const audioUrl = db.storage.from("zic-audio").getPublicUrl(variant.audio_path).data.publicUrl;
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) return json({ error: "Audio inaccessible" }, 502);
  const audio = await audioRes.blob();
  if (audio.size > 25 * 1024 * 1024) return json({ error: "Fichier audio trop lourd pour la synchro (25 Mo max)." }, 413);

  const form = new FormData();
  form.append("file", audio, variant.audio_path.split("/").pop() || "audio.mp3");
  form.append("model", process.env.TRANSCRIBE_MODEL || "whisper-1");
  form.append("language", "fr");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("prompt", lines.slice(0, 12).join(" ")); // aide l'IA à reconnaître le vocabulaire

  const base = process.env.TRANSCRIBE_BASE_URL || "https://api.openai.com/v1";
  const tr = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!tr.ok) {
    const detail = await tr.text().catch(() => "");
    return json({ error: `Transcription refusée (${tr.status})`, detail: detail.slice(0, 300) }, 502);
  }
  const result = (await tr.json()) as { words?: TimedWord[] };
  const words = result.words ?? [];
  const times = alignLines(lines, words);
  const found = times.filter((t) => t != null).length;

  return json({ lines: lines.map((text, i) => ({ t: times[i], text })), found, total: lines.length, heardWords: words.length });
}
