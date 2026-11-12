"use client";

import { useState } from "react";
import { publicUrl, supabase } from "@/lib/supabase";
import type { Album } from "@/lib/types";
import { Cover } from "@/components/Cover";
import { insertWithSlug, uploadFile } from "./helpers";

export function Albums({ albums, onChange }: { albums: Album[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setStatus(null);
    try {
      const coverPath = cover ? await uploadFile("zic-covers", "albums", cover) : null;
      await insertWithSlug("albums", title.trim(), { description: description.trim() || null, cover_path: coverPath, position: albums.length });
      setTitle(""); setDescription(""); setCover(null);
      setStatus("✅ Album créé");
      onChange();
    } catch (err) {
      setStatus(`❌ ${(err as Error).message}`);
    } finally { setBusy(false); }
  }

  async function update(id: string, patch: Partial<Album>) {
    const { error } = await supabase.from("albums").update(patch).eq("id", id);
    if (error) alert(error.message); else onChange();
  }

  async function changeCover(a: Album, file: File) {
    try { await update(a.id, { cover_path: await uploadFile("zic-covers", "albums", file) }); }
    catch (err) { alert((err as Error).message); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="card grid gap-3 p-5 md:grid-cols-2">
        <h2 className="text-xl md:col-span-2">Nouvel album</h2>
        <input className="field" required placeholder="Titre de l’album" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        <textarea className="field md:col-span-2" placeholder="Description / intention de l’album" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex items-center gap-4 md:col-span-2">
          <button className="btn" disabled={busy}>{busy ? "Création…" : "Créer l’album"}</button>
          {status && <span className="text-sm">{status}</span>}
        </div>
      </form>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((a, i) => (
          <li key={a.id} className="card space-y-3 p-3">
            <Cover url={publicUrl("zic-covers", a.cover_path)} alt={a.title} />
            <input className="field" defaultValue={a.title} onBlur={(e) => e.target.value !== a.title && update(a.id, { title: e.target.value })} />
            <div className="flex flex-wrap gap-2 text-sm">
              <label className="btn-ghost cursor-pointer">
                Pochette
                <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && changeCover(a, e.target.files[0])} />
              </label>
              <button className="btn-ghost" onClick={() => update(a.id, { is_published: !a.is_published })}>
                {a.is_published ? "Masquer" : "Publier"}
              </button>
              <button className="btn-ghost" disabled={i === 0} onClick={() => update(a.id, { position: i - 1 }).then(() => update(albums[i - 1].id, { position: i }))}>↑</button>
              <button className="btn-ghost text-rose-300" onClick={async () => {
                if (!confirm(`Supprimer l’album « ${a.title} » ? Les titres restent, sans album.`)) return;
                const { error } = await supabase.from("albums").delete().eq("id", a.id);
                if (error) alert(error.message); else onChange();
              }}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
