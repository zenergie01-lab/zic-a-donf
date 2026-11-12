import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";
import { coverPublicUrl, getPublicSong } from "@/lib/server";

export const alt = "Écoute ce titre sur ZIC-ZIC et vote pour ta version préférée";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await getPublicSong(slug);
  const count = song?.variants.filter((v) => v.is_published).length ?? 0;
  const cover = coverPublicUrl(song?.variants.find((v) => v.cover_path)?.cover_path ?? song?.albums?.cover_path);
  return new ImageResponse(
    <OgCard
      kicker={song?.albums?.title ? `ZIC-ZIC · ${song.albums.title.toUpperCase()}` : "ZIC-ZIC"}
      title={song?.title ?? "Une chanson à découvrir"}
      subtitle={song?.theme ? `Thème : ${song.theme}` : "Chanson à texte · connaissance de Soi"}
      bullets={
        count > 1
          ? [`${count} versions de la même chanson`, "Écoute-les et note celle qui te touche", "Ou départage-les en duel à l’aveugle"]
          : ["Écoute le titre en entier", "Note : Message · Émotion · Mélodie", "Partage-le à qui en a besoin"]
      }
      coverUrl={cover}
      cta={count > 1 ? "Choisir ma version" : "Écouter"}
    />,
    size,
  );
}
