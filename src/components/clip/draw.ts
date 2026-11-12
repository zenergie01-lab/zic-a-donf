import type { SyncLine } from "@/lib/types";

export type ClipData = {
  title: string;
  lines: SyncLine[]; // triées par temps, t non nul
  start: number; // début de l'extrait dans le morceau (s)
  duration: number; // durée de l'extrait (s)
  site: string;
};

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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
  return total;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Dessine une image du clip (format vertical) pour un instant du morceau. Fonctionne à toute taille. */
export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, songTime: number, d: ClipData) {
  const u = W / 1080; // unité : 1 px à 1080 de large
  const t = songTime;

  // --- Fond : dégradé zen qui ondule lentement ---
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#140c08";
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, string][] = [
    [0, 0.13, "rgba(245,158,11,0.55)"],
    [2.1, 0.09, "rgba(190,60,90,0.45)"],
    [4.2, 0.11, "rgba(110,60,150,0.40)"],
    [1.3, 0.07, "rgba(250,200,120,0.25)"],
  ];
  for (const [k, speed, color] of blobs) {
    const cx = W * (0.5 + 0.38 * Math.sin(t * speed + k));
    const cy = H * (0.5 + 0.36 * Math.cos(t * speed * 0.8 + k * 1.7));
    const r = W * (0.85 + 0.15 * Math.sin(t * 0.2 + k));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Vignette douce
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.4, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // --- En-tête ---
  ctx.fillStyle = "rgba(255,236,210,0.75)";
  ctx.font = `600 ${30 * u}px ${SANS}`;
  ctx.fillText("ZIC À DONF", W / 2, 150 * u);
  ctx.fillStyle = "rgba(255,240,220,0.95)";
  ctx.font = `${62 * u}px ${SERIF}`;
  block(ctx, d.title, W / 2, 250 * u, W * 0.8, 62 * u);

  // --- Paroles ---
  const lines = d.lines;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if ((lines[i].t ?? Infinity) <= t) idx = i;

  const midY = H * 0.53;
  const breathe = 1 + 0.012 * Math.sin(t * 1.4);
  if (idx === -1) {
    ctx.fillStyle = "rgba(255,240,220,0.6)";
    ctx.font = `${90 * u}px ${SERIF}`;
    ctx.fillText("♪", W / 2, midY);
  } else {
    const cur = lines[idx];
    const since = t - (cur.t ?? t);
    const a = clamp(since / 0.45);
    // ligne précédente
    if (idx > 0) {
      ctx.globalAlpha = 0.28 * (1 - a * 0.4);
      ctx.fillStyle = "#fff1e0";
      ctx.font = `${50 * u}px ${SERIF}`;
      block(ctx, lines[idx - 1].text, W / 2, midY - 300 * u, W * 0.8, 50 * u);
    }
    // ligne en cours
    ctx.save();
    ctx.translate(W / 2, midY + (1 - a) * 30 * u);
    ctx.scale(breathe, breathe);
    ctx.globalAlpha = a;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30 * u;
    ctx.fillStyle = "#fff6ea";
    ctx.font = `${84 * u}px ${SERIF}`;
    block(ctx, cur.text, 0, 0, W * 0.84, 84 * u, 1.22);
    ctx.restore();
    // ligne suivante
    if (idx + 1 < lines.length) {
      ctx.globalAlpha = 0.42 * a;
      ctx.fillStyle = "#ffe9cf";
      ctx.font = `${46 * u}px ${SERIF}`;
      block(ctx, lines[idx + 1].text, W / 2, midY + 320 * u, W * 0.8, 46 * u);
    }
  }
  ctx.globalAlpha = 1;

  // --- Pied : progression + adresse ---
  const p = clamp((t - d.start) / Math.max(1, d.duration));
  const bw = W * 0.6, bx = (W - bw) / 2, by = H - 210 * u;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx, by, bw, 5 * u);
  ctx.fillStyle = "rgba(245,158,11,0.95)";
  ctx.fillRect(bx, by, bw * p, 5 * u);
  ctx.fillStyle = "rgba(255,236,210,0.8)";
  ctx.font = `${30 * u}px ${SANS}`;
  ctx.fillText(d.site, W / 2, H - 150 * u);
}
