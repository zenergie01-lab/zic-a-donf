"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CRITERIA, type Rating, type Score } from "@/lib/types";
import { LoginLink, useAuth } from "./Auth";

function Stars({ value, onChange, label }: { value: number; onChange?: (v: number) => void; label: string }) {
  return (
    <span className="inline-flex" role={onChange ? "radiogroup" : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${label} : ${n} sur 5`}
            onClick={() => onChange(n)}
            className={`px-0.5 text-xl leading-none transition ${n <= value ? "text-amber-400" : "text-stone-600 hover:text-stone-400"}`}>
            ★
          </button>
        ) : (
          <span key={n} aria-hidden className={`text-sm ${n <= Math.round(value) ? "text-amber-400" : "text-stone-700"}`}>★</span>
        ),
      )}
    </span>
  );
}

export function ScoreSummary({ score }: { score?: Score }) {
  if (!score || (!score.rating_count && !score.duel_total)) return <p className="text-xs text-stone-500">Pas encore de note</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
      {score.avg_global != null && (
        <span className="inline-flex items-center gap-1">
          <Stars value={score.avg_global} label="Note moyenne" /> {score.avg_global.toFixed(1)} ({score.rating_count} avis)
        </span>
      )}
      {score.duel_total > 0 && <span>⚔ {Math.round((100 * score.duel_wins) / score.duel_total)} % de duels gagnés ({score.duel_total})</span>}
    </p>
  );
}

export function RatingForm({ variantId, initial, onSaved }: { variantId: string; initial?: Rating; onSaved?: () => void }) {
  const { session } = useAuth();
  const [values, setValues] = useState<Record<string, number>>({
    message: initial?.message ?? 0, emotion: initial?.emotion ?? 0, melody: initial?.melody ?? 0,
  });
  const [status, setStatus] = useState<string | null>(initial ? "Ta note est enregistrée" : null);

  if (!session) {
    return <LoginLink className="text-sm text-amber-400 underline-offset-2 hover:underline">Connecte-toi pour noter cette version</LoginLink>;
  }

  async function set(key: string, v: number) {
    const next = { ...values, [key]: v };
    setValues(next);
    if (!next.message || !next.emotion || !next.melody) { setStatus("Note les 3 critères pour enregistrer"); return; }
    setStatus("Enregistrement…");
    const { error } = await supabase.from("ratings").upsert(
      { user_id: session!.user.id, variant_id: variantId, ...next },
      { onConflict: "user_id,variant_id" },
    );
    setStatus(error ? "❌ Enregistrement impossible" : "✅ Merci, ta note est enregistrée");
    if (!error) onSaved?.();
  }

  return (
    <div className="space-y-1.5">
      {CRITERIA.map((c) => (
        <div key={c.key} className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm" title={c.hint}>{c.label} <span className="hidden text-xs text-stone-500 sm:inline">— {c.hint}</span></span>
          <Stars value={values[c.key]} onChange={(v) => set(c.key, v)} label={c.label} />
        </div>
      ))}
      {status && <p className="text-xs text-stone-400">{status}</p>}
    </div>
  );
}
