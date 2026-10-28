export type DotPainter = (ctx: CanvasRenderingContext2D, time: number) => void;

export const DOT_INK = "236,236,238";
export const DOT_TINTS = {
  games: "143,214,196",
  music: "240,168,184",
  watch: "230,194,122",
  read: "174,185,242",
  ok: "95,211,138",
  warn: "245,165,36",
  danger: "240,79,79",
} as const;

const plus = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
  arm: number,
  color: string,
  thickness = 0.9,
) => {
  ctx.fillStyle = `rgba(${color},${alpha.toFixed(2)})`;
  ctx.fillRect(x - arm, y - thickness / 2, arm * 2, thickness);
  ctx.fillRect(x - thickness / 2, y - arm, thickness, arm * 2);
};

export const seededRandom = (count: number, seed: number) => {
  let s = seed;
  return new Float32Array(count).map(() => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  });
};

const alphaMask = (
  w: number,
  h: number,
  draw: (x: CanvasRenderingContext2D) => void,
): Float32Array => {
  const out = new Float32Array(w * h);
  if (typeof document === "undefined") return out;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (!x) return out;
  draw(x);
  const d = x.getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) out[i] = d[i * 4 + 3] / 255;
  return out;
};

export const MORPH_GRID = { w: 150, h: 96, step: 4 } as const;
export const MORPH_PERIOD_SEC = 3.6;
export const MORPH_TINTS = [
  DOT_TINTS.games,
  DOT_TINTS.music,
  DOT_TINTS.watch,
  DOT_TINTS.read,
] as const;

const roundRect = (
  x: CanvasRenderingContext2D,
  a: number,
  b: number,
  w: number,
  h: number,
  r: number,
) => {
  x.beginPath();
  x.moveTo(a + r, b);
  x.arcTo(a + w, b, a + w, b + h, r);
  x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r);
  x.arcTo(a, b, a + w, b, r);
  x.closePath();
};

const dot = (x: CanvasRenderingContext2D, a: number, b: number, r: number) => {
  x.beginPath();
  x.arc(a, b, r, 0, 7);
  x.fill();
};

const drawPad = (x: CanvasRenderingContext2D) => {
  x.beginPath();
  x.moveTo(48, 22);
  x.lineTo(102, 22);
  x.bezierCurveTo(118, 22, 126, 30, 130, 46);
  x.lineTo(138, 74);
  x.bezierCurveTo(141, 86, 133, 92, 125, 92);
  x.bezierCurveTo(118, 92, 114, 87, 110, 81);
  x.lineTo(102, 70);
  x.lineTo(48, 70);
  x.lineTo(40, 81);
  x.bezierCurveTo(36, 87, 32, 92, 25, 92);
  x.bezierCurveTo(17, 92, 9, 86, 12, 74);
  x.lineTo(20, 46);
  x.bezierCurveTo(24, 30, 32, 22, 48, 22);
  x.fill();
  x.globalCompositeOperation = "destination-out";
  x.fillRect(38, 42, 16, 5);
  x.fillRect(43.5, 36.5, 5, 16);
  for (const [a, b] of [[104, 37], [113, 45], [95, 45], [104, 53]]) dot(x, a, b, 3.2);
  dot(x, 62, 60, 6);
  dot(x, 88, 60, 6);
};

const drawVinyl = (x: CanvasRenderingContext2D) => {
  dot(x, 75, 48, 44);
  x.globalCompositeOperation = "destination-out";
  for (const r of [38, 31, 24]) {
    x.lineWidth = 1.2;
    x.strokeStyle = "rgba(0,0,0,0.6)";
    x.beginPath();
    x.arc(75, 48, r, 0, 7);
    x.stroke();
  }
  dot(x, 75, 48, 3);
  x.globalCompositeOperation = "source-over";
  x.fillStyle = "rgba(255,255,255,0.35)";
  dot(x, 75, 48, 12);
};

const drawScreen = (x: CanvasRenderingContext2D) => {
  roundRect(x, 22, 14, 106, 66, 8);
  x.fill();
  x.fillRect(66, 80, 18, 6);
  roundRect(x, 52, 86, 46, 4, 2);
  x.fill();
  x.globalCompositeOperation = "destination-out";
  x.beginPath();
  x.moveTo(66, 32);
  x.lineTo(66, 62);
  x.lineTo(90, 47);
  x.closePath();
  x.fill();
};

const drawBook = (x: CanvasRenderingContext2D) => {
  x.beginPath();
  x.moveTo(75, 24);
  x.bezierCurveTo(60, 14, 36, 12, 14, 18);
  x.lineTo(14, 82);
  x.bezierCurveTo(36, 76, 60, 78, 75, 88);
  x.bezierCurveTo(90, 78, 114, 76, 136, 82);
  x.lineTo(136, 18);
  x.bezierCurveTo(114, 12, 90, 14, 75, 24);
  x.closePath();
  x.fill();
  x.globalCompositeOperation = "destination-out";
  x.fillRect(74.2, 22, 1.6, 66);
  x.fillStyle = "rgba(0,0,0,0.5)";
  for (const y of [34, 44, 54, 64]) {
    x.fillRect(24, y, 40, 1);
    x.fillRect(86, y, 40, 1);
  }
};

const SHAPES = [drawPad, drawVinyl, drawScreen, drawBook];

const drawMorphShape =
  (draw: (x: CanvasRenderingContext2D) => void) =>
  (x: CanvasRenderingContext2D) => {
    const { w: W, h: H } = MORPH_GRID;
    const g = x.createRadialGradient(W * 0.5, H * 0.42, 4, W * 0.5, H * 0.5, W * 0.42);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0.45)");
    x.fillStyle = g;
    draw(x);
  };

export const morphIndexAt = (time: number) =>
  Math.floor(time / MORPH_PERIOD_SEC) % MORPH_TINTS.length;

export const createMorphPainter = (): DotPainter => {
  const { w: W, h: H, step: S } = MORPH_GRID;
  const rnd = seededRandom(W * H, 13);
  let shapes: Float32Array[] | null = null;
  return (ctx, time) => {
    shapes ??= SHAPES.map((d) => alphaMask(W, H, drawMorphShape(d)));
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const phase = time / MORPH_PERIOD_SEC;
    const idx = morphIndexAt(time);
    const nxt = (idx + 1) % shapes.length;
    const frac = phase - Math.floor(phase);
    const A = shapes[idx];
    const B = shapes[nxt];
    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const i = gy * W + gx;
        const r = rnd[i];
        const k = Math.max(0, Math.min(1, (frac - 0.62 - r * 0.26) / 0.12));
        let v = A[i] * (1 - k) + B[i] * k;
        if (v < 0.04) {
          if (r > 0.994) v = 0.2 + 0.5 * Math.max(0, Math.sin(time * 1.3 + r * 900));
          else continue;
        }
        const a = v * (0.72 + 0.28 * Math.sin(time * 2.6 + r * 40));
        const warm = v > 0.8 && r < 0.3;
        const color = warm ? MORPH_TINTS[k < 0.5 ? idx : nxt] : DOT_INK;
        plus(ctx, gx * S + S / 2, gy * S + S / 2, a, 0.5 + v * 1.3, color);
      }
    }
  };
};

export type LinkState = "pending" | "ok" | "no";

const linkStream = (state: LinkState, x: number, y: number, cy: number, time: number) => {
  const wave = Math.pow(Math.max(0, Math.sin(x * 0.045 - time * 4)), 6);
  if (state === "no") return 0.08;
  if (state === "ok") return 0.3 + 0.7 * wave;
  return 0.12 + 0.6 * wave * (1 - Math.abs(y - cy) / 14);
};

export const createLinkPainter =
  (state: LinkState): DotPainter =>
  (ctx, time) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const step = 8;
    ctx.clearRect(0, 0, W, H);
    const cx1 = W * 0.2;
    const cx2 = W * 0.8;
    const cy = H * 0.5;
    const R = H * 0.3;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        const d1 = Math.hypot(x - cx1, y - cy);
        const d2 = Math.hypot(x - cx2, y - cy);
        let v: number;
        let col: string = DOT_INK;
        if (d1 < R) {
          v = 0.3 + 0.7 * (1 - d1 / R);
          if (d1 < R * 0.55) col = DOT_TINTS.games;
        } else if (d2 < R) {
          v = 0.3 + 0.7 * (1 - d2 / R);
        } else if (
          Math.abs(d1 - R - 14) < 4 &&
          Math.sin(Math.atan2(y - cy, x - cx1) * 9 + time * 1.6) > 0.2
        ) {
          v = 0.35;
        } else if (
          Math.abs(d2 - R - 14) < 4 &&
          Math.sin(Math.atan2(y - cy, x - cx2) * 9 - time * 1.6) > 0.2
        ) {
          v = 0.35;
        } else if (Math.abs(y - cy) < 13 && x > cx1 + R + 26 && x < cx2 - R - 26) {
          v = linkStream(state, x, y, cy, time);
          col = state === "ok" ? DOT_TINTS.ok : DOT_INK;
        } else continue;
        const a = Math.min(1, v * (0.78 + 0.22 * Math.sin(time * 2.4 + x * 0.21 + y * 0.13)));
        if (a < 0.05) continue;
        plus(ctx, x, y, a, 0.8 + a * 2.2, col, 1.2);
      }
    }
  };

export const GLYPH_GRID = { w: 64, h: 28, step: 9 } as const;

export const createGlyphPainter = (text: string, tint: string): DotPainter => {
  const { w: W, h: H, step: S } = GLYPH_GRID;
  const rnd = seededRandom(W * H * 3, 21);
  let glyph: Float32Array | null = null;
  let start: number | null = null;
  return (ctx, time) => {
    glyph ??= alphaMask(W, H, (x) => {
      x.fillStyle = "#ffffff";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font = '700 25px "JetBrains Mono", ui-monospace, monospace';
      x.fillText(text, W / 2, H / 2 + 1);
    });
    start ??= time;
    const age = time - start;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const i = gy * W + gx;
        const r = rnd[i];
        const v = glyph[i];
        const px0 = gx * S + S / 2;
        const py0 = gy * S + S / 2;
        if (v < 0.1) {
          if (r > 0.985) {
            const a = 0.08 + 0.12 * Math.max(0, Math.sin(time * 1.2 + r * 700));
            plus(ctx, px0, py0, a, 1.2, DOT_INK, 1.4);
          }
          continue;
        }
        const k = Math.max(0, Math.min(1, (age - r * 0.5) / 0.9));
        const e = 1 - Math.pow(1 - k, 3);
        const sx = (rnd[i + W * H] - 0.5) * cw * 0.6;
        const sy = (rnd[i + W * H * 2] - 0.5) * ch * 0.9;
        const tw = 0.74 + 0.26 * Math.sin(time * 2.4 + r * 50);
        const a = v * tw * (0.2 + 0.8 * e);
        const color = r < 0.32 ? tint : DOT_INK;
        plus(ctx, px0 + sx * (1 - e), py0 + sy * (1 - e), a, 1 + v * 2.6, color, 1.4);
      }
    }
  };
};

export const createRingPainter = (): DotPainter => (ctx, time) => {
  const { w: W, h: H, step: S } = GLYPH_GRID;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = W / 2;
  const cy = H / 2;
  const R = 10.5;
  const head = time * 3.2;
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      const dx = gx - cx + 0.5;
      const dy = gy - cy + 0.5;
      const d = Math.hypot(dx, dy);
      const px = gx * S + S / 2;
      const py = gy * S + S / 2;
      if (Math.abs(d - R) < 0.9) {
        let ang = Math.atan2(dy, dx) - head;
        ang = ((ang % 6.2832) + 6.2832) % 6.2832;
        const v = Math.max(0.1, 1 - ang / 4.2);
        plus(ctx, px, py, v, 0.9 + v * 2.4, v > 0.92 ? "255,255,255" : DOT_INK, 1.4);
      } else if (d < 3) {
        const v = 0.25 + 0.25 * Math.sin(time * 3);
        plus(ctx, px, py, v, 1 + v * 2, DOT_INK, 1.4);
      }
    }
  }
};
