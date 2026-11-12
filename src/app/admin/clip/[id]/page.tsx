import { Suspense } from "react";
import type { Metadata } from "next";
import { ClipStudio } from "@/components/clip/ClipStudio";

export const metadata: Metadata = { title: "Atelier clip", robots: { index: false } };

export default function ClipPage({ params }: PageProps<"/admin/clip/[id]">) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-stone-400">Chargement…</p>}>
      {params.then(({ id }) => <ClipStudio variantId={id} />)}
    </Suspense>
  );
}
