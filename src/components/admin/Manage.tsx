"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Album, Song, Variant } from "@/lib/types";
import { formatDuration, toTrack } from "@/lib/utils";
import { PlayButton } from "@/components/Player";
import { addVariants } from "./helpers";

export function Manage({ songs, albums, onChange }: { songs: Song[]; albums: Album[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!songs.length) return <p className="text-stone-400">Aucun titre. Commence par « Ajouter un titre ».</p>;
  return (
    <ul className="space-y-3">
      {songs.map((s) => (
        <li key={s.id} className="card p-4">
          <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
            <span className="min-w-0">
              <span className="block truncate font-medium">{s.title}</span>
              <span className="text-xs text-stone-400">
                {s.albums?.title ?? "Single"} · {s.variants?.length ?? 0} variante(s)
              </span>
            </span>
            <span className="text-stone-500">{open === s.id ? "▲" : "▼"}</span>
          </button>
          {open === s.id && <SongEditor song={s} albums={albums} onChange={onChange} />}
        </li>
      ))}
    </ul>
  );
}

function SongEditor({ song, albums, onChange }: { song: Song; albums: Album[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const variants = [...(song.variants ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const queue = variants.map((v) => toTrack(song, v));

  async function run(label: string, fn: () => PromiseLike<{ error: { message: string } | null }> | Promise<void>) {
    setBusy(label);
    try {
      const res = await fn();
      if (res && "error" in res && res.error) throw new Error(res.error.message);
      onChange();
    } catch (err) { alert((err as Error).message); }
    finally { setBusy(null); }
  }

  const saveSong = (patch: Partial<Song>) => run("Enregistrement…", () => supabase.from("songs").update(patch).eq("id", song.id));

  async function setMain(v: Variant) {
    await run("…", async () => {
      await supabase.from("variants").update({ is_main: false }).eq("song_id", song.id);
      const { error } = await supabase.from("variants").update({ is_main: true }).eq("id", v.id);
      if (error) throw error;
    });
  }

  async function removeVariant(v: Variant) {
    if (!confirm(`Supprimer la variante ${v.label} ?`)) return;
    await run("Suppression…", async () => {
      const { error } = await supabase.from("variants").delete().eq("id", v.id);
      if (error) throw error;
      await supabase.storage.from("zic-audio").remove([v.audio_path]);
    });
  }

  async function removeSong() {
    if (!confirm(`Supprimer « ${song.title} » et toutes ses variantes ?`)) return;
    await run("Suppression…", async () => {
      const paths = variants.map((v) => v.audio_path);
      const { error } = await supabase.from("songs").delete().eq("id", song.id);
      if (error) throw error;
      if (paths.length) await supabase.storage.from("zic-audio").remove(paths);
    });
  }

  return (
    <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input className="field md:col-span-2" defaultValue={song.title} onBlur={(e) => e.target.value !== song.title && saveSong({ title: e.target.value })} />
        <select className="field" defaultValue={song.album_id ?? ""} onChange={(e) => saveSong({ album_id: e.target.value || null })}>
          <option value="">— Single —</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <input className="field" placeholder="Thème" defaultValue={song.theme ?? ""} onBlur={(e) => saveSong({ theme: e.target.value || null })} />
        <input className="field" type="number" placeholder="N° piste" defaultValue={song.track_number ?? ""} onBlur={(e) => saveSong({ track_number: e.target.value ? Number(e.target.value) : null })} />
        <Link href={`/titre/${song.slug}`} className="btn-ghost text-center">Voir la page publique</Link>
        <textarea className="field min-h-32 font-serif md:col-span-3" placeholder="Paroles" defaultValue={song.lyrics ?? ""} onBlur={(e) => e.target.value !== (song.lyrics ?? "") && saveSong({ lyrics: e.target.value || null })} />
      </div>

      <ul className="divide-y divide-white/5">
        {variants.map((v, i) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 py-2">
            <PlayButton tracks={queue} index={i} size="sm" />
            <input className="field w-20" defaultValue={v.label}
              onBlur={(e) => e.target.value !== v.label && run("…", () => supabase.from("variants").update({ label: e.target.value }).eq("id", v.id))} />
            <input className="field min-w-40 flex-1" placeholder="Style Suno" defaultValue={v.suno_style ?? ""}
              onBlur={(e) => run("…", () => supabase.from("variants").update({ suno_style: e.target.value || null }).eq("id", v.id))} />
            <span className="text-xs tabular-nums text-stone-500">{formatDuration(v.duration_seconds)}</span>
            <button className={`btn-ghost text-sm ${v.is_main ? "border-amber-500 text-amber-300" : ""}`} onClick={() => setMain(v)}>
              {v.is_main ? "★ Principale" : "☆ Principale"}
            </button>
            <button className="btn-ghost text-sm" onClick={() => run("…", () => supabase.from("variants").update({ is_published: !v.is_published }).eq("id", v.id))}>
              {v.is_published ? "Masquer" : "Publier"}
            </button>
            <button className="btn-ghost text-sm text-rose-300" onClick={() => removeVariant(v)}>Supprimer</button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-ghost cursor-pointer text-sm">
          + Ajouter des variantes
          <input hidden type="file" accept="audio/*" multiple onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) run(`Envoi de ${files.length} fichier(s)…`, () => addVariants(song.id, files, { startAt: variants.length + 1 }));
          }} />
        </label>
        <button className="btn-ghost text-sm text-rose-300" onClick={removeSong}>Supprimer le titre</button>
        {busy && <span className="text-sm text-stone-400">{busy}</span>}
      </div>
    </div>
  );
}
