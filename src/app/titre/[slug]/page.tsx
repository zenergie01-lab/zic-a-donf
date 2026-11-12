import { Suspense } from "react";
import { SongView } from "@/components/SongView";
import { Loading } from "@/components/States";

export default function SongPage({ params }: PageProps<"/titre/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ slug }) => (
        <SongView slug={slug} />
      ))}
    </Suspense>
  );
}
