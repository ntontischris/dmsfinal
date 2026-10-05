// Πρόταση 4 · scopes από τα πραγματικά pixels της διορθωμένης εικόνας.

import { yuvToRgb } from "@/directions/home/home-04-grade";

const STEP = 3;
const ZOOM = 1.5;

const paintCounts = (
  ctx: CanvasRenderingContext2D,
  counts: Float32Array,
  tint: (i: number) => [number, number, number],
  gainScale: number,
) => {
  const { width, height } = ctx.canvas;
  const out = ctx.createImageData(width, height);
  for (let i = 0; i < counts.length; i++) {
    if (!counts[i]) continue;
    const a = Math.min(1, Math.log1p(counts[i]) / gainScale);
    const [r, g, b] = tint(i);
    out.data[i * 4] = r;
    out.data[i * 4 + 1] = g;
    out.data[i * 4 + 2] = b;
    out.data[i * 4 + 3] = a * 255;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(out, 0, 0);
};

const graticule = (ctx: CanvasRenderingContext2D) => {
  const { width, height } = ctx.canvas;
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.font = "9px ui-monospace, monospace";
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
    const y = Math.round(4 + (height - 8) * (1 - p)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(p * 1023)), 3, y - 2);
  });
};

export const drawWaveform = (
  ctx: CanvasRenderingContext2D,
  image: ImageData,
) => {
  const { width, height } = ctx.canvas;
  const counts = new Float32Array(width * height);
  const d = image.data;
  for (let y = 0; y < image.height; y += STEP) {
    for (let x = 0; x < image.width; x += STEP) {
      const i = (y * image.width + x) * 4;
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      const sx = Math.floor((x / image.width) * width);
      const sy = Math.floor(4 + (height - 8) * (1 - l));
      counts[sy * width + sx]++;
    }
  }
  paintCounts(ctx, counts, () => [190, 255, 210], 3.2);
  graticule(ctx);
};

export const drawParade = (ctx: CanvasRenderingContext2D, image: ImageData) => {
  const { width, height } = ctx.canvas;
  const counts = new Float32Array(width * height);
  const channelOf = new Uint8Array(width * height);
  const third = width / 3;
  const d = image.data;
  for (let y = 0; y < image.height; y += STEP) {
    for (let x = 0; x < image.width; x += STEP) {
      const i = (y * image.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const sx = Math.floor(c * third + (x / image.width) * (third - 4) + 2);
        const sy = Math.floor(4 + (height - 8) * (1 - d[i + c] / 255));
        counts[sy * width + sx]++;
        channelOf[sy * width + sx] = c;
      }
    }
  }
  const tints: [number, number, number][] = [
    [255, 90, 80],
    [90, 240, 120],
    [90, 150, 255],
  ];
  paintCounts(ctx, counts, (i) => tints[channelOf[i]], 3);
  graticule(ctx);
};

export const drawVectorscope = (
  ctx: CanvasRenderingContext2D,
  image: ImageData,
) => {
  const { width } = ctx.canvas;
  const radius = width / 2 - 6;
  const center = width / 2;
  const counts = new Float32Array(width * width);
  const colors = new Float32Array(width * width * 3);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4 * STEP) {
    const [r, g, b] = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const u = 0.492 * (b - y);
    const v = 0.877 * (r - y);
    const sx = Math.round(center + (u / 0.62) * radius * ZOOM);
    const sy = Math.round(center - (v / 0.62) * radius * ZOOM);
    if (sx < 0 || sy < 0 || sx >= width || sy >= width) continue;
    const k = sy * width + sx;
    counts[k]++;
    colors[k * 3] += d[i];
    colors[k * 3 + 1] += d[i + 1];
    colors[k * 3 + 2] += d[i + 2];
  }
  paintCounts(
    ctx,
    counts,
    (k) => {
      const n = counts[k];
      const boost = (c: number) => Math.min(255, (c / n) * 1.5 + 50);
      return [
        boost(colors[k * 3]),
        boost(colors[k * 3 + 1]),
        boost(colors[k * 3 + 2]),
      ];
    },
    2.6,
  );
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.moveTo(center - radius, center);
  ctx.lineTo(center + radius, center);
  ctx.moveTo(center, center - radius);
  ctx.lineTo(center, center + radius);
  ctx.stroke();
  // Γραμμή απόχρωσης δέρματος.
  ctx.strokeStyle = "rgba(255,200,150,0.35)";
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.lineTo(
    center + Math.cos((-123 * Math.PI) / 180) * radius,
    center + Math.sin((-123 * Math.PI) / 180) * radius,
  );
  ctx.stroke();
  ctx.font = "9px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  const targets: [string, number, number, number][] = [
    ["R", 0.75, 0, 0],
    ["Mg", 0.75, 0, 0.75],
    ["B", 0, 0, 0.75],
    ["Cy", 0, 0.75, 0.75],
    ["G", 0, 0.75, 0],
    ["Yl", 0.75, 0.75, 0],
  ];
  targets.forEach(([label, r, g, b]) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const sx = center + ((0.492 * (b - y)) / 0.62) * radius * ZOOM;
    const sy = center - ((0.877 * (r - y)) / 0.62) * radius * ZOOM;
    if (Math.hypot(sx - center, sy - center) > radius - 6) return;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(sx - 4, sy - 4, 8, 8);
    ctx.fillText(label, sx + 6, sy + 3);
  });
};

// Ο τροχός χρώματος: κάθε σημείο είναι το χρώμα που προσθέτει ο κέρσορας εκεί.
export const drawWheel = (ctx: CanvasRenderingContext2D) => {
  const size = ctx.canvas.width;
  const image = ctx.createImageData(size, size);
  const half = size / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - half) / half;
      const dy = (py - half) / half;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) continue;
      const [r, g, b] = yuvToRgb(0.5, dx * 0.42, -dy * 0.42);
      const shade = 0.55 + 0.45 * dist;
      const i = (py * size + px) * 4;
      image.data[i] = (0.5 + (r - 0.5) * shade) * 255;
      image.data[i + 1] = (0.5 + (g - 0.5) * shade) * 255;
      image.data[i + 2] = (0.5 + (b - 0.5) * shade) * 255;
      image.data[i + 3] = Math.min(1, (1 - dist) * half) * 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};
