import type { SyncLine } from "@/lib/types";

export type ClipStyle = "zen" | "karaoke";

export type ClipData = {
  title: string;
  lines: SyncLine[]; // triées, calées, avec words (voir withWords)
  start: number; // début de l'extrait (s)
  duration: number; // durée de l'extrait (s)
  site: string;
  style: ClipStyle;
};

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SUNG = "#fbbf24";
const BASE = "rgba(255,246,234,0.95)";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
    else line = test;
  }
  if (line) out.push(line);
  return out;
}

function block(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, lh = 1.25) {
  const lines = wrap(ctx, text, maxW);
  const total = lines.length * size * lh;
  lines.forEach((l, i) => ctx.fillText(l, x, y - total / 2 + size * lh * (i + 0.5)));
}

type Layout = { portrait: boolean; u: number; midY: number; gap: number; maxW: number };

function layout(W: number, H: number): Layout {
  const portrait = H >= W;
  const u = portrait ? W / 1080 : H / 1080;
  return { portrait, u, midY: portrait ? H * 0.53 : H * 0.56, gap: portrait ? 300 * u : 200 * u, maxW: W * (portrait ? 0.84 : 0.72) };
}

function background(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dim = 0) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#140c08";
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, string][] = [
    [0, 0.13, "rgba(245,158,11,0.55)"],
    [2.1, 0.09, "rgba(190,60,90,0.45)"],
    [4.2, 0.11, "rgba(110,60,150,0.40)"],
    [1.3, 0.07, "rgba(250,200,120,0.25)"],
  ];
  const R = Math.max(W, H);
  for (const [k, speed, color] of blobs) {
    const cx = W * (0.5 + 0.38 * Math.sin(t * speed + k));
    const cy = H * (0.5 + 0.36 * Math.cos(t * speed * 0.8 + k * 1.7));
    const r = R * (0.5 + 0.1 * Math.sin(t * 0.2 + k));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, R * 0.75);
  v.addColorStop(0, `rgba(0,0,0,${dim})`);
  v.addColorStop(1, `rgba(0,0,0,${0.55 + dim})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function header(ctx: CanvasRenderingContext2D, W: number, L: Layout, title: string) {
  const { u, portrait } = L;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,236,210,0.75)";
  ctx.font = `600 ${30 * u}px ${SANS}`;
  ctx.fillText("ZIC-ZIC", W / 2, (portrait ? 150 : 60) * u);
  ctx.fillStyle = "rgba(255,240,220,0.95)";
  ctx.font = `${(portrait ? 62 : 50) * u}px ${SERIF}`;
  block(ctx, title, W / 2, (portrait ? 250 : 125) * u, W * 0.8, (portrait ? 62 : 50) * u);
}

function footer(ctx: CanvasRenderingContext2D, W: number, H: number, L: Layout, t: number, d: ClipData) {
  const { u, portrait } = L;
  const p = clamp((t - d.start) / Math.max(1, d.duration));
  const bw = W * (portrait ? 0.6 : 0.4), bx = (W - bw) / 2, by = H - (portrait ? 210 : 85) * u;
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx, by, bw, 5 * u);
  ctx.fillStyle = "rgba(245,158,11,0.95)";
  ctx.fillRect(bx, by, bw * p, 5 * u);
  ctx.fillStyle = "rgba(255,236,210,0.8)";
  ctx.font = `${(portrait ? 30 : 26) * u}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText(d.site, W / 2, H - (portrait ? 150 : 45) * u);
}

/* ---------------------------- Style « zen » ---------------------------- */

function drawZen(ctx: CanvasRenderingContext2D, W: number, L: Layout, t: number, lines: SyncLine[]) {
  const { u, midY, gap, maxW } = L;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if ((lines[i].t ?? Infinity) <= t) idx = i;
  const breathe = 1 + 0.012 * Math.sin(t * 1.4);
  if (idx === -1) {
    ctx.fillStyle = "rgba(255,240,220,0.6)";
    ctx.font = `${90 * u}px ${SERIF}`;
    ctx.fillText("♪", W / 2, midY);
    return;
  }
  const cur = lines[idx];
  const a = clamp((t - (cur.t ?? t)) / 0.45);
  if (idx > 0) {
    ctx.globalAlpha = 0.28 * (1 - a * 0.4);
    ctx.fillStyle = "#fff1e0";
    ctx.font = `${50 * u}px ${SERIF}`;
    block(ctx, lines[idx - 1].text, W / 2, midY - gap, maxW * 0.95, 50 * u);
  }
  ctx.save();
  ctx.translate(W / 2, midY + (1 - a) * 30 * u);
  ctx.scale(breathe, breathe);
  ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30 * u;
  ctx.fillStyle = "#fff6ea";
  ctx.font = `${84 * u}px ${SERIF}`;
  block(ctx, cur.text, 0, 0, maxW, 84 * u, 1.22);
  ctx.restore();
  if (idx + 1 < lines.length) {
    ctx.globalAlpha = 0.42 * a;
    ctx.fillStyle = "#ffe9cf";
    ctx.font = `${46 * u}px ${SERIF}`;
    block(ctx, lines[idx + 1].text, W / 2, midY + gap, maxW * 0.95, 46 * u);
  }
  ctx.globalAlpha = 1;
}

/* -------------------------- Style « karaoké » -------------------------- */

type Placed = { w: string; x: number; y: number; width: number; k: number };

function placeWords(ctx: CanvasRenderingContext2D, words: string[], cx: number, cy: number, maxW: number, size: number, lh = 1.28): Placed[] {
  const space = ctx.measureText(" ").width;
  const rows: { items: { w: string; width: number; k: number }[]; width: number }[] = [];
  let row: (typeof rows)[number] = { items: [], width: 0 };
  words.forEach((w, k) => {
    const width = ctx.measureText(w).width;
    const add = (row.items.length ? space : 0) + width;
    if (row.items.length && row.width + add > maxW) { rows.push(row); row = { items: [], width: 0 }; }
    row.width += (row.items.length ? space : 0) + width;
    row.items.push({ w, width, k });
  });
  if (row.items.length) rows.push(row);
  const total = rows.length * size * lh;
  const out: Placed[] = [];
  rows.forEach((r, ri) => {
    let x = cx - r.width / 2;
    const y = cy - total / 2 + size * lh * (ri + 0.5);
    r.items.forEach((it) => { out.push({ w: it.w, x, y, width: it.width, k: it.k }); x += it.width + space; });
  });
  return out;
}

/** Ligne karaoké : les mots se colorent au rythme du chant (balayage progressif dans le mot en cours). */
function karaokeLine(ctx: CanvasRenderingContext2D, line: SyncLine, cx: number, cy: number, maxW: number, size: number, t: number, alpha = 1) {
  const words = line.words ?? line.text.split(/\s+/).map((w) => ({ w, t: line.t }));
  ctx.font = `600 ${size}px ${SERIF}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const placed = placeWords(ctx, words.map((w) => w.w), cx, cy, maxW, size);
  const end = line.end ?? (line.t ?? 0) + 3;
  ctx.globalAlpha = alpha;
  for (const p of placed) {
    const ws = words[p.k].t ?? line.t ?? 0;
    const we = words[p.k + 1]?.t ?? end;
    const prog = clamp((t - ws) / Math.max(0.12, we - ws));
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18 * (size / 84);
    ctx.fillStyle = BASE;
    ctx.fillText(p.w, p.x, p.y);
    if (prog > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x - 2, p.y - size, (p.width + 4) * prog, size * 2);
      ctx.clip();
      ctx.shadowBlur = 0;
      ctx.fillStyle = SUNG;
      ctx.fillText(p.w, p.x, p.y);
      ctx.restore();
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
}

function countdownDots(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number, remaining: number) {
  const n = Math.ceil(remaining); // 3, 2, 1
  const r = 16 * u, spacing = 56 * u;
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * spacing;
    const on = i < n;
    const pulse = on && i === n - 1 ? 1 + 0.25 * Math.sin((remaining % 1) * Math.PI) : 1;
    ctx.beginPath();
    ctx.arc(x, cy, r * pulse, 0, Math.PI * 2);
    if (on) { ctx.fillStyle = SUNG; ctx.fill(); }
    else { ctx.strokeStyle = "rgba(255,246,234,0.35)"; ctx.lineWidth = 3 * u; ctx.stroke(); }
  }
}

function drawKaraoke(ctx: CanvasRenderingContext2D, W: number, L: Layout, t: number, d: ClipData) {
  const { u, midY, gap, maxW } = L;
  const lines = d.lines;
  if (!lines.length) return;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if ((lines[i].t ?? Infinity) <= t) idx = i;
  const cur = idx >= 0 ? lines[idx] : null;
  const next = lines[idx + 1] ?? null;
  const curEnd = cur ? cur.end ?? next?.t ?? (cur.t ?? 0) + 3 : null;
  const singing = cur != null && t <= (curEnd ?? 0) + 0.35;
  const big = 84 * u, small = 52 * u;

  if (singing && cur) {
    if (idx > 0) karaokeLine(ctx, lines[idx - 1], W / 2, midY - gap, maxW * 0.95, small, Infinity, 0.3);
    karaokeLine(ctx, cur, W / 2, midY, maxW, big, t);
    if (next && next.t! - t < 6) karaokeLine(ctx, next, W / 2, midY + gap, maxW * 0.95, small, -Infinity, 0.55);
    return;
  }

  // --- Pause : on prépare la reprise ---
  if (!next) {
    ctx.fillStyle = "rgba(255,240,220,0.85)";
    ctx.font = `${70 * u}px ${SERIF}`;
    ctx.fillText("♪ Merci d’avoir chanté ! ♪", W / 2, midY);
    return;
  }
  const waitFrom = curEnd ?? Math.min(d.start, next.t!);
  const pause = next.t! - waitFrom;
  const toNext = next.t! - t;

  if (toNext <= 3.2 || pause < 3) {
    // Décompte : ● ● ● puis la ligne à chanter
    if (pause >= 2) countdownDots(ctx, W / 2, midY - gap * 0.95, u, clamp(toNext, 0, 3));
    ctx.fillStyle = "rgba(255,236,210,0.8)";
    ctx.font = `600 ${28 * u}px ${SANS}`;
    if (pause >= 2) ctx.fillText(toNext > 0.15 ? "Prépare-toi…" : "Chante !", W / 2, midY - gap * 0.7);
    karaokeLine(ctx, next, W / 2, midY, maxW, big, -Infinity);
    const after = lines[idx + 2];
    if (after) karaokeLine(ctx, after, W / 2, midY + gap, maxW * 0.95, small, -Infinity, 0.45);
    return;
  }

  // Longue pause instrumentale
  const p = clamp((t - waitFrom) / Math.max(1, pause - 3.2));
  ctx.fillStyle = "rgba(255,240,220,0.9)";
  ctx.font = `${64 * u}px ${SERIF}`;
  ctx.fillText("♪  Instrumental  ♪", W / 2, midY - 40 * u);
  ctx.font = `${32 * u}px ${SANS}`;
  ctx.fillStyle = "rgba(255,236,210,0.75)";
  ctx.fillText(`Reprise dans ${Math.ceil(toNext)} s`, W / 2, midY + 30 * u);
  const bw = maxW * 0.5, bx = (W - bw) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx, midY + 80 * u, bw, 6 * u);
  ctx.fillStyle = SUNG;
  ctx.fillRect(bx, midY + 80 * u, bw * p, 6 * u);
  karaokeLine(ctx, next, W / 2, midY + gap, maxW * 0.95, small, -Infinity, 0.45);
}

/** Dessine une image du clip à l'instant t du morceau (toute taille, portrait ou paysage). */
export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, d: ClipData) {
  const L = layout(W, H);
  background(ctx, W, H, t, d.style === "karaoke" ? 0.15 : 0);
  header(ctx, W, L, d.title);
  if (d.style === "karaoke") drawKaraoke(ctx, W, L, t, d);
  else drawZen(ctx, W, L, t, d.lines);
  footer(ctx, W, H, L, t, d);
}
