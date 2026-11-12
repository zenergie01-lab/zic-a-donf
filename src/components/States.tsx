import { isConfigured } from "@/lib/supabase";

export function Loading() {
  return <p className="py-10 text-center text-stone-400">Chargement…</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="card my-6 border-rose-500/40 p-4 text-sm text-rose-200">
      {isConfigured ? message : "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."}
    </div>
  );
}
