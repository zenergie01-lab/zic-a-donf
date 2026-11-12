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
};

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
