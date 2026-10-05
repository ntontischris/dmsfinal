"use client";

// Πρόταση 2 · Σκόπευτρο: το hero είναι το σκόπευτρο της κάμερας (HUD, εστίαση με πάτημα,
// ζωντανό timecode, μετρητές ήχου). Πιο κάτω η σελίδα γίνεται το μενού της κάμερας.

import { JetBrains_Mono, Sofia_Sans_Condensed } from "next/font/google";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";
import { FootageScene, SCENE_KINDS } from "@/directions/home/home-01";

import "@/directions/home/home-02.css";

const sans = Sofia_Sans_Condensed({
  subsets: ["latin", "greek"],
  variable: "--h2-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--h2-mono",
});

const NAV = ["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"];
const pad = (n: number) => String(n).padStart(2, "0");
const toTimecode = (frames: number) => {
  const s = Math.floor(frames / 25);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % 25)}`;
};
const CLIPS = WORKS.map((work, i) => ({
  work,
  kind: SCENE_KINDS[i],
  name: `A00${i + 1}_C0${pad(3 + i * 4)}`,
}));
const HISTOGRAM = `M0 40 ${Array.from({ length: 41 }, (_, i) => {
  const x = i / 40;
  const y =
    40 -
    (Math.exp(-((x - 0.32) ** 2) / 0.02) * 26 +
      Math.exp(-((x - 0.72) ** 2) / 0.01) * 18 +
      3);
  return `L${i * 3} ${y.toFixed(1)}`;
}).join(" ")} L120 40Z`;

function useTimecode(recording: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const frames = useRef(12 * 25 + 8);
  useEffect(() => {
    if (!recording) return;
    let last = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const step = Math.floor((now - last) / 40);
      if (step > 0) {
        frames.current += step;
        last += step * 40;
        if (ref.current) ref.current.textContent = toTimecode(frames.current);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [recording]);
  return ref;
}

function Viewfinder() {
  const [recording, setRecording] = useState(true);
  const [focus, setFocus] = useState({ x: 64, y: 44, n: 0 });
  const timecodeRef = useTimecode(recording);

  const handleFocus = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(88, Math.max(12, v));
    setFocus((f) => ({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
      n: f.n + 1,
    }));
  };

  return (
    <div className="h2-vf" data-rec={recording} onClick={handleFocus}>
      <div key={focus.n} className="h2-scene">
        <FootageScene kind="harbour" hue={250} />
      </div>
      <svg
        className="h2-thirds"
        viewBox="0 0 300 300"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M100 0 V300 M200 0 V300 M0 100 H300 M0 200 H300" />
      </svg>
      {["tl", "tr", "bl", "br"].map((corner) => (
        <i key={corner} className={`h2-corner h2-${corner}`} aria-hidden />
      ))}

      <div className="h2-top">
        <button
          type="button"
          className="h2-rec"
          onClick={() => setRecording((on) => !on)}
          aria-pressed={recording}
        >
          <i aria-hidden />
          {recording ? "REC" : "STBY"}
        </button>
        <span ref={timecodeRef} className="h2-tc">
          00:00:12:08
        </span>
        <span className="h2-mid">4K · 25p · LOG</span>
        <span className="h2-specs">
          <b>ISO</b> 800 <b>·</b> 1/50 <b>·</b> f/2.8 <b>·</b> 5600K <b>·</b> ND
          ¼
        </span>
        <span className="h2-batt" aria-label="Μπαταρία 74%">
          <i /> 74%
        </span>
      </div>

      <div
        key={`f${focus.n}`}
        className="h2-focus"
        style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
        aria-hidden
      >
        <span>AF-C</span>
        <span className="h2-locked">● ΕΣΤΙΑΣΗ</span>
      </div>
      <div className="h2-level" aria-hidden>
        <i />
        <span>0,0°</span>
      </div>
      <div className="h2-meters" aria-hidden>
        {["CH1", "CH2"].map((ch, i) => (
          <div key={ch} className="h2-meter">
            <span className="h2-lvl">
              <i style={{ animationDuration: `${1.1 + i * 0.27}s` }} />
            </span>
            <small>{ch}</small>
          </div>
        ))}
        <div className="h2-db">
          <span>0</span>
          <span>-12</span>
          <span>-24</span>
          <span>-40</span>
        </div>
      </div>

      <div className="h2-hero">
        <p className="h2-eyebrow">
          Devre Media — Παραγωγή βίντεο · Θεσσαλονίκη
        </p>
        <h1>Η ιστορία σας, στο σωστό κάδρο.</h1>
        <p className="h2-sub">
          Εταιρικά βίντεο, social media, εκδηλώσεις και διαφημιστικά. Από το
          σενάριο μέχρι το τελικό μοντάζ.
        </p>
        <div className="h2-ctas">
          <a className="h2-btn h2-btn-rec" href="#">
            <i aria-hidden />
            Ζήτα προσφορά
          </a>
          <a className="h2-btn" href="#h2-clips">
            Δες τις Δουλειές ▸
          </a>
        </div>
      </div>

      <div className="h2-bottom">
        <svg viewBox="0 0 120 40" aria-hidden>
          <path d={HISTOGRAM} />
        </svg>
        <span>35mm</span>
        <span>⟷ 2,4 m</span>
        <span className="h2-hint">Πάτα στο κάδρο για εστίαση</span>
        <span className="h2-card">A ▸ 1:42 ώρ.</span>
      </div>
    </div>
  );
}

function ServicesMenu() {
  const [selected, setSelected] = useState(0);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const service = SERVICES[selected];

  const handleKey = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const next =
      (selected + (event.key === "ArrowDown" ? 1 : -1) + SERVICES.length) %
      SERVICES.length;
    setSelected(next);
    items.current[next]?.focus();
  };

  return (
    <section className="h2-menu" id="h2-menu" aria-labelledby="h2-menu-title">
      <nav className="h2-tabs" aria-label="Ενότητες">
        <a href="#h2-menu" aria-current="true">
          <b>▣</b>Τομείς
        </a>
        <a href="#h2-clips">
          <b>▶</b>Δουλειές
        </a>
        <a href="#h2-card">
          <b>◫</b>Πελάτες
        </a>
        <a href="#h2-rec">
          <b>●</b>Λήψη
        </a>
      </nav>
      <div className="h2-menu-main">
        <p className="h2-menu-head">
          <span>Μενού · Τομείς</span>
          <span>
            {selected + 1}/{SERVICES.length}
          </span>
        </p>
        <h2 id="h2-menu-title">Τι γυρίζουμε</h2>
        <ul role="listbox" aria-label="Τομείς" onKeyDown={handleKey}>
          {SERVICES.map((item, i) => (
            <li key={item.title}>
              <button
                ref={(el) => {
                  items.current[i] = el;
                }}
                type="button"
                role="option"
                aria-selected={i === selected}
                tabIndex={i === selected ? 0 : -1}
                onClick={() => setSelected(i)}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="h2-caret" aria-hidden>
                  ▸
                </span>
                {item.title}
                <span className="h2-val">{i === selected ? "ON" : "—"}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="h2-keys">▲▼ επιλογή · ● ζήτα προσφορά</p>
      </div>
      <aside className="h2-detail" aria-live="polite">
        <span className="h2-detail-no">0{selected + 1}</span>
        <h3>{service.title}</h3>
        <p>{service.line}</p>
        <a className="h2-btn h2-btn-rec" href="#">
          <i aria-hidden />
          Ζήτα προσφορά για {service.title.toLowerCase()}
        </a>
      </aside>
    </section>
  );
}

function ClipBrowser() {
  const [selected, setSelected] = useState(0);
  const clip = CLIPS[selected];

  return (
    <section
      className="h2-clips"
      id="h2-clips"
      aria-labelledby="h2-clips-title"
    >
      <p className="h2-menu-head">
        <span>Αναπαραγωγή · Κάρτα A</span>
        <span>{CLIPS.length} κλιπ</span>
      </p>
      <h2 id="h2-clips-title">Δουλειές</h2>
      <div className="h2-player">
        <div className="h2-player-frame">
          <FootageScene key={clip.name} kind={clip.kind} hue={clip.work.hue} />
          <span className="h2-player-name">{clip.name}</span>
          <span className="h2-player-play" aria-hidden>
            ▶
          </span>
          <span className="h2-player-bar" aria-hidden>
            <i />
          </span>
        </div>
        <div className="h2-player-info">
          <p className="h2-eyebrow">
            {clip.work.kind} · {clip.work.duration}
          </p>
          <h3>{clip.work.title}</h3>
          <p>{clip.work.client}</p>
          <a className="h2-btn" href="#">
            Δες τη Δουλειά ▸
          </a>
        </div>
      </div>
      <ul className="h2-thumbs">
        {CLIPS.map((item, i) => (
          <li key={item.name}>
            <button
              type="button"
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
            >
              <span className="h2-thumb">
                <FootageScene kind={item.kind} hue={item.work.hue} />
                <small>{item.name}</small>
                <small>{item.work.duration}</small>
              </span>
              <strong>{item.work.title}</strong>
              <span>{item.work.client}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Home02() {
  return (
    <div className={`h2 ${sans.variable} ${mono.variable}`}>
      <header className="h2-bar">
        <a className="h2-logo" href="#">
          DEVRE<span>MEDIA</span>
        </a>
        <nav aria-label="Κύριο μενού">
          {NAV.map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
        </nav>
        <a className="h2-login" href="#">
          Είσοδος
        </a>
      </header>
      <div className="h2-body">
        <Viewfinder />
      </div>
      <ServicesMenu />
      <ClipBrowser />
      <section className="h2-card" id="h2-card" aria-labelledby="h2-card-title">
        <p className="h2-menu-head">
          <span>Μεταδεδομένα · Πελάτες</span>
          <span>Κάρτα A</span>
        </p>
        <h2 id="h2-card-title">Μας εμπιστεύτηκαν</h2>
        <ul>
          {CLIENT_LOGOS.map((name, i) => (
            <li key={name}>
              <small>CLIENT_{pad(i + 1)}</small>
              {name}
            </li>
          ))}
        </ul>
      </section>
      <section
        className="h2-rec-cta"
        id="h2-rec"
        aria-labelledby="h2-rec-title"
      >
        <p className="h2-eyebrow">Έτοιμοι για λήψη</p>
        <h2 id="h2-rec-title">Πατήστε REC. Τα υπόλοιπα τα αναλαμβάνουμε.</h2>
        <a className="h2-big-rec" href="#" aria-label="Ζήτα προσφορά">
          <i aria-hidden />
        </a>
        <p>Ζήτα προσφορά: μας λέτε τι χρειάζεστε, σας απαντάμε με πρόταση.</p>
      </section>
      <footer className="h2-foot">
        <span>© Devre Media · Θεσσαλονίκη</span>
        <nav aria-label="Υποσέλιδο">
          <a href="#">Απόρρητο</a>
          <a href="#">Όροι</a>
          <a href="#">Είσοδος</a>
        </nav>
        <span>Κάρτα A · 4K 25p</span>
      </footer>
    </div>
  );
}
