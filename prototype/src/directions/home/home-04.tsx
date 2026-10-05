"use client";

import { IBM_Plex_Sans, Roboto_Mono } from "next/font/google";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";
import {
  DEFAULT_GRADE,
  LOOKS,
  applyGrade,
  applyLog,
  paintScene,
  type Grade,
  type Wheel,
} from "@/directions/home/home-04-grade";
import {
  drawParade,
  drawVectorscope,
  drawWaveform,
  drawWheel,
} from "@/directions/home/home-04-scopes";

import "./home-04.css";

// Πρόταση 4 · Χρωματική διόρθωση: η Αρχική ως σουίτα grading. Η εικόνα είναι το μόνο χρώμα.

const sans = IBM_Plex_Sans({
  subsets: ["latin", "greek"],
  weight: ["300", "400", "500", "600"],
  variable: "--h4-sans",
});
const mono = Roboto_Mono({
  subsets: ["latin", "greek"],
  variable: "--h4-mono",
});

const W = 960;
const H = 540;
type WheelKey = "lift" | "gamma" | "gain";
const WHEELS: readonly { key: WheelKey; label: string }[] = [
  { key: "lift", label: "Lift · σκιές" },
  { key: "gamma", label: "Gamma · μεσαίοι" },
  { key: "gain", label: "Gain · φωτεινά" },
];

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpWheel = (a: Wheel, b: Wheel, t: number): Wheel => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  lum: lerp(a.lum, b.lum, t),
});
const lerpGrade = (a: Grade, b: Grade, t: number): Grade => ({
  lift: lerpWheel(a.lift, b.lift, t),
  gamma: lerpWheel(a.gamma, b.gamma, t),
  gain: lerpWheel(a.gain, b.gain, t),
  sat: lerp(a.sat, b.sat, t),
});
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;

function ColorWheel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Wheel;
  onChange: (w: Wheel) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawWheel(ctx);
  }, []);

  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = ((event.clientY - box.top) / box.height) * 2 - 1;
    const len = Math.max(1, Math.hypot(x, y));
    onChange({ ...value, x: x / len, y: y / len });
  };

  return (
    <div className="h4-wheel">
      <p className="h4-label">{label}</p>
      <div
        className="h4-wheel-pad"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) =>
          e.currentTarget.hasPointerCapture(e.pointerId) && setFromPointer(e)
        }
        onDoubleClick={() => onChange({ x: 0, y: 0, lum: 0 })}
        title="Σύρετε· διπλό κλικ για μηδενισμό"
      >
        <canvas ref={canvasRef} width={160} height={160} />
        <span className="h4-cross" aria-hidden />
        <span
          className="h4-puck"
          style={{
            left: `${50 + value.x * 50}%`,
            top: `${50 + value.y * 50}%`,
          }}
        />
      </div>
      <input
        type="range"
        min={-1}
        max={1}
        step={0.01}
        value={value.lum}
        aria-label={`${label}: φωτεινότητα`}
        onChange={(e) => onChange({ ...value, lum: Number(e.target.value) })}
      />
      <p className="h4-readout">
        <span>Y {signed(value.lum)}</span>
        <span>U {signed(value.x)}</span>
        <span>V {signed(-value.y)}</span>
      </p>
    </div>
  );
}

function useGradeEngine(grade: Grade) {
  const logRef = useRef<HTMLCanvasElement>(null);
  const gradeRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const paradeRef = useRef<HTMLCanvasElement>(null);
  const vectorRef = useRef<HTMLCanvasElement>(null);
  const base = useRef<ImageData | null>(null);

  useEffect(() => {
    const scratch = document.createElement("canvas");
    scratch.width = W;
    scratch.height = H;
    const ctx = scratch.getContext("2d", { willReadFrequently: true });
    const logCtx = logRef.current?.getContext("2d");
    if (!ctx || !logCtx) return;
    paintScene(ctx, W, H);
    base.current = ctx.getImageData(0, 0, W, H);
    const log = logCtx.createImageData(W, H);
    applyLog(base.current, log);
    logCtx.putImageData(log, 0, 0);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const ctx = gradeRef.current?.getContext("2d");
      if (!ctx || !base.current) return;
      const out = ctx.createImageData(W, H);
      applyGrade(base.current, out, grade);
      ctx.putImageData(out, 0, 0);
      const wave = waveRef.current?.getContext("2d");
      const parade = paradeRef.current?.getContext("2d");
      const vector = vectorRef.current?.getContext("2d");
      if (wave) drawWaveform(wave, out);
      if (parade) drawParade(parade, out);
      if (vector) drawVectorscope(vector, out);
    });
    return () => cancelAnimationFrame(frame);
  }, [grade]);

  return { logRef, gradeRef, waveRef, paradeRef, vectorRef };
}

function useGradeState() {
  const [grade, setGrade] = useState<Grade>(DEFAULT_GRADE);
  const [look, setLook] = useState(1);
  const current = useRef(grade);
  current.current = grade;

  const animateTo = useCallback((target: Grade, index: number) => {
    setLook(index);
    if (prefersReducedMotion()) return setGrade(target);
    const from = current.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 550);
      setGrade(lerpGrade(from, target, 1 - (1 - t) ** 3));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const setWheel = (key: WheelKey, wheel: Wheel) => {
    setLook(-1);
    setGrade((g) => ({ ...g, [key]: wheel }));
  };
  const setSat = (sat: number) => {
    setLook(-1);
    setGrade((g) => ({ ...g, sat }));
  };
  return { grade, look, animateTo, setWheel, setSat };
}

function useWipe() {
  const [wipe, setWipe] = useState(0.98);
  useEffect(() => {
    if (prefersReducedMotion()) return setWipe(0.42);
    const start = performance.now() + 500;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1700));
      setWipe(0.98 - 0.56 * (1 - (1 - t) ** 4));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return [wipe, setWipe] as const;
}


function Suite() {
  const { grade, look, animateTo, setWheel, setSat } = useGradeState();
  const { logRef, gradeRef, waveRef, paradeRef, vectorRef } =
    useGradeEngine(grade);
  const [wipe, setWipe] = useWipe();

  const dragWipe = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setWipe(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
  };
  const keyWipe = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") setWipe((w) => Math.max(0, w - 0.05));
    if (event.key === "ArrowRight") setWipe((w) => Math.min(1, w + 0.05));
  };

  return (
    <div className="h4-suite">
      <div className="h4-viewer">
        <div className="h4-bar">
          <span>A014_C003_0612 · 00:01:12:08 · 3840×2160 · 25p</span>
          <span className="h4-live">● DEVRE LOOK</span>
        </div>
        <div
          className="h4-stage"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragWipe(e);
          }}
          onPointerMove={(e) =>
            e.currentTarget.hasPointerCapture(e.pointerId) && dragWipe(e)
          }
          style={{ "--wipe": `${wipe * 100}%` } as CSSProperties}
        >
          <canvas
            ref={gradeRef}
            width={W}
            height={H}
            aria-label="Ηλιοβασίλεμα στη Νέα Παραλία, μετά τη διόρθωση"
          />
          <canvas
            ref={logRef}
            width={W}
            height={H}
            className="h4-log"
            aria-hidden
          />
          <span className="h4-tag h4-tag-l">LOG · ΑΠΟ ΤΗΝ ΚΑΜΕΡΑ</span>
          <span className="h4-tag h4-tag-r">ΤΕΛΙΚΟ ΧΡΩΜΑ</span>
          <div
            className="h4-handle"
            role="slider"
            tabIndex={0}
            aria-label="Σύγκριση πριν και μετά"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(wipe * 100)}
            onKeyDown={keyWipe}
          >
            <span>◂ ▸</span>
          </div>
        </div>
        <div className="h4-looks" role="group" aria-label="Έτοιμα looks">
          {LOOKS.map((item, i) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={look === i}
              onClick={() => animateTo(item.grade, i)}
            >
              <span className="h4-swatch" data-look={i} />
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <aside className="h4-scopes" aria-label="Scopes">
        <figure>
          <canvas ref={vectorRef} width={220} height={220} />
          <figcaption>Vectorscope</figcaption>
        </figure>
        <figure>
          <canvas ref={waveRef} width={300} height={130} />
          <figcaption>Waveform · Y</figcaption>
        </figure>
        <figure>
          <canvas ref={paradeRef} width={300} height={130} />
          <figcaption>Parade · RGB</figcaption>
        </figure>
      </aside>

      <div className="h4-wheels">
        {WHEELS.map(({ key, label }) => (
          <ColorWheel
            key={key}
            label={label}
            value={grade[key]}
            onChange={(w) => setWheel(key, w)}
          />
        ))}
        <div className="h4-master">
          <p className="h4-label">Κορεσμός</p>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={grade.sat}
            aria-label="Κορεσμός"
            onChange={(e) => setSat(Number(e.target.value))}
          />
          <p className="h4-readout">
            <span>SAT {grade.sat.toFixed(2)}</span>
          </p>
          <button
            type="button"
            className="h4-reset"
            onClick={() => animateTo(LOOKS[0].grade, 0)}
          >
            Μηδενισμός
          </button>
          <p className="h4-hint">
            Σύρετε τους κέρσορες: η εικόνα και τα scopes αλλάζουν ζωντανά.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Home04() {
  return (
    <div className={`h4 ${sans.variable} ${mono.variable}`}>
      <header className="h4-nav">
        <a href="#" className="h4-brand">
          DEVRE MEDIA <span>/ χρώμα</span>
        </a>
        <nav aria-label="Κύρια">
          {["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"].map(
            (item) => (
              <a key={item} href="#">
                {item}
              </a>
            ),
          )}
        </nav>
        <a href="#" className="h4-login">
          Είσοδος
        </a>
      </header>

      <section className="h4-hero" aria-labelledby="h4-title">
        <p className="h4-label">
          Σκηνή 01 · Νέα Παραλία, Θεσσαλονίκη · Χρυσή ώρα
        </p>
        <h1 id="h4-title">
          Το χρώμα λέει την ιστορία <em>πριν μιλήσει κανείς.</em>
        </h1>
        <div className="h4-lead">
          <p>
            Βίντεο για εταιρείες, από το σενάριο ως το τελικό χρώμα. Σύρετε τη
            γραμμή: αριστερά ό,τι βλέπει η κάμερα, δεξιά ό,τι θα δει ο πελάτης
            σας.
          </p>
          <a href="#" className="h4-cta">
            Ζητήστε προσφορά
          </a>
        </div>
      </section>

      <Suite />

      <section className="h4-works" aria-labelledby="h4-works-title">
        <div className="h4-head">
          <p className="h4-label">Gallery · επιλεγμένα stills</p>
          <h2 id="h4-works-title">Δουλειές</h2>
        </div>
        <div className="h4-stills">
          {WORKS.map((work, i) => (
            <a
              key={work.title}
              href="#"
              className="h4-still"
              style={{ "--hue": work.hue } as CSSProperties}
              data-i={i}
            >
              <span className="h4-frame">
                <span className="h4-pic" />
                <span className="h4-pic h4-pic-log" />
              </span>
              <span className="h4-still-meta">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{work.duration}</span>
              </span>
              <strong>{work.title}</strong>
              <span className="h4-muted">
                {work.client} · {work.kind}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="h4-nodes" aria-labelledby="h4-nodes-title">
        <div className="h4-head">
          <p className="h4-label">Node graph · Τομείς</p>
          <h2 id="h4-nodes-title">Από την ιδέα στην παράδοση, κόμβο κόμβο.</h2>
        </div>
        <ol className="h4-graph">
          {SERVICES.map((service, i) => (
            <li key={service.title}>
              <a href="#" className="h4-node">
                <span className="h4-node-head">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="h4-dot" />
                </span>
                <span className="h4-node-thumb" data-i={i} />
                <strong>{service.title}</strong>
              </a>
              <p className="h4-muted">{service.line}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="h4-clients" aria-label="Πελάτες">
        <p className="h4-label">Media pool · πελάτες</p>
        <ul>
          {CLIENT_LOGOS.map((logo, i) => (
            <li key={logo}>
              <span>{String(i + 1).padStart(3, "0")}</span>
              {logo}
            </li>
          ))}
        </ul>
      </section>

      <section className="h4-final">
        <h2>
          Φέρτε μας το υλικό σας.
          <br />
          <em>Θα του βρούμε το χρώμα.</em>
        </h2>
        <a href="#" className="h4-render">
          <span>Φόρμα ενδιαφέροντος</span>
          <span className="h4-progress" aria-hidden />
        </a>
      </section>

      <footer className="h4-foot">
        <span>DEVRE MEDIA · ΘΕΣΣΑΛΟΝΙΚΗ</span>
        <span>
          <a href="#">Απόρρητο</a> · <a href="#">Όροι</a> ·{" "}
          <a href="#">Είσοδος</a>
        </span>
      </footer>
    </div>
  );
}
