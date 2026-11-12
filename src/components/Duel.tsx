"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Song, Track, Variant } from "@/lib/types";
import { toTrack } from "@/lib/utils";
import { LoginLink, useAuth } from "./Auth";
import { Cover } from "./Cover";
import { PlayButton, usePlayer } from "./Player";
import { ErrorBox, Loading } from "./States";

type Pair = { song: Song; a: Variant; b: Variant }; // a.id < b.id (ordre en base)

const SONG_SELECT = "*, variants(*), albums(title, slug, cover_path)";

export function Duel() {
  const { session, ready } = useAuth();
  const { current, toggle, playing } = usePlayer();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [done, setDone] = useState<Set<string> | null>(null);
  const [seed, setSeed] = useState(0); // tiré au hasard au chargement (pas pendant le pré-rendu)
  const [result, setResult] = useState<{ pair: Pair; winner: Variant; loser: Variant } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("songs").select(SONG_SELECT).then(({ data, error }) => {
      if (error) setError(error.message); else setSongs(data as Song[]);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("duels").select("variant_a, variant_b").then(({ data }) => {
      setDone(new Set((data ?? []).map((d) => `${d.variant_a}|${d.variant_b}`)));
      setSeed(Math.floor(Math.random() * 1e9));
    });
  }, [session]);

  const remaining = useMemo(() => {
    if (!songs || !done) return [];
    const list: Pair[] = [];
    for (const song of songs) {
      const vs = (song.variants ?? []).filter((v) => v.is_published).sort((x, y) => (x.id < y.id ? -1 : 1));
      for (let i = 0; i < vs.length; i++)
        for (let j = i + 1; j < vs.length; j++)
          if (!done.has(`${vs[i].id}|${vs[j].id}`)) list.push({ song, a: vs[i], b: vs[j] });
    }
    return list;
  }, [songs, done]);

  // Paire tirée au hasard ; « flip » affiche parfois B à gauche pour éviter le biais d'ordre
  const pair = remaining.length ? remaining[seed % remaining.length] : null;
  const flip = Math.floor(seed / 7) % 2 === 1;

  const pick = useCallback(() => {
    setResult(null);
    setSeed(Math.floor(Math.random() * 1e9));
    if (playing) toggle();
  }, [playing, toggle]);

  async function vote(winner: Variant) {
    if (!pair || !session) return;
    const loser = winner.id === pair.a.id ? pair.b : pair.a;
    const { error } = await supabase.from("duels").insert({
      user_id: session.user.id, variant_a: pair.a.id, variant_b: pair.b.id, winner: winner.id,
    });
    if (error && error.code !== "23505") { setError(error.message); return; }
    if (current && (current.variantId === pair.a.id || current.variantId === pair.b.id) && playing) toggle();
    setResult({ pair, winner, loser });
    setDone((d) => new Set(d).add(`${pair.a.id}|${pair.b.id}`));
  }

  if (error) return <ErrorBox message={error} />;
  if (!ready) return <Loading />;

  const intro = (
    <div className="space-y-2 pt-4">
      <h1 className="text-4xl">Duel à l’aveugle</h1>
      <p className="max-w-2xl text-stone-300">
        Deux versions d’une même chanson, sans savoir laquelle est laquelle. Écoute les deux, puis choisis celle qui te touche le plus.
        Tes choix m’aident à décider quelle version partager.
      </p>
    </div>
  );

  if (!session)
    return (
      <div className="space-y-6">
        {intro}
        <LoginLink className="btn inline-block">Se connecter pour commencer</LoginLink>
      </div>
    );

  if (!songs || !done) return <Loading />;

  if (result) {
    return (
      <div className="space-y-6">
        {intro}
        <div className="card space-y-3 p-6 text-center">
          <p className="text-lg">Merci ! 🙏</p>
          <p className="text-stone-300">
            Tu as préféré la <b className="text-amber-300">{result.winner.label}</b> à la {result.loser.label} de « {result.pair.song.title} ».
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {remaining.length > 0 ? (
              <button className="btn" onClick={pick}>Duel suivant ({remaining.length} restant{remaining.length > 1 ? "s" : ""})</button>
            ) : (
              <p className="text-stone-400">Tu as fait tous les duels disponibles !</p>
            )}
            <Link href="/classement" className="btn-ghost">Voir le classement</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!pair)
    return (
      <div className="space-y-6">
        {intro}
        <p className="card p-6 text-stone-300">
          {remaining.length === 0 && done.size > 0 ? "Tu as fait tous les duels disponibles. Reviens quand de nouvelles variantes seront publiées !" : "Aucun titre n’a encore plusieurs variantes publiées."}
        </p>
      </div>
    );

  const left = flip ? pair.b : pair.a;
  const right = flip ? pair.a : pair.b;
  // Même pochette pour les deux versions : rien ne doit trahir laquelle est laquelle
  const cover = toTrack(pair.song, pair.a).coverUrl;
  const blind = (v: Variant, name: string): Track => ({ ...toTrack(pair.song, v), label: `Version ${name}`, coverUrl: cover });
  const queue = [blind(left, "A"), blind(right, "B")];

  return (
    <div className="space-y-6">
      {intro}
      <div className="card grid gap-6 p-5 md:grid-cols-[10rem_1fr]">
        <div className="w-32 md:w-40"><Cover url={queue[0].coverUrl} alt={pair.song.title} /></div>
        <div className="space-y-5">
          <h2 className="text-2xl">{pair.song.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[left, right].map((v, i) => (
              <div key={v.id} className="rounded-xl border border-white/10 p-4 text-center">
                <p className="mb-3 font-serif text-xl">Version {i === 0 ? "A" : "B"}</p>
                <div className="flex justify-center"><PlayButton tracks={queue} index={i} /></div>
                <button className="btn mt-4 w-full" onClick={() => vote(v)}>Je préfère la {i === 0 ? "A" : "B"}</button>
              </div>
            ))}
          </div>
          <button className="text-sm text-stone-400 underline-offset-2 hover:underline" onClick={pick}>Passer ce duel</button>
        </div>
      </div>
    </div>
  );
}
