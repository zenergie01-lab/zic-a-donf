import { Suspense } from "react";
import { AlbumView } from "@/components/AlbumView";
import { Loading } from "@/components/States";

export default function AlbumPage({ params }: PageProps<"/album/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ slug }) => (
        <AlbumView slug={slug} />
      ))}
    </Suspense>
  );
}
