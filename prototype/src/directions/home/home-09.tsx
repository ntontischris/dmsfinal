"use client";

// Πρόταση 9 · Διάφραγμα: η Αρχική ως φακός. Η ίριδα ανοίγει με την κύλιση και αποκαλύπτει
// το κάδρο· οι δακτύλιοι του φακού γυρίζουν· η κλίμακα f-stop στο πλάι είναι πρόοδος και πλοήγηση.

import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";

import "./home-09.css";

const display = Inter_Tight({
  subsets: ["latin", "greek"],
  variable: "--h9-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--h9-mono",
});

const F_STOPS = ["16", "11", "8", "5.6", "4", "2.8", "2", "1.4"] as const;
const DISTANCES = [
  "∞",
  "10",
  "5",
  "3",
  "2",
  "1.5",
  "1",
  "0.8",
  "0.6",
  "0.45",
] as const;
const BLADES = 9;

const LENSES = [
  { focal: "35", stop: "2.8" },
  { focal: "24", stop: "4" },
  { focal: "50", stop: "1.4" },
  { focal: "85", stop: "2" },
] as const;

const RAIL = [
  { stop: "16", label: "Αρχή", target: "h9-top" },
  { stop: "11" },
  { stop: "8", label: "Τομείς", target: "h9-services" },
  { stop: "5.6" },
  { stop: "4", label: "Δουλειές", target: "h9-works" },
  { stop: "2.8", label: "Πελάτες", target: "h9-clients" },
  { stop: "2" },
  { stop: "1.4", label: "Επαφή", target: "h9-contact" },
] as const;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const ringLabels = (labels: readonly string[], radius: number, arc: number) =>
  labels.map((label, k) => {
    const angle = -arc / 2 + (k * arc) / (labels.length - 1);
    return (
      <g key={label} transform={`rotate(${angle})`}>
        <line y1={-radius + 9} y2={-radius + 5} className="h9-tick" />
        <text y={-radius - 1} textAnchor="middle" dominantBaseline="middle">
          {label}
        </text>
      </g>
    );
  });

function Iris({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <svg
      className={`h9-iris ${className ?? ""}`}
      viewBox="-262 -262 524 524"
      aria-hidden
    >
      <defs>
        <clipPath id={`${id}-rim`}>
          <circle r="200" />
        </clipPath>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "oklch(22% 0.05 240)" }} />
          <stop offset="0.45" style={{ stopColor: "oklch(48% 0.11 35)" }} />
          <stop offset="0.6" style={{ stopColor: "oklch(78% 0.15 65)" }} />
          <stop offset="0.62" style={{ stopColor: "oklch(30% 0.06 240)" }} />
          <stop offset="1" style={{ stopColor: "oklch(10% 0.02 240)" }} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" style={{ stopColor: "oklch(99% 0.03 95)" }} />
          <stop offset="0.25" style={{ stopColor: "oklch(90% 0.14 75)" }} />
          <stop
            offset="1"
            style={{ stopColor: "oklch(70% 0.17 50)", stopOpacity: 0 }}
          />
        </radialGradient>
        <linearGradient id={`${id}-flare`} x1="0" y1="0" x2="1" y2="0">
          <stop
            offset="0"
            style={{ stopColor: "oklch(80% 0.12 230)", stopOpacity: 0 }}
          />
          <stop offset="0.5" style={{ stopColor: "oklch(95% 0.06 220)" }} />
          <stop
            offset="1"
            style={{ stopColor: "oklch(80% 0.12 230)", stopOpacity: 0 }}
          />
        </linearGradient>
        <linearGradient id={`${id}-reflect`} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            style={{ stopColor: "oklch(90% 0.13 70)", stopOpacity: 0.9 }}
          />
          <stop
            offset="1"
            style={{ stopColor: "oklch(70% 0.15 50)", stopOpacity: 0 }}
          />
        </linearGradient>
        <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="h9-blade-hi" />
          <stop offset="0.22" className="h9-blade-mid" />
          <stop offset="0.7" className="h9-blade-lo" />
          <stop offset="1" className="h9-blade-mid" />
        </linearGradient>
        <radialGradient id={`${id}-vignette`}>
          <stop offset="0.82" style={{ stopColor: "black", stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: "black", stopOpacity: 0.75 }} />
        </radialGradient>
        <filter id={`${id}-noise`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <g clipPath={url("rim")}>
        <rect x="-200" y="-200" width="400" height="400" fill={url("sky")} />
        <circle cx="38" cy="38" r="70" fill={url("sun")} />
        <path
          d="M-200 46 L-150 30 L-95 40 L-40 22 L-10 34 L20 44 L-200 44 Z"
          className="h9-hills"
        />
        <rect
          x="18"
          y="50"
          width="40"
          height="150"
          fill={url("reflect")}
          opacity="0.55"
        />
        <rect x="-200" y="47" width="400" height="1.2" className="h9-horizon" />
        <ellipse
          cx="38"
          cy="38"
          rx="250"
          ry="2.2"
          fill={url("flare")}
          className="h9-flare"
        />
        <rect
          x="-200"
          y="-200"
          width="400"
          height="400"
          filter={url("noise")}
          opacity="0.22"
          className="h9-grain"
        />
        {Array.from({ length: BLADES }, (_, i) => (
          <path
            key={i}
            className="h9-blade"
            style={{ "--i": i } as CSSProperties}
            d="M0 -330 Q24 0 0 330 L430 330 L430 -330 Z"
            fill={url("blade")}
          />
        ))}
        <circle r="200" fill={url("vignette")} />
      </g>

      <circle r="203" className="h9-rim" />
      <g className="h9-ring h9-ring-f">
        <circle r="221" className="h9-band" />
        {ringLabels(F_STOPS, 221, 120)}
      </g>
      <g className="h9-ring h9-ring-d">
        <circle r="242" className="h9-band h9-band-thin" />
        {ringLabels(DISTANCES, 242, 150)}
      </g>
      <circle r="257" className="h9-knurl" />
      <path d="M0 -211 L-5 -219 L5 -219 Z" className="h9-index" />
    </svg>
  );
}

function useApertureScroll() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [stopIndex, setStopIndex] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const scroller = root?.closest<HTMLElement>(".direction");
    if (!root || !track || !scroller) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;

    const update = () => {
      frame = 0;
      const ownScroll = getComputedStyle(scroller).overflowY === "auto";
      const viewport = ownScroll ? scroller.clientHeight : window.innerHeight;
      const offset = ownScroll ? scroller.getBoundingClientRect().top : 0;
      const box = track.getBoundingClientRect();
      const hero = reduce
        ? 0.62
        : clamp(-(box.top - offset) / Math.max(1, box.height - viewport));
      const page = ownScroll
        ? scroller.scrollTop / Math.max(1, scroller.scrollHeight - viewport)
        : clamp(
            -root.getBoundingClientRect().top /
              Math.max(1, root.offsetHeight - viewport),
          );
      root.style.setProperty("--p", hero.toFixed(4));
      root.style.setProperty("--page", clamp(page).toFixed(4));
      setStopIndex(Math.round(hero * (F_STOPS.length - 1)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(scroller, { attributes: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  return { rootRef, trackRef, stop: F_STOPS[stopIndex] };
}

const goTo = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

const bokeh = (seed: number) =>
  Array.from({ length: 9 }, (_, k) => {
    const n = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
    const r = n - Math.floor(n);
    return {
      x: Math.round((k * 37 + r * 60) % 100),
      y: Math.round((r * 90 + k * 13) % 100),
      size: Math.round(14 + ((k * 7 + r * 40) % 34)),
    };
  });

export function Home09() {
  const { rootRef, trackRef, stop } = useApertureScroll();
  const [featured, ...rest] = WORKS;

  return (
    <div ref={rootRef} className={`h9 ${display.variable} ${mono.variable}`}>
      <div className="h9-page">
        <div className="h9-main">
          <div ref={trackRef} className="h9-track" id="h9-top">
            <section className="h9-stage">
              <header className="h9-header">
                <a href="#" className="h9-logo">
                  <svg viewBox="-12 -12 24 24" aria-hidden>
                    <circle r="10.5" />
                    <path d="M-4 -9.2 L9.6 -2.6 M9.6 2.6 L-4 9.2 M-8.8 5 L-8.8 -5 M0 -10.5 L5.4 4 M0 10.5 L-5.4 -4" />
                  </svg>
                  DEVRE MEDIA
                </a>
                <nav aria-label="Κύρια">
                  {[
                    "Δουλειές",
                    "Τομείς",
                    "Τιμές",
                    "Σχετικά",
                    "Επικοινωνία",
                  ].map((item) => (
                    <a key={item} href="#">
                      {item}
                    </a>
                  ))}
                </nav>
                <a href="#" className="h9-login">
                  Είσοδος
                </a>
              </header>

              <div className="h9-hero">
                <h1 className="h9-title">
                  <span className="h9-title-a">Ανοίγουμε</span>
                  <span className="h9-title-b">το κάδρο.</span>
                </h1>
                <div className="h9-lens">
                  <Iris />
                  <span className="h9-call h9-call-1">
                    <i />
                    Διάφραγμα <b>f/{stop}</b>
                  </span>
                  <span className="h9-call h9-call-2">
                    <i />
                    Εστίαση <b>∞</b>
                  </span>
                  <span className="h9-call h9-call-3">
                    <i />
                    40.64° Β · 22.94° Α
                  </span>
                </div>
                <div className="h9-intro">
                  <p>
                    Παραγωγή βίντεο για εταιρείες στη Θεσσαλονίκη. Από το
                    σενάριο ως το τελικό μοντάζ, με το ίδιο βλέμμα.
                  </p>
                  <button
                    type="button"
                    className="h9-cta-btn"
                    onClick={() => goTo("h9-contact")}
                  >
                    Ζητήστε προσφορά <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
              <p className="h9-hint" aria-hidden>
                Κυλήστε · το διάφραγμα ανοίγει
              </p>
            </section>
          </div>

          <section className="h9-section" id="h9-services">
            <p className="h9-kicker">01 — Τομείς</p>
            <h2 className="h9-h2">
              Τέσσερις φακοί.
              <br />
              Ένα βλέμμα.
            </h2>
            <ol className="h9-services">
              {SERVICES.map((service, i) => (
                <li key={service.title}>
                  <a href="#" className="h9-service">
                    <span className="h9-focal">
                      {LENSES[i].focal}
                      <small>mm</small>
                    </span>
                    <span className="h9-fstop">f/{LENSES[i].stop}</span>
                    <strong>{service.title}</strong>
                    <span className="h9-line">{service.line}</span>
                    <span className="h9-arrow" aria-hidden>
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <section className="h9-section" id="h9-works">
            <p className="h9-kicker">02 — Δουλειές</p>
            <h2 className="h9-h2">Επιλεγμένα κάδρα.</h2>
            <div className="h9-works">
              {[featured, ...rest].map((work, i) => (
                <a
                  key={work.title}
                  href="#"
                  className={`h9-work ${i === 0 ? "h9-work-lead" : ""}`}
                  style={{ "--hue": work.hue } as CSSProperties}
                >
                  <span className="h9-bokeh" aria-hidden>
                    {bokeh(i + 1).map((b, k) => (
                      <i
                        key={k}
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          width: `${b.size}%`,
                        }}
                      />
                    ))}
                  </span>
                  <span className="h9-work-meta">
                    <span>
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {String(WORKS.length).padStart(2, "0")}
                    </span>
                    <span>{work.duration}</span>
                  </span>
                  <span className="h9-work-text">
                    <strong>{work.title}</strong>
                    <span>
                      {work.client} · {work.kind}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="h9-clients" id="h9-clients" aria-label="Πελάτες">
            <div className="h9-barrel">
              <div className="h9-barrel-track">
                {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, k) => (
                  <span key={k}>
                    {logo}
                    <i aria-hidden>·</i>
                  </span>
                ))}
              </div>
            </div>
            <p className="h9-barrel-label">
              <span>Πελάτες</span>
              <span>Ø 82 · 1:1.4</span>
            </p>
          </section>

          <section className="h9-section h9-contact" id="h9-contact">
            <div>
              <p className="h9-kicker">03 — Επικοινωνία</p>
              <h2 className="h9-h2">
                Πείτε μας τι θέλετε
                <br />
                να δείξετε.
              </h2>
              <p className="h9-muted">
                Μία φόρμα, λίγα λεπτά. Σας απαντά άνθρωπος της ομάδας, όχι
                αυτόματο μήνυμα.
              </p>
              <a href="#" className="h9-cta-btn">
                Φόρμα ενδιαφέροντος <span aria-hidden>→</span>
              </a>
            </div>
            <Iris className="h9-iris-small" />
          </section>

          <footer className="h9-footer">
            <span>© Devre Media · Θεσσαλονίκη</span>
            <nav aria-label="Υποσέλιδο">
              {["Απόρρητο", "Όροι", "Cookies", "Είσοδος"].map((item) => (
                <a key={item} href="#">
                  {item}
                </a>
              ))}
            </nav>
          </footer>
        </div>

        <nav className="h9-rail" aria-label="Ενότητες">
          <span className="h9-rail-head">f/</span>
          <ol>
            {RAIL.map((item) => (
              <li key={item.stop}>
                {"target" in item ? (
                  <button type="button" onClick={() => goTo(item.target)}>
                    <b>{item.stop}</b>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <span className="h9-rail-minor">{item.stop}</span>
                )}
              </li>
            ))}
          </ol>
          <span className="h9-rail-dot" aria-hidden />
        </nav>
      </div>
    </div>
  );
}
