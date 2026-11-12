import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";
export function GET() {
  return new ImageResponse(
    <OgCard kicker="ZIC À DONF · DE TOI A MOI" title="qui a dit à dit ?" subtitle="Chanson à texte · connaissance de Soi"
      bullets={["3 versions de la même chanson", "Écoute-les et note celle qui te touche", "Ou départage-les en duel à l’aveugle"]} cta="Choisir ma version" />,
    OG_SIZE,
  );
}
