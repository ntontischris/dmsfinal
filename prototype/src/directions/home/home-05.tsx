"use client";

import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";
import {
  createLightScene,
  type LightScene,
} from "@/directions/home/home-05-light";

import "@/directions/home/home-05.css";

// Πρόταση 5 · Φως: ζωντανό anamorphic φως (WebGL) κάτω από αυστηρό πλέγμα 12 στηλών.

const display = Inter_Tight({
  subsets: ["latin", "greek"],
  variable: "--h5-display",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--h5-mono",
});

const NAV = ["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"];
const FPS = 24;
const pad = (value: number) => String(value).padStart(2, "0");

const toTimecode = (seconds: number) => {
  const frames = Math.floor(seconds * FPS);
  const s = Math.floor(frames / FPS);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % FPS)}`;
};

function useLightScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LightScene | null>(null);
  const [hasGl, setHasGl] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createLightScene(canvas, (time) => {
      if (timecodeRef.current)
        timecodeRef.current.textContent = toTimecode(time);
    });
    if (!scene) {
      setHasGl(false);
      return;
    }
    sceneRef.current = scene;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let isVisible = true;
    const sync = () =>
      isVisible && !document.hidden && !reduced ? scene.start() : scene.stop();
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      sync();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    if (reduced) scene.draw(8);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    sceneRef.current?.setPointer(
      (event.clientX - box.left) / box.width,
      1 - (event.clientY - box.top) / box.height,
    );
  };

  return { canvasRef, timecodeRef, hasGl, handlePointerMove };
}

function Hero() {
  const { canvasRef, timecodeRef, hasGl, handlePointerMove } = useLightScene();

  return (
    <section className="h5-hero" onPointerMove={handlePointerMove}>
      <canvas
        ref={canvasRef}
        className="h5-canvas"
        data-off={!hasGl || undefined}
        aria-hidden
      />
      <div className="h5-grid" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <header className="h5-nav">
        <a href="#" className="h5-logo">
          Devre<span>Media</span>
        </a>
        <nav aria-label="Κύρια">
          {NAV.map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
        </nav>
        <a href="#" className="h5-login">
          Είσοδος
        </a>
      </header>
      <span className="h5-meta h5-m1">LIGHT 01 / 5600K</span>
      <span className="h5-meta h5-m2">40.6401° N · 22.9444° E</span>
      <span className="h5-meta h5-m3">
        <i aria-hidden /> <span ref={timecodeRef}>00:00:00:00</span>
      </span>
      <span className="h5-meta h5-m4">ANAMORPHIC 2× · T2.0</span>
      <div className="h5-hero-copy">
        <p className="h5-kicker">Παραγωγή βίντεο · Θεσσαλονίκη</p>
        <h1>
          Γράφουμε
          <br />
          με <em>φως.</em>
        </h1>
        <div className="h5-hero-foot">
          <p>
            Σενάριο, γύρισμα και μοντάζ για εταιρείες που θέλουν να φαίνονται
            όπως πραγματικά είναι.
          </p>
          <a href="#" className="h5-cta">
            Ζήτα προσφορά <span aria-hidden>→</span>
          </a>
        </div>
      </div>
      <span className="h5-hint" aria-hidden>
        Κίνησε τον δείκτη · το φως ακολουθεί
      </span>
    </section>
  );
}

export function Home05() {
  return (
    <div className={`h5 ${display.variable} ${mono.variable}`}>
      <Hero />
      <div className="h5-body">
        <div className="h5-grid" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>

        <section className="h5-section">
          <div className="h5-head">
            <span className="h5-idx">§ 01</span>
            <h2>Επιλεγμένες Δουλειές</h2>
            <a href="#" className="h5-more">
              Όλες οι Δουλειές →
            </a>
          </div>
          <ol className="h5-works">
            {WORKS.map((work, i) => (
              <li
                key={work.title}
                style={{ "--hue": work.hue } as CSSProperties}
              >
                <a href="#">
                  <span className="h5-num">{pad(i + 1)}</span>
                  <span className="h5-title">{work.title}</span>
                  <span className="h5-client">
                    {work.client}
                    <small>{work.kind}</small>
                  </span>
                  <span className="h5-dur">{work.duration}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="h5-section">
          <div className="h5-head">
            <span className="h5-idx">§ 02</span>
            <h2>Τομείς</h2>
          </div>
          <div className="h5-services">
            {SERVICES.map((service, i) => (
              <a key={service.title} href="#" className="h5-service">
                <span className="h5-idx">
                  {pad(i + 1)} / {pad(SERVICES.length)}
                </span>
                <strong>{service.title}</strong>
                <p>{service.line}</p>
                <span className="h5-arrow" aria-hidden>
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="h5-section h5-clients" aria-label="Πελάτες">
          <span className="h5-idx">§ 03 · Μας εμπιστεύτηκαν</span>
          <ul>
            {CLIENT_LOGOS.map((logo) => (
              <li key={logo}>{logo}</li>
            ))}
          </ul>
        </section>

        <section className="h5-section h5-final">
          <span className="h5-idx">§ 04 · Φόρμα ενδιαφέροντος</span>
          <h2>
            Πείτε μας τι θέλετε να φανεί.
            <br />
            Εμείς βρίσκουμε το φως.
          </h2>
          <a href="#" className="h5-cta">
            Ξεκινάμε <span aria-hidden>→</span>
          </a>
        </section>

        <footer className="h5-footer">
          <span>Devre Media · Θεσσαλονίκη</span>
          <span>Απόρρητο · Όροι</span>
          <span className="h5-idx">EOF · 24 FPS</span>
        </footer>
      </div>
    </div>
  );
}
