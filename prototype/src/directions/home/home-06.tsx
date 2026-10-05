"use client";

import { Noto_Serif_Display, Sofia_Sans_Condensed } from "next/font/google";
import { useEffect, useState, type CSSProperties } from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";

import "@/directions/home/home-06.css";

// Πρόταση 6 · Τίτλοι αρχής: η Αρχική ανοίγει σαν ταινία και συνεχίζει ως τίτλοι τέλους.

const serif = Noto_Serif_Display({
  subsets: ["latin", "greek"],
  variable: "--h6-serif",
  style: ["normal", "italic"],
});
const sans = Sofia_Sans_Condensed({
  subsets: ["latin", "greek"],
  variable: "--h6-sans",
});

type Phase = "pending" | "play" | "done";

const SEEN_KEY = "h6-title-sequence-seen";
const SEQUENCE_MS = 8600;
const HEADLINE = ["Κάθε", "εταιρεία", "έχει", "μια", "ιστορία."];
const NAV = ["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"];
const CREDITS: Record<string, string> = {
  "Εταιρικά βίντεο": "σενάριο · γύρισμα · μοντάζ",
  "Social media": "μηνιαία Γυρίσματα · reels",
  Εκδηλώσεις: "γύρισμα · aftermovie",
  Διαφημιστικά: "casting · παραγωγή · σποτ",
};

const readSeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Χωρίς αποθήκευση η εισαγωγή απλώς ξαναπαίζει.
  }
};

function useTitleSequence() {
  const [phase, setPhase] = useState<Phase>("pending");

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setPhase(reduced || readSeen() ? "done" : "play");
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    markSeen();
    const timer = window.setTimeout(() => setPhase("done"), SEQUENCE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return {
    phase,
    skip: () => setPhase("done"),
    replay: () => setPhase("play"),
  };
}

function Scene() {
  return (
    <div className="h6-scene" aria-hidden>
      <div className="h6-sky" />
      <div className="h6-sun" />
      <svg
        className="h6-hills"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 140 C120 100 210 118 300 104 S470 70 560 92 S720 128 820 98 S1010 60 1090 84 L1200 96 V200 H0Z"
          opacity="0.55"
        />
        <path d="M0 172 L0 172 L10 172 L12 170 L30 170 L32 166 L46 166 L46 170 L52 170 L52 172 L58 172 L58 172 L80 172 L80 172 L98 172 L98 172 L112 172 L112 168 L120 168 L122 170 L134 170 L138 172 L148 172 L152 166 L160 166 L162 170 L168 170 L172 172 L178 172 L180 162 L198 162 L200 172 L214 172 L216 168 L226 168 L230 164 L252 164 L256 172 L268 172 L272 170 L284 170 L284 162 L298 162 L298 170 L310 170 L314 172 L328 172 L330 172 L340 172 L344 172 L356 172 L358 172 L364 172 L366 172 L378 172 L378 172 L384 172 L386 172 L404 172 L408 158 L430 158 L434 154 L444 154 L446 172 L454 172 L456 164 L462 164 L462 158 L480 158 L482 158 L488 158 L492 172 L502 172 L504 172 L526 172 L530 172 L542 172 L546 172 L558 172 L558 166 L564 166 L568 168 L576 168 L578 158 L588 158 L592 172 L602 172 L604 172 L612 172 L616 172 L630 172 L634 158 L640 158 L642 154 L654 154 L658 170 L670 170 L670 162 L682 162 L686 168 L692 168 L696 172 L702 172 L706 166 L712 166 L716 164 L728 164 L730 170 L744 170 L744 154 L766 154 L768 168 L780 168 L780 164 L798 164 L800 172 L822 172 L826 162 L832 162 L832 172 L850 172 L854 172 L864 172 L864 172 L882 172 L886 172 L896 172 L898 162 L920 162 L924 172 L932 172 L932 158 L954 158 L958 154 L980 154 L982 172 L1000 172 L1002 162 L1014 162 L1016 172 L1038 172 L1040 170 L1050 170 L1050 166 L1062 166 L1064 172 L1078 172 L1082 162 L1104 162 L1108 172 L1114 172 L1114 172 L1126 172 L1126 172 L1138 172 L1140 172 L1162 172 L1162 172 L1184 172 L1188 170 L1200 170 L1200 172 V200 H0Z" />
      </svg>
      <div className="h6-sea" />
      <div className="h6-streak" />
      <div className="h6-grain" />
    </div>
  );
}

function Intro({ phase }: { phase: Phase }) {
  if (phase === "done") return null;
  return (
    <div className="h6-intro" aria-hidden>
      <p className="h6-presents">
        <span>Devre Media</span>
        <small>παρουσιάζει</small>
      </p>
      <p className="h6-words">
        {HEADLINE.map((word, i) => (
          <span key={word} style={{ "--i": i } as CSSProperties}>
            {word}
          </span>
        ))}
      </p>
    </div>
  );
}

function Hero() {
  const { phase, skip, replay } = useTitleSequence();

  return (
    <section className="h6-hero" data-phase={phase}>
      <header className="h6-bar h6-top">
        <a href="#" className="h6-logo">
          Devre Media
        </a>
        <nav aria-label="Κύρια">
          {NAV.map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
        </nav>
        <a href="#" className="h6-login">
          Είσοδος
        </a>
      </header>

      <div className="h6-frame">
        <Scene />
        <div className="h6-copy">
          <p className="h6-scene-label">Σκηνή 01 — Εξωτ. Θεσσαλονίκη, παραλία</p>
          <h1>
            Κάθε εταιρεία έχει μια ιστορία.
            <em> Εμείς τη γυρίζουμε.</em>
          </h1>
          <a href="#" className="h6-cta">
            Ζήτα προσφορά <span aria-hidden>→</span>
          </a>
        </div>
      </div>

      <Intro phase={phase} />

      <footer className="h6-bar h6-bottom">
        <span>2.39 : 1 · 24 fps</span>
        <span className="h6-cue">Τίτλοι τέλους ↓</span>
        {phase === "done" ? (
          <button type="button" onClick={replay}>
            ↻ Ξανά από την αρχή
          </button>
        ) : (
          <button type="button" onClick={skip}>
            Παράλειψη ⏭
          </button>
        )}
      </footer>
    </section>
  );
}

function CreditRow({ left, right }: { left: string; right: string }) {
  return (
    <li className="h6-row">
      <span className="h6-left">{left}</span>
      <span className="h6-leader" aria-hidden />
      <span className="h6-right">{right}</span>
    </li>
  );
}

function Credits() {
  return (
    <div className="h6-credits">
      <section>
        <h2>Τομείς</h2>
        <ul>
          {SERVICES.map((service) => (
            <CreditRow
              key={service.title}
              left={service.title}
              right={CREDITS[service.title] ?? service.line}
            />
          ))}
        </ul>
      </section>

      <section>
        <h2>Ταινιογραφία</h2>
        <ul className="h6-films">
          {WORKS.map((work) => (
            <li
              key={work.title}
              className="h6-row h6-film"
              style={{ "--hue": work.hue } as CSSProperties}
            >
              <span className="h6-left">
                <em>{work.title}</em>
              </span>
              <span className="h6-leader" aria-hidden />
              <span className="h6-right">
                {work.client} · {work.kind} <b>{work.duration}</b>
              </span>
            </li>
          ))}
        </ul>
        <a href="#" className="h6-link">
          Όλες οι Δουλειές
        </a>
      </section>

      <section>
        <h2>Ευχαριστούμε</h2>
        <p className="h6-thanks">
          {CLIENT_LOGOS.map((logo) => (
            <span key={logo}>{logo}</span>
          ))}
        </p>
      </section>

      <section className="h6-end">
        <p className="h6-fin">Η επόμενη ιστορία</p>
        <h2 className="h6-end-title">είναι η δική σας.</h2>
        <a href="#" className="h6-cta">
          Φόρμα ενδιαφέροντος <span aria-hidden>→</span>
        </a>
      </section>

      <footer className="h6-footer">
        <span>Devre Media · Θεσσαλονίκη</span>
        <span>Απόρρητο · Όροι · Είσοδος</span>
      </footer>
    </div>
  );
}

export function Home06() {
  return (
    <div className={`h6 ${serif.variable} ${sans.variable}`}>
      <Hero />
      <Credits />
    </div>
  );
}
