import { Suspense } from "react";
import type { Metadata } from "next";
import { SongView } from "@/components/SongView";
import { Loading } from "@/components/States";
import { firstLyric, getPublicSong } from "@/lib/server";

export async function generateMetadata({ params }: PageProps<"/titre/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const song = await getPublicSong(slug);
  if (!song) return { title: "Titre" };
  const count = song.variants.filter((v) => v.is_published).length;
  const description = [
    firstLyric(song.lyrics),
    count > 1 ? `${count} versions à écouter : vote pour ta préférée.` : "Écoute et note ce titre.",
    "Chanson à texte · connaissance de Soi.",
  ].filter(Boolean).join(" ");
  return {
    title: song.title,
    description,
    openGraph: { title: `${song.title} — ZIC-ZIC`, description, type: "music.song" },
  };
}

export default function SongPage({ params }: PageProps<"/titre/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ slug }) => (
        <SongView slug={slug} />
      ))}
    </Suspense>
  );
}
