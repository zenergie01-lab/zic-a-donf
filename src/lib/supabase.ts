import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = Boolean(url && anonKey);

// Un seul client navigateur. La sécurité réelle est assurée par les règles RLS côté base.
export const supabase = createClient(url || "http://localhost", anonKey || "missing", {
  db: { schema: "zic" },
  auth: { persistSession: true, autoRefreshToken: true },
});

export function publicUrl(bucket: "zic-audio" | "zic-covers", path?: string | null) {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
