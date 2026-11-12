export type Album = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_path: string | null;
  position: number;
  is_published: boolean;
};

export type Variant = {
  id: string;
  song_id: string;
  label: string;
  audio_path: string;
  cover_path: string | null;
  suno_style: string | null;
  duration_seconds: number | null;
  is_main: boolean;
  is_published: boolean;
  created_at: string;
  lyrics_sync?: SyncLine[] | null;
  short_start?: number | null;
  short_duration?: number | null;
};

export type SyncLine = { t: number | null; text: string };

export type Song = {
  id: string;
  album_id: string | null;
  title: string;
  slug: string;
  lyrics: string | null;
  theme: string | null;
  track_number: number | null;
  variants?: Variant[];
  albums?: Pick<Album, "title" | "slug" | "cover_path"> | null;
};

export type Track = {
  variantId: string;
  title: string;
  label: string;
  audioUrl: string;
  coverUrl: string | null;
  songSlug: string;
};

export type Score = {
  variant_id: string;
  rating_count: number;
  avg_message: number | null;
  avg_emotion: number | null;
  avg_melody: number | null;
  avg_global: number | null;
  duel_wins: number;
  duel_total: number;
};

export type Rating = { variant_id: string; message: number; emotion: number; melody: number };

export const CRITERIA = [
  { key: "message", label: "Message", hint: "Le texte me parle, me fait réfléchir" },
  { key: "emotion", label: "Émotion", hint: "Ça me touche, me fait vibrer" },
  { key: "melody", label: "Mélodie", hint: "La musique, la voix, l’envie de réécouter" },
] as const;
