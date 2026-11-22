import { Suspense } from "react";
import type { Metadata } from "next";
import { SalonView } from "@/components/clip/SalonView";

export const metadata: Metadata = { title: "Karaoké de groupe", robots: { index: false } };

export default function SalonPage({ params }: PageProps<"/salon/[pin]">) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-stone-400">Chargement…</p>}>
      {params.then(({ pin }) => <SalonView pin={pin} />)}
    </Suspense>
  );
}
