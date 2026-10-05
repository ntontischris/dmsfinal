"use client";

import { Cousine, IBM_Plex_Sans } from "next/font/google";
import { useEffect, useState } from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";
import {
  Panel,
  SketchDefs,
  type SketchName,
} from "@/directions/home/home-08-sketches";

import "./home-08.css";

// Πρόταση 8 · Σενάριο: η Αρχική ως σενάριο. Σκηνή 1 γράφεται σαν γραφομηχανή,
// οι σκηνές 2–4 είναι η διαδικασία, με storyboard σε κάθε μία.

const script = Cousine({
  subsets: ["latin", "greek"],
  weight: ["400", "700"],
  variable: "--r8-script",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin", "greek"],
  variable: "--r8-sans",
});

type BlockKind =
  "heading" | "action" | "character" | "paren" | "dialogue" | "transition";

interface Block {
  kind: BlockKind;
  text: string;
}

const SCENE_ONE: readonly Block[] = [
  { kind: "heading", text: "ΣΚΗΝΗ 1. ΕΣΩΤ. ΤΟ ΓΡΑΦΕΙΟ ΣΑΣ — ΜΕΡΑ" },
  {
    kind: "action",
    text: "Ένα γραφείο που ξέρει τι φτιάχνει. Ένα κινητό γεμάτο βίντεο που κανείς δεν είδε ως το τέλος. Ο καφές κρυώνει.",
  },
  { kind: "character", text: "ΕΣΕΙΣ" },
  { kind: "paren", text: "(κοιτάζοντας την οθόνη)" },
  {
    kind: "dialogue",
    text: "Θέλουμε ένα βίντεο που να μας μοιάζει. Όχι διαφήμιση. Εμάς.",
  },
  { kind: "character", text: "DEVRE MEDIA" },
  { kind: "paren", text: "(αφήνει ένα σενάριο στο τραπέζι)" },
  {
    kind: "dialogue",
    text: "Τότε ξεκινάμε από την ιστορία σας. Η κάμερα έρχεται μετά.",
  },
  { kind: "transition", text: "ΚΟΨΙΜΟ ΣΕ:" },
];

const TOTAL = SCENE_ONE.reduce((sum, block) => sum + block.text.length, 0);
const CHARS_PER_SECOND = 70;

// Πόσοι χαρακτήρες έχουν «πληκτρολογηθεί». Χωρίς κίνηση: όλοι αμέσως.
function useTyped() {
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return setTyped(TOTAL);
    const start = Date.now() + 500;
    const timer = window.setInterval(() => {
      const next = Math.max(
        0,
        Math.min(
          TOTAL,
          Math.floor(((Date.now() - start) / 1000) * CHARS_PER_SECOND),
        ),
      );
      setTyped(next);
      if (next >= TOTAL) window.clearInterval(timer);
    }, 30);
    return () => window.clearInterval(timer);
  }, []);
  return typed;
}

function TypedPage() {
  const typed = useTyped();
  let offset = 0;

  return (
    <article className="r8-page r8-page-hero" aria-label="Σκηνή 1">
      <header className="r8-page-head">
        <span>DEVRE MEDIA · ΣΕΝΑΡΙΟ ΣΥΝΕΡΓΑΣΙΑΣ · ΠΡΩΤΟ ΠΡΟΣΧΕΔΙΟ</span>
        <span>1.</span>
      </header>
      {SCENE_ONE.map((block) => {
        const shown = Math.max(0, Math.min(block.text.length, typed - offset));
        const isTyping = shown > 0 && shown < block.text.length;
        offset += block.text.length;
        return (
          <p key={block.text} className={`r8-${block.kind}`}>
            <span>{block.text.slice(0, shown)}</span>
            {isTyping && <span className="r8-caret" aria-hidden />}
            <span className="r8-ghost">{block.text.slice(shown)}</span>
          </p>
        );
      })}
    </article>
  );
}

interface Scene {
  number: number;
  heading: string;
  revision: { label: string; tone: string };
  action: string;
  cue?: { who: string; paren?: string; line: string };
  title: string;
  panels: readonly { sketch: SketchName; shot: string; note: string }[];
}

const SCENES: readonly Scene[] = [
  {
    number: 2,
    heading: "ΣΚΗΝΗ 2. ΕΞΩΤ. ΤΟ ΚΑΤΑΣΤΗΜΑ ΣΑΣ — ΧΡΥΣΗ ΩΡΑ",
    revision: { label: "ΑΝΑΘ. ΜΠΛΕ", tone: "blue" },
    title: "Γύρισμα",
    action:
      "Το συνεργείο στήνει ήσυχα. Λίγα φώτα, κανένα σταμάτημα στη μέρα σας. Ό,τι μπαίνει στο κάδρο είναι αληθινό.",
    cue: {
      who: "DEVRE MEDIA (V.O.)",
      line: "Γυρίζουμε εκεί που συμβαίνει η δουλειά σας.",
    },
    panels: [
      { sketch: "shop", shot: "2A", note: "ΓΠ · 24mm · σταθερό" },
      { sketch: "tripod", shot: "2B", note: "ΜΠ · 50mm · τρίποδο" },
      { sketch: "gimbal", shot: "2C", note: "ακολουθία · gimbal · 35mm" },
    ],
  },
  {
    number: 3,
    heading: "ΣΚΗΝΗ 3. ΕΣΩΤ. ΑΙΘΟΥΣΑ ΜΟΝΤΑΖ — ΝΥΧΤΑ",
    revision: { label: "ΑΝΑΘ. ΡΟΖ", tone: "pink" },
    title: "Μοντάζ",
    action:
      "Ώρες υλικού γίνονται λεπτά. Ρυθμός, χρώμα, ήχος. Κάθε κόψιμο έχει λόγο να υπάρχει.",
    panels: [
      { sketch: "timeline", shot: "3A", note: "μοντάζ · ρυθμός" },
      { sketch: "grade", shot: "3B", note: "χρώμα · διόρθωση" },
      { sketch: "sound", shot: "3C", note: "ήχος · μίξη" },
    ],
  },
  {
    number: 4,
    heading: "ΣΚΗΝΗ 4. ΕΣΩΤ. Ο ΛΟΓΑΡΙΑΣΜΟΣ ΣΑΣ — ΟΠΟΤΕ ΘΕΛΕΤΕ",
    revision: { label: "ΑΝΑΘ. ΚΙΤΡΙΝΗ", tone: "yellow" },
    title: "Παράδοση",
    action:
      "Τα Παραδοτέα περιμένουν στον λογαριασμό σας. Τα βλέπετε, σχολιάζετε πάνω στο καρέ, εγκρίνετε με ένα πάτημα.",
    cue: {
      who: "ΕΣΕΙΣ",
      paren: "(πατώντας «Έγκριση»)",
      line: "Αυτό είναι. Αυτοί είμαστε.",
    },
    panels: [
      { sketch: "files", shot: "4A", note: "Παραδοτέα · ανεβαίνουν" },
      { sketch: "phone", shot: "4B", note: "έγκριση · από τον λογαριασμό" },
      { sketch: "screening", shot: "4C", note: "πρεμιέρα · παντού" },
    ],
  },
];

const ROLES = [
  "η ιστορία της εταιρείας",
  "ο σταθερός ρυθμός κάθε μήνα",
  "η στιγμή που δεν επαναλαμβάνεται",
  "το σποτ που μένει στο μυαλό",
];

function ScenePage({ scene }: { scene: Scene }) {
  return (
    <section className="r8-scene" data-tone={scene.revision.tone}>
      <div className="r8-scene-side">
        <span className="r8-scene-no">{scene.number}</span>
        <h2>{scene.title}</h2>
      </div>
      <article className="r8-page">
        <header className="r8-page-head">
          <span className="r8-rev">{scene.revision.label}</span>
          <span>{scene.number}.</span>
        </header>
        <p className="r8-heading">{scene.heading}</p>
        <p className="r8-action">{scene.action}</p>
        {scene.cue && (
          <>
            <p className="r8-character">{scene.cue.who}</p>
            {scene.cue.paren && <p className="r8-paren">{scene.cue.paren}</p>}
            <p className="r8-dialogue">{scene.cue.line}</p>
          </>
        )}
        <div className="r8-strip">
          {scene.panels.map((panel) => (
            <Panel key={panel.shot} {...panel} />
          ))}
        </div>
      </article>
    </section>
  );
}

export function Home08() {
  return (
    <div className={`r8 ${script.variable} ${sans.variable}`}>
      <SketchDefs />
      <header className="r8-header">
        <a href="#" className="r8-logo">
          Devre Media
        </a>
        <nav aria-label="Κύρια">
          {["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"].map(
            (item) => (
              <a key={item} href="#">
                {item}
              </a>
            ),
          )}
          <a href="#" className="r8-login">
            Είσοδος
          </a>
        </nav>
      </header>

      <section className="r8-hero">
        <div className="r8-title">
          <p className="r8-kicker">Παραγωγή βίντεο · Θεσσαλονίκη</p>
          <h1>
            Κάθε καλό βίντεο
            <br />
            ξεκινά από <em>ένα καλό σενάριο.</em>
          </h1>
          <div className="r8-actions">
            <a href="#" className="r8-btn">
              Γράψτε μαζί μας τη σκηνή 1 →
            </a>
            <a href="#r8-films" className="r8-link">
              Ταινιογραφία
            </a>
          </div>
        </div>
        <TypedPage />
        <aside className="r8-board" aria-label="Storyboard σκηνής 1">
          <Panel sketch="office" shot="1A" note="ΓΠ · 24mm · σταθερό" />
          <Panel sketch="talk" shot="1B" note="ΜΠ · 35mm · dolly in" />
          <Panel sketch="cup" shot="1C" note="ΚΠ · 85mm · ρακόρ" />
        </aside>
      </section>

      {SCENES.map((scene) => (
        <ScenePage key={scene.number} scene={scene} />
      ))}

      <section className="r8-block">
        <h2 className="r8-block-title">
          Διανομή ρόλων <span>Τομείς</span>
        </h2>
        <ul className="r8-cast">
          {SERVICES.map((service, i) => (
            <li key={service.title}>
              <a href="#">
                <strong>{service.title}</strong>
                <span className="r8-leader" aria-hidden />
                <em>{ROLES[i]}</em>
              </a>
              <p>{service.line}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="r8-block" id="r8-films">
        <h2 className="r8-block-title">
          Ταινιογραφία <span>Επιλεγμένες Δουλειές</span>
        </h2>
        <ol className="r8-films">
          {WORKS.map((work, i) => (
            <li key={work.title}>
              <a href="#">
                <span className="r8-film-no">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="r8-film-title">{work.title}</span>
                <span className="r8-film-meta">
                  {work.client} · {work.kind}
                </span>
                <span className="r8-film-dur">{work.duration}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="r8-block r8-thanks">
        <h2 className="r8-block-title">Ευχαριστίες</h2>
        <p>{CLIENT_LOGOS.join("  ·  ")}</p>
      </section>

      <section className="r8-cta">
        <article className="r8-page">
          <header className="r8-page-head">
            <span>ΚΕΝΗ ΣΕΛΙΔΑ</span>
            <span>5.</span>
          </header>
          <p className="r8-heading">
            ΣΚΗΝΗ 5. ΕΣΩΤ. Η ΔΙΚΗ ΣΑΣ ΙΣΤΟΡΙΑ — ΣΥΝΕΧΙΖΕΤΑΙ
          </p>
          <p className="r8-action">
            Η σελίδα είναι άδεια. Περιμένει τους πρωταγωνιστές της.
          </p>
          <p className="r8-character">ΕΣΕΙΣ</p>
          <p className="r8-dialogue r8-blank" aria-hidden>
            <span />
            <span />
            <span />
          </p>
          <a href="#" className="r8-btn r8-btn-big">
            Γράψτε τη σκηνή σας →
          </a>
          <p className="r8-fine">
            Μία φόρμα ενδιαφέροντος. Σας απαντά άνθρωπος της ομάδας.
          </p>
        </article>
      </section>

      <footer className="r8-footer">
        <p className="r8-end">ΤΕΛΟΣ</p>
        <nav aria-label="Υποσέλιδο">
          <a href="#">Απόρρητο</a>
          <a href="#">Όροι</a>
          <a href="#">English</a>
          <a href="#">Είσοδος</a>
        </nav>
        <p>Devre Media · Θεσσαλονίκη</p>
      </footer>
    </div>
  );
}
