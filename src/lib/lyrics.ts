/** Outils paroles : nettoyage, alignement sur la transcription horodatée, timings mot à mot. */
import type { SyncLine, SyncWord } from "./types";

export type TimedWord = { word: string; start: number; end: number };

/** Garde les lignes chantées : retire [Couplet], (Refrain), lignes vides. */
export function cleanLyrics(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\[[^\]]*\]/g, "").trim())
    .filter((l) => l && !/^\(?\s*(refrain|couplet|pont|intro|outro|chorus|verse|bridge|pre-?chorus|hook)[^)]*\)?\s*:?$/i.test(l));
}

const norm = (w: string) =>
  w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const splitWords = (line: string) => line.split(/\s+/).filter(Boolean);

function similarity(a: string, b: string) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

const r1 = (x: number) => Math.round(x * 100) / 100;

/**
 * Aligne les paroles sur les mots entendus (alignement global type Needleman-Wunsch)
 * et renvoie, pour chaque ligne : début, fin et heure de chaque mot affiché.
 */
export function alignLyrics(lines: string[], heard: TimedWord[]): SyncLine[] {
  type Tok = { w: string; line: number; word: number };
  const toks: Tok[] = [];
  lines.forEach((l, i) =>
    splitWords(l).forEach((dw, k) =>
      dw.split(/['’\-]+/).map(norm).filter(Boolean).forEach((w) => toks.push({ w, line: i, word: k })),
    ),
  );
  const hw = heard.map((h) => ({ ...h, n: norm(h.word) })).filter((h) => h.n);
  const m = toks.length, n = hw.length;
  const empty = lines.map((text) => ({ t: null, text, end: null }) as SyncLine);
  if (!m || !n) return empty;

  const GAP = -0.6;
  const score = (i: number, j: number) => {
    const s = similarity(toks[i].w, hw[j].n);
    return s >= 0.8 ? 2 : s >= 0.55 ? 1 : -1;
  };
  const W = n + 1;
  const dp = new Float32Array((m + 1) * W);
  const tb = new Uint8Array((m + 1) * W); // 1 diag, 2 haut, 3 gauche
  for (let i = 1; i <= m; i++) { dp[i * W] = i * GAP; tb[i * W] = 2; }
  for (let j = 1; j <= n; j++) { dp[j] = 0; tb[j] = 3; }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const d = dp[(i - 1) * W + j - 1] + score(i - 1, j - 1);
      const u = dp[(i - 1) * W + j] + GAP;
      const l = dp[i * W + j - 1] + (i === m ? 0 : GAP * 0.5);
      if (d >= u && d >= l) { dp[i * W + j] = d; tb[i * W + j] = 1; }
      else if (u >= l) { dp[i * W + j] = u; tb[i * W + j] = 2; }
      else { dp[i * W + j] = l; tb[i * W + j] = 3; }
    }
  }
  const match: (number | null)[] = new Array(m).fill(null);
  let i = m, j = n;
  while (i > 0 && j > 0) {
    const t = tb[i * W + j];
    if (t === 1) { if (score(i - 1, j - 1) > 0) match[i - 1] = j - 1; i--; j--; }
    else if (t === 2) i--;
    else j--;
  }

  // Heures connues par mot affiché
  const ws: (number | null)[][] = lines.map((l) => splitWords(l).map(() => null));
  const we: (number | null)[][] = lines.map((l) => splitWords(l).map(() => null));
  toks.forEach((tok, k) => {
    const mj = match[k];
    if (mj == null) return;
    const s = ws[tok.line][tok.word], e = we[tok.line][tok.word];
    ws[tok.line][tok.word] = s == null ? hw[mj].start : Math.min(s, hw[mj].start);
    we[tok.line][tok.word] = e == null ? hw[mj].end : Math.max(e, hw[mj].end);
  });

  const starts = enforceOrder(fillGaps(ws.map((row) => row.find((x) => x != null) ?? null)));
  const ends = we.map((row) => [...row].reverse().find((x) => x != null) ?? null);

  const out: SyncLine[] = lines.map((text, li) => ({ t: starts[li], text, end: ends[li] != null && starts[li] != null ? Math.max(ends[li]!, starts[li]! + 0.3) : null }));
  // Mots : heures connues, trous interpolés dans la ligne
  out.forEach((line, li) => {
    if (line.t == null) return;
    const next = out.slice(li + 1).find((l) => l.t != null)?.t ?? null;
    const end = line.end ?? (next != null ? next - 0.3 : line.t + 3);
    line.end = r1(Math.min(end, next ?? Infinity));
    const known = ws[li].map((x) => (x == null ? null : Math.max(line.t!, Math.min(x, line.end!))));
    line.words = interpolateWords(splitWords(line.text), known, line.t, line.end);
  });
  return out;
}

/** Complète les heures de mots manquantes, proportionnellement à la longueur des mots. */
function interpolateWords(words: string[], known: (number | null)[], start: number, end: number): SyncWord[] {
  const n = words.length;
  const t = [...known];
  if (t[0] == null) t[0] = start;
  // bornes : début de ligne, fin de ligne
  const weight = words.map((w) => Math.max(1, w.length));
  let k = 0;
  while (k < n) {
    if (t[k] != null) { k++; continue; }
    const a = k - 1;
    let b = k; while (b < n && t[b] == null) b++;
    const ta = t[a]!, tb = b < n ? t[b]! : end;
    const span = weight.slice(a, b).reduce((x, y) => x + y, 0);
    let acc = weight[a];
    for (let q = k; q < b; q++) { t[q] = ta + ((tb - ta) * acc) / span; acc += weight[q]; }
    k = b;
  }
  let last = start;
  return words.map((w, q) => { const x = Math.max(t[q]!, last); last = x; return { w, t: r1(x) }; });
}

/**
 * Garantit des timings mot à mot cohérents pour toutes les lignes calées
 * (après un tap, une correction manuelle ou un texte modifié).
 */
export function withWords(lines: SyncLine[]): SyncLine[] {
  const timed = lines.filter((l) => l.t != null).sort((a, b) => a.t! - b.t!);
  return timed.map((l, i) => {
    const next = timed[i + 1]?.t ?? null;
    const words = splitWords(l.text);
    const maxEnd = next != null ? next - 0.15 : l.t! + 6;
    const end = Math.min(l.end ?? Math.min(maxEnd, l.t! + Math.max(1.5, words.length * 0.45)), maxEnd);
    const ok = l.words && l.words.length === words.length && l.words.every((w, k) => w.w === words[k] && w.t != null);
    return {
      ...l,
      end,
      words: ok ? l.words : interpolateWords(words, words.map(() => null), l.t!, end),
    };
  });
}

/** Décale une ligne (et ses mots) de delta secondes. */
export function shiftLine(l: SyncLine, newT: number | null): SyncLine {
  if (newT == null || l.t == null) return { ...l, t: newT, words: undefined, end: undefined };
  const d = newT - l.t;
  return {
    ...l,
    t: r1(newT),
    end: l.end != null ? r1(l.end + d) : l.end,
    words: l.words?.map((w) => ({ ...w, t: w.t != null ? r1(w.t + d) : null })),
  };
}

/** Interpole les lignes manquantes entre leurs voisines connues. */
export function fillGaps(t: (number | null)[]): (number | null)[] {
  const out = [...t];
  for (let k = 0; k < out.length; k++) {
    if (out[k] != null) continue;
    let a = k - 1; while (a >= 0 && out[a] == null) a--;
    let b = k + 1; while (b < out.length && t[b] == null) b++;
    if (a >= 0 && b < out.length && out[a] != null && t[b] != null) {
      out[k] = out[a]! + ((t[b]! - out[a]!) * (k - a)) / (b - a);
    }
  }
  return out;
}

function enforceOrder(t: (number | null)[]) {
  let last = -Infinity;
  return t.map((v) => {
    if (v == null) return null;
    const x = Math.max(v, last + 0.3);
    last = x;
    return Math.round(x * 10) / 10;
  });
}

export function fmtTime(t: number | null | undefined) {
  if (t == null || !Number.isFinite(t)) return "--:--.-";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function parseTime(s: string): number | null {
  const m = s.trim().match(/^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2].replace(",", "."));
}
