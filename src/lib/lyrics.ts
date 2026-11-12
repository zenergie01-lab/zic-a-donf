/** Outils paroles : nettoyage et alignement sur la transcription horodatée. */

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

/**
 * Aligne les mots des paroles sur les mots entendus (alignement global de type Needleman-Wunsch),
 * puis renvoie l'heure de début de chaque ligne (null si introuvable, interpolée ensuite).
 */
export function alignLines(lines: string[], heard: TimedWord[]): (number | null)[] {
  const lyr: { w: string; line: number }[] = [];
  lines.forEach((l, i) => l.split(/[\s'’-]+/).map(norm).filter(Boolean).forEach((w) => lyr.push({ w, line: i })));
  const hw = heard.map((h) => ({ ...h, n: norm(h.word) })).filter((h) => h.n);
  const m = lyr.length, n = hw.length;
  if (!m || !n) return lines.map(() => null);

  const GAP = -0.6;
  const score = (i: number, j: number) => {
    const s = similarity(lyr[i].w, hw[j].n);
    return s >= 0.8 ? 2 : s >= 0.55 ? 1 : -1;
  };
  // Matrice de scores (Float32 pour rester léger)
  const W = n + 1;
  const dp = new Float32Array((m + 1) * W);
  const tb = new Uint8Array((m + 1) * W); // 1 diag, 2 haut, 3 gauche
  for (let i = 1; i <= m; i++) { dp[i * W] = i * GAP; tb[i * W] = 2; }
  for (let j = 1; j <= n; j++) { dp[j] = 0; tb[j] = 3; } // mots entendus avant le début : gratuits (intro, ad-libs)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const d = dp[(i - 1) * W + j - 1] + score(i - 1, j - 1);
      const u = dp[(i - 1) * W + j] + GAP;
      const l = dp[i * W + j - 1] + (i === m ? 0 : GAP * 0.5); // mots entendus en trop : peu pénalisés
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

  const starts: (number | null)[] = lines.map(() => null);
  lyr.forEach((tok, k) => {
    const mj = match[k];
    if (mj != null && starts[tok.line] == null) starts[tok.line] = hw[mj].start;
  });
  return enforceOrder(fillGaps(starts));
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
