// Πρόταση 4 · μηχανή χρωματικής διόρθωσης: ζωγραφίζει τη σκηνή, εφαρμόζει Lift/Gamma/Gain
// ανά κανάλι (LUT) και σχεδιάζει waveform, RGB parade και vectorscope από τα πραγματικά pixels.

export interface Wheel {
  x: number;
  y: number;
  lum: number;
}
export interface Grade {
  lift: Wheel;
  gamma: Wheel;
  gain: Wheel;
  sat: number;
}

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

// YUV (BT.601): ίδιο σύστημα για τροχούς και vectorscope, ώστε να «δείχνουν» το ίδιο.
export const yuvToRgb = (
  y: number,
  u: number,
  v: number,
): [number, number, number] => [
  y + 1.13983 * v,
  y - 0.39465 * u - 0.5806 * v,
  y + 2.03211 * u,
];
const chroma = (w: Wheel) => yuvToRgb(0, w.x * 0.5, -w.y * 0.5);

export const LOOKS: readonly { name: string; grade: Grade }[] = [
  {
    name: "Ουδέτερο",
    grade: {
      lift: { x: 0, y: 0, lum: 0 },
      gamma: { x: 0, y: 0, lum: 0 },
      gain: { x: 0, y: 0, lum: 0 },
      sat: 1,
    },
  },
  {
    name: "Teal & orange",
    grade: {
      lift: { x: 0.34, y: 0.38, lum: -0.08 },
      gamma: { x: -0.08, y: -0.1, lum: 0.06 },
      gain: { x: -0.3, y: -0.34, lum: 0.08 },
      sat: 1.22,
    },
  },
  {
    name: "Χρυσή ώρα",
    grade: {
      lift: { x: -0.12, y: -0.1, lum: 0 },
      gamma: { x: -0.26, y: -0.22, lum: 0.12 },
      gain: { x: -0.32, y: -0.18, lum: 0.1 },
      sat: 1.3,
    },
  },
  {
    name: "Νυχτερινό",
    grade: {
      lift: { x: 0.4, y: 0.18, lum: -0.1 },
      gamma: { x: 0.36, y: 0.12, lum: -0.22 },
      gain: { x: 0.22, y: 0.1, lum: -0.12 },
      sat: 0.85,
    },
  },
  {
    name: "Bleach bypass",
    grade: {
      lift: { x: 0.06, y: 0.04, lum: -0.12 },
      gamma: { x: 0, y: 0, lum: -0.08 },
      gain: { x: -0.04, y: -0.02, lum: 0.14 },
      sat: 0.45,
    },
  },
];

export const DEFAULT_GRADE = LOOKS[1].grade;

const buildLut = (grade: Grade, channel: 0 | 1 | 2): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(256);
  const lift = grade.lift.lum * 0.25 + chroma(grade.lift)[channel] * 0.12;
  const gain = 1 + grade.gain.lum * 0.5 + chroma(grade.gain)[channel] * 0.22;
  const exponent =
    2 ** -((grade.gamma.lum * 0.5 + chroma(grade.gamma)[channel] * 0.3) * 1.2);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    lut[i] = clamp((x + lift * (1 - x)) * gain) ** exponent * 255;
  }
  return lut;
};

const transform = (
  src: ImageData,
  dst: ImageData,
  luts: Uint8ClampedArray[],
  sat: number,
) => {
  const s = src.data;
  const d = dst.data;
  const [lr, lg, lb] = luts;
  for (let i = 0; i < s.length; i += 4) {
    const r = lr[s[i]];
    const g = lg[s[i + 1]];
    const b = lb[s[i + 2]];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    d[i] = l + (r - l) * sat;
    d[i + 1] = l + (g - l) * sat;
    d[i + 2] = l + (b - l) * sat;
    d[i + 3] = 255;
  }
};

export const applyGrade = (src: ImageData, dst: ImageData, grade: Grade) =>
  transform(
    src,
    dst,
    [buildLut(grade, 0), buildLut(grade, 1), buildLut(grade, 2)],
    grade.sat,
  );

// LOG: επίπεδη καμπύλη και χαμηλός κορεσμός, όπως βγαίνει από την κάμερα.
export const applyLog = (src: ImageData, dst: ImageData) => {
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++)
    lut[i] = (0.13 + 0.7 * (Math.log2(1 + 6 * (i / 255)) / Math.log2(7))) * 255;
  transform(src, dst, [lut, lut, lut], 0.5);
};

/* Σκηνή: ηλιοβασίλεμα στον Θερμαϊκό, Νέα Παραλία, «Ομπρέλες». */

const glow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

const random = (seed: number) => () =>
  ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const paintSky = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
) => {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  [
    ["#16204a", 0],
    ["#3b3470", 0.28],
    ["#a8506e", 0.58],
    ["#ec8d58", 0.82],
    ["#ffd59c", 1],
  ].forEach(([c, p]) => sky.addColorStop(p as number, c as string));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);
  glow(ctx, w * 0.63, horizon - h * 0.03, h * 0.62, "rgba(255,196,130,0.55)");
  const rand = random(7);
  for (let i = 0; i < 14; i++) {
    ctx.save();
    ctx.translate(rand() * w, h * (0.12 + rand() * 0.32));
    ctx.scale(5 + rand() * 4, 1);
    glow(
      ctx,
      0,
      0,
      h * (0.025 + rand() * 0.03),
      `rgba(${200 + rand() * 55},${110 + rand() * 50},${120 + rand() * 30},0.35)`,
    );
    ctx.restore();
  }
  glow(ctx, w * 0.63, horizon - h * 0.025, h * 0.05, "rgba(255,248,225,1)");
  glow(ctx, w * 0.63, horizon - h * 0.025, h * 0.032, "rgba(255,255,240,1)");
};

const paintMountains = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
) => {
  const ridge = (points: number[][], color: string) => {
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    points.forEach(([x, y]) => ctx.lineTo(x * w, horizon - y * h));
    ctx.lineTo(points[points.length - 1][0] * w, horizon);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ridge(
    [
      [0, 0.06],
      [0.06, 0.1],
      [0.14, 0.17],
      [0.19, 0.155],
      [0.23, 0.19],
      [0.29, 0.13],
      [0.36, 0.09],
      [0.44, 0.05],
      [0.52, 0.02],
      [0.58, 0],
    ],
    "#6c4a74",
  );
  ridge(
    [
      [0, 0.03],
      [0.08, 0.05],
      [0.16, 0.035],
      [0.26, 0.06],
      [0.34, 0.03],
      [0.42, 0.015],
      [0.47, 0],
    ],
    "#4d3560",
  );
  const haze = ctx.createLinearGradient(0, horizon - h * 0.2, 0, horizon);
  haze.addColorStop(0, "rgba(255,190,150,0)");
  haze.addColorStop(1, "rgba(255,190,150,0.28)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - h * 0.2, w, h * 0.2);
};

const paintSea = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
) => {
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, "#9a5d6c");
  sea.addColorStop(0.25, "#3a3156");
  sea.addColorStop(1, "#0b0f22");
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  const rand = random(19);
  for (let i = 0; i < 900; i++) {
    const depth = rand() ** 1.6;
    const y = horizon + depth * (h * 0.86 - horizon);
    const spread = w * (0.025 + depth * 0.13);
    const x = w * 0.63 + (rand() - 0.5) * 2 * spread * (0.4 + rand());
    const len = w * (0.004 + rand() * 0.02) * (0.5 + depth);
    ctx.fillStyle = `rgba(255,${190 + rand() * 50},${120 + rand() * 60},${(1 - depth) * 0.7 * rand()})`;
    ctx.fillRect(x - len / 2, y, len, 1 + depth * 2);
    ctx.fillStyle = `rgba(10,12,30,${0.25 * rand()})`;
    ctx.fillRect(rand() * w, y, len * 3, 1 + depth * 2);
  }
};

const paintShore = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#07070d";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.87);
  ctx.lineTo(w, h * 0.84);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  const person = (x: number, s: number) => {
    const g = h * 0.87;
    const p = (dx: number, dy: number): [number, number] => [x + dx * s, g - dy * s];
    ctx.beginPath();
    ctx.moveTo(...p(-0.11, 0));
    ctx.lineTo(...p(-0.14, 0.8));
    ctx.lineTo(...p(-0.21, 0.78));
    ctx.quadraticCurveTo(...p(-0.24, 1.3), ...p(-0.16, 1.38));
    ctx.quadraticCurveTo(...p(-0.06, 1.43), ...p(-0.04, 1.47));
    ctx.lineTo(...p(0.04, 1.47));
    ctx.quadraticCurveTo(...p(0.06, 1.43), ...p(0.16, 1.38));
    ctx.quadraticCurveTo(...p(0.24, 1.3), ...p(0.21, 0.78));
    ctx.lineTo(...p(0.14, 0.8));
    ctx.lineTo(...p(0.11, 0));
    ctx.lineTo(...p(0.025, 0));
    ctx.lineTo(...p(0, 0.62));
    ctx.lineTo(...p(-0.025, 0));
    ctx.closePath();
    ctx.moveTo(...p(0.1, 1.6));
    ctx.arc(...p(0, 1.6), s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  };
  person(w * 0.3, h * 0.13);
  person(w * 0.335, h * 0.12);
  person(w * 0.52, h * 0.1);
  ctx.fillRect(w * 0.12, h * 0.6, w * 0.004, h * 0.27);
  glow(ctx, w * 0.122, h * 0.6, h * 0.05, "rgba(255,210,150,0.8)");
  // Οι «Ομπρέλες» της Νέας Παραλίας, ως σιλουέτα.
  const ux = w * 0.84;
  ctx.fillRect(ux, h * 0.34, w * 0.003, h * 0.52);
  [
    [0, 0.34, 0.07],
    [-0.05, 0.42, 0.06],
    [0.045, 0.47, 0.055],
    [-0.02, 0.55, 0.06],
    [0.03, 0.63, 0.05],
  ].forEach(([dx, y, r]) => {
    ctx.beginPath();
    ctx.ellipse(ux + dx * w, y * h, r * w * 0.6, r * h * 0.55, 0, Math.PI, 0);
    ctx.fill();
  });
  ctx.strokeStyle = "#07070d";
  ctx.lineWidth = 2;
  [
    [0.7, 0.2],
    [0.72, 0.215],
    [0.45, 0.16],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x * w - 8, y * h - 4);
    ctx.quadraticCurveTo(x * w - 3, y * h - 6, x * w, y * h);
    ctx.quadraticCurveTo(x * w + 3, y * h - 6, x * w + 8, y * h - 4);
    ctx.stroke();
  });
};

export const paintScene = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) => {
  const horizon = h * 0.6;
  paintSky(ctx, w, h, horizon);
  paintMountains(ctx, w, h, horizon);
  paintSea(ctx, w, h, horizon);
  paintShore(ctx, w, h);
  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    h * 0.3,
    w / 2,
    h / 2,
    w * 0.7,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const rand = random(3);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 9;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
};
