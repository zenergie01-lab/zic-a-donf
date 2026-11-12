import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";

export const alt = "ZIC-ZIC — chansons à texte pour se (re)découvrir : écoute, note et départage les variantes";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard
      kicker="ZIC-ZIC"
      title="Des chansons pour se (re)découvrir"
      subtitle="Musique à texte autour de la connaissance de Soi"
      bullets={["Écoute les titres et leurs variantes", "Note : Message · Émotion · Mélodie", "Départage les versions en duel à l’aveugle"]}
      cta="Écouter et voter"
    />,
    size,
  );
}
