import { Suspense } from "react";
import type { Metadata } from "next";
import { KaraokePlayer } from "@/components/clip/KaraokePlayer";

export const metadata: Metadata = { title: "Karaoké" };

export default function KaraokePage({ params }: PageProps<"/karaoke/[id]">) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-stone-400">Chargement…</p>}>
      {params.then(({ id }) => <KaraokePlayer variantId={id} />)}
    </Suspense>
  );
}
