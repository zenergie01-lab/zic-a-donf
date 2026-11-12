/* eslint-disable @next/next/no-img-element */
export function Cover({ url, alt, className = "" }: { url: string | null; alt: string; className?: string }) {
  return url ? (
    <img src={url} alt={alt} className={`aspect-square w-full rounded-xl object-cover ${className}`} />
  ) : (
    <div className={`flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-br from-amber-800/70 via-rose-900/60 to-stone-900 font-serif text-3xl text-amber-100/80 ${className}`}>
      {alt.slice(0, 1)}
    </div>
  );
}
