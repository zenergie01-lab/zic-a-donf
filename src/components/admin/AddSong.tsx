"use client";

import { useState } from "react";
import type { Album } from "@/lib/types";
import { addVariants, insertWithSlug } from "./helpers";

export function AddSong({ albums, onDone }: { albums: Album[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [track, setTrack] = useState("");
  const [theme, setTheme] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) { setStatus("Ajoute au moins un fichier audio."); return; }
    setBusy(true);
    try {
      setStatus("Création du titre…");
      const song = await insertWithSlug("songs", title.trim(), {
        album_id: albumId || null,
        track_number: track ? Number(track) : null,
        theme: theme.trim() || null,
        lyrics: lyrics.trim() || null,
      });
      setStatus(`Envoi de ${files.length} fichier(s)…`);
      await addVariants(song.id, files, { style: style.trim(), cover, startAt: 1 });
      setStatus("✅ Titre ajouté !");
      setTitle(""); setTrack(""); setTheme(""); setLyrics(""); setStyle(""); setFiles([]); setCover(null);
      onDone();
    } catch (err) {
      setStatus(`❌ ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-5 md:grid-cols-2">
      <label className="space-y-1 md:col-span-2">
        <span className="text-sm text-stone-300">Titre de la chanson *</span>
        <input className="field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Lâcher prise" />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-300">Album</span>
        <select className="field" value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
          <option value="">— Aucun (single) —</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-sm text-stone-300">N° de piste</span>
          <input className="field" type="number" min={1} value={track} onChange={(e) => setTrack(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-stone-300">Thème</span>
          <input className="field" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex. Confiance" />
        </label>
      </div>
      <label className="space-y-1 md:col-span-2">
        <span className="text-sm text-stone-300">Paroles</span>
        <textarea className="field min-h-40 font-serif" value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Colle ici les paroles depuis Suno" />
      </label>
      <label className="space-y-1 md:col-span-2">
        <span className="text-sm text-stone-300">Style Suno (prompt de style)</span>
        <input className="field" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Ex. chanson française acoustique, voix douce, piano" />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-300">Fichiers audio * (plusieurs = plusieurs variantes)</span>
        <input className="field" type="file" accept="audio/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-300">Pochette (optionnel, JPG/PNG/WebP)</span>
        <input className="field" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
      </label>
      {files.length > 0 && (
        <ul className="text-sm text-stone-400 md:col-span-2">
          {files.map((f, i) => <li key={i}>v{i + 1} — {f.name} ({(f.size / 1048576).toFixed(1)} Mo)</li>)}
        </ul>
      )}
      <div className="flex items-center gap-4 md:col-span-2">
        <button className="btn" disabled={busy}>{busy ? "Envoi en cours…" : "Ajouter le titre"}</button>
        {status && <p className="text-sm">{status}</p>}
      </div>
      <p className="text-xs text-stone-500 md:col-span-2">Astuce : la v1 devient la variante principale. Tu peux en changer ensuite dans « Mes titres ».</p>
    </form>
  );
}
