"use client";

import { JetBrains_Mono, Sofia_Sans_Condensed } from "next/font/google";
import { useEffect, useRef, useState } from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";

import "./home-07.css";

// Πρόταση 7 · Ρεζί: η Αρχική ως αίθουσα σκηνοθεσίας. Multiviewer με 8 πηγές,
// tally PGM/PVW, ζωντανό timecode, lower third ως τίτλος. Κλικ σε οθόνη = «κόψιμο» στο PGM.

const display = Sofia_Sans_Condensed({
  subsets: ["latin", "greek"],
  variable: "--r7-display",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--r7-mono",
});

interface Source {
  cam: string;
  scene: string;
  title: string;
  meta: string;
}

const SCENES = ["cafe", "dawn", "port", "stage", "oven"] as const;

const SOURCES: readonly Source[] = [
  ...WORKS.map((work, i) => ({
    cam: `CAM ${i + 1}`,
    scene: SCENES[i],
    title: work.title,
    meta: `${work.client} · ${work.kind}`,
  })),
  {
    cam: "CAM 6",
    scene: "aerial",
    title: "Πόλη από ψηλά",
    meta: "Drone · 4K 25p",
  },
  {
    cam: "CAM 7",
    scene: "studio",
    title: "Στούντιο, key light",
    meta: "Συνέντευξη · 2 κάμερες",
  },
  {
    cam: "CAM 8",
    scene: "night",
    title: "Νυχτερινός δρόμος",
    meta: "Gimbal · χαμηλό φως",
  },
];

const RUNDOWN_STATUS = ["ON AIR", "NEXT", "STBY", "READY"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

// Το ρολόι γράφει κατευθείαν στο DOM 25 φορές το δευτερόλεπτο, χωρίς re-render.
function useTimecode() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const now = new Date();
      const ff = Math.floor((now.getMilliseconds() / 1000) * 25);
      if (ref.current)
        ref.current.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}:${pad(ff)}`;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);
  return ref;
}

function Scene({ name }: { name: string }) {
  return (
    <div className="r7-scene" data-scene={name} aria-hidden>
      <i className="r7-l1" />
      <i className="r7-l2" />
      <i className="r7-l3" />
      <i className="r7-grain" />
    </div>
  );
}

function Meters({ seed }: { seed: number }) {
  return (
    <span className="r7-meters" aria-hidden>
      {[0, 1].map((ch) => (
        <i
          key={ch}
          style={{
            animationDuration: `${0.6 + ((seed * 7 + ch * 3) % 5) * 0.17}s`,
          }}
        />
      ))}
    </span>
  );
}

interface MonitorProps {
  source: Source;
  index: number;
  tally: "pgm" | "pvw" | null;
  onCut: (index: number) => void;
}

function Monitor({ source, index, tally, onCut }: MonitorProps) {
  return (
    <button
      type="button"
      className="r7-mon"
      data-tally={tally ?? undefined}
      onClick={() => onCut(index)}
      aria-label={`${source.cam}: ${source.title}. Κόψιμο στο πρόγραμμα`}
    >
      <Scene name={source.scene} />
      <span className="r7-mon-top">
        <b>{source.cam}</b>
        {tally && <em>{tally.toUpperCase()}</em>}
      </span>
      <span className="r7-mon-label">{source.title}</span>
      <Meters seed={index} />
    </button>
  );
}

function ClockTile() {
  const ref = useTimecode();
  return (
    <div className="r7-clock">
      <span className="r7-clock-label">TC · ΘΕΣΣΑΛΟΝΙΚΗ</span>
      <span ref={ref} className="r7-clock-tc">
        00:00:00:00
      </span>
      <span className="r7-clock-sub">25p · 4K UHD · REC 709</span>
    </div>
  );
}

function Header() {
  return (
    <header className="r7-header">
      <a href="#" className="r7-logo">
        <span className="r7-live" />
        DEVRE<b>MEDIA</b>
      </a>
      <nav aria-label="Κύρια">
        {["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"].map(
          (item) => (
            <a key={item} href="#">
              {item}
            </a>
          ),
        )}
        <a href="#" className="r7-login">
          Είσοδος
        </a>
      </nav>
    </header>
  );
}

function Program({ source, cutKey }: { source: Source; cutKey: number }) {
  return (
    <div className="r7-pgm">
      <div className="r7-pgm-screen" key={cutKey}>
        <Scene name={source.scene} />
        <div className="r7-safe" aria-hidden />
      </div>
      <span className="r7-pgm-tag">PGM · {source.cam}</span>
      <div className="r7-lower">
        <span className="r7-lower-kicker">
          Devre Media · Παραγωγή βίντεο · Θεσσαλονίκη
        </span>
        <h1>
          Κάθε εταιρεία έχει μια ιστορία.
          <br />
          <span>Εμείς τη βγάζουμε στον αέρα.</span>
        </h1>
        <span className="r7-lower-strap">
          <b>ΤΩΡΑ</b> {source.title} — {source.meta}
        </span>
      </div>
    </div>
  );
}

export function Home07() {
  const [pgm, setPgm] = useState(0);
  const [pvw, setPvw] = useState(1);
  const [cutKey, setCutKey] = useState(0);

  const cut = (index: number) => {
    if (index === pgm) return;
    setPvw(pgm);
    setPgm(index);
    setCutKey((key) => key + 1);
  };

  const tallyOf = (i: number) => (i === pgm ? "pgm" : i === pvw ? "pvw" : null);
  const grid = [
    ...SOURCES.slice(0, 4).map((s, i) => ({ s, i })),
    null,
    ...SOURCES.slice(4).map((s, i) => ({ s, i: i + 4 })),
  ];

  return (
    <div className={`r7 ${display.variable} ${mono.variable}`}>
      <Header />

      <section className="r7-hero">
        <Program source={SOURCES[pgm]} cutKey={cutKey} />
        <div className="r7-grid">
          {grid.map((cell) =>
            cell ? (
              <Monitor
                key={cell.s.cam}
                source={cell.s}
                index={cell.i}
                tally={tallyOf(cell.i)}
                onCut={cut}
              />
            ) : (
              <ClockTile key="clock" />
            ),
          )}
        </div>
        <p className="r7-hint">
          <kbd>Κλικ</kbd> σε οποιαδήποτε κάμερα για να την κόψετε στο πρόγραμμα.
        </p>
      </section>

      <section className="r7-section">
        <header className="r7-sec-head">
          <span>RUNDOWN</span>
          <h2>Τομείς</h2>
          <span className="r7-sec-meta">
            Ροή εκπομπής · {SERVICES.length} θέματα
          </span>
        </header>
        <table className="r7-rundown">
          <thead>
            <tr>
              <th>#</th>
              <th>Slug</th>
              <th>Τομέας</th>
              <th className="r7-hide-sm">Τι περιλαμβάνει</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((service, i) => (
              <tr key={service.title} data-status={RUNDOWN_STATUS[i]}>
                <td className="r7-num">{pad(i + 1)}</td>
                <td className="r7-slug">
                  {`${service.title.split(" ")[0].toUpperCase()}_${pad(i + 1)}`}
                </td>
                <td className="r7-title">
                  <a href="#">{service.title}</a>
                </td>
                <td className="r7-hide-sm r7-dim">{service.line}</td>
                <td>
                  <span className="r7-pill">{RUNDOWN_STATUS[i]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="r7-section">
        <header className="r7-sec-head">
          <span>ΑΡΧΕΙΟ</span>
          <h2>Επιλεγμένες Δουλειές</h2>
          <a href="#" className="r7-sec-meta">
            Όλες οι Δουλειές →
          </a>
        </header>
        <ol className="r7-works">
          {WORKS.map((work, i) => (
            <li key={work.title}>
              <a href="#" className="r7-work">
                <span className="r7-work-frame">
                  <Scene name={SCENES[i]} />
                  <span className="r7-work-dur">{work.duration}</span>
                </span>
                <span className="r7-work-id">CLIP {pad(i + 1)}</span>
                <strong>{work.title}</strong>
                <span className="r7-dim">
                  {work.client} · {work.kind}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <div className="r7-crawl" aria-label="Πελάτες">
        <span className="r7-crawl-tag">ΠΕΛΑΤΕΣ</span>
        <div className="r7-crawl-track">
          <div className="r7-crawl-run">
            {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                aria-hidden={i >= CLIENT_LOGOS.length || undefined}
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="r7-cta">
        <a href="#" className="r7-onair">
          <span className="r7-onair-sign">ON AIR</span>
          <span className="r7-onair-text">
            Η επόμενη εκπομπή είναι η δική σας.
            <b>Ζητήστε προσφορά →</b>
          </span>
        </a>
        <p className="r7-dim">
          Μία φόρμα ενδιαφέροντος, μία απάντηση από άνθρωπο της ομάδας.
        </p>
      </section>

      <footer className="r7-footer">
        <span>DEVRE MEDIA · ΘΕΣΣΑΛΟΝΙΚΗ</span>
        <nav aria-label="Υποσέλιδο">
          <a href="#">Απόρρητο</a>
          <a href="#">Όροι</a>
          <a href="#">English</a>
          <a href="#">Είσοδος</a>
        </nav>
        <span>END OF TRANSMISSION</span>
      </footer>
    </div>
  );
}
