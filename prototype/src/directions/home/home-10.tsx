"use client";

// Πρόταση 10 · Τεχνικό δελτίο: η Αρχική ως φύλλο προδιαγραφών. Τεράστιοι αριθμοί, διάτρηση φιλμ,
// σχέδιο κάμερας σε έκρηξη με τους Τομείς, πίνακας διαδικασίας, ακορντεόν Δουλειών.

import { Roboto_Mono, Sofia_Sans_Extra_Condensed } from "next/font/google";
import { useEffect, useState, type CSSProperties } from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";

import "./home-10.css";

const display = Sofia_Sans_Extra_Condensed({
  subsets: ["latin", "greek"],
  variable: "--h10-display",
});
const mono = Roboto_Mono({
  subsets: ["latin", "greek"],
  variable: "--h10-mono",
});

const SPECS = [
  { value: "16:9", label: "Λόγος κάδρου" },
  { value: "4K", label: "Ανάλυση" },
  { value: "48kHz", label: "Ήχος" },
  { value: "Rec.709", label: "Χρώμα" },
] as const;

const PROCESS = [
  {
    step: "Ενδιαφέρον",
    what: "Συμπληρώνετε τη φόρμα ενδιαφέροντος.",
    get: "Σας καλεί άνθρωπος της ομάδας.",
    by: "—",
  },
  {
    step: "Πρόταση",
    what: "Γράφουμε πρόταση με Πακέτα και τιμές.",
    get: "Σύνδεσμο πρότασης για υπογραφή online.",
    by: "Εσείς",
  },
  {
    step: "Γύρισμα",
    what: "Κλείνουμε ημερομηνία, χώρο και ομάδα.",
    get: "Πρόγραμμα Γυρίσματος.",
    by: "Κοινή",
  },
  {
    step: "Μοντάζ",
    what: "Μοντάζ, χρώμα, ήχος, υπότιτλοι.",
    get: "Παραδοτέα στον λογαριασμό σας.",
    by: "—",
  },
  {
    step: "Έγκριση",
    what: "Εγκρίνετε ή ζητάτε αλλαγές.",
    get: "Ιστορικό κάθε εκδοχής.",
    by: "Εσείς",
  },
  {
    step: "Παράδοση",
    what: "Τελικά αρχεία σε κάθε μορφή.",
    get: "Αρχεία έτοιμα για δημοσίευση.",
    by: "—",
  },
] as const;

const pad = (n: number, size = 2) => String(n).padStart(size, "0");

function useFrameClock() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFrame((f) => f + 1), 1000 / 24);
    return () => window.clearInterval(id);
  }, []);
  const seconds = Math.floor(frame / 24);
  return {
    frameInSecond: (frame % 24) + 1,
    timecode: `00:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(frame % 24)}`,
  };
}

interface CameraDiagramProps {
  active: number;
  onActivate: (index: number) => void;
}

// Σχ. 2: line drawing κάμερας σε έκρηξη. Τα μέρη 0–3 αντιστοιχούν στους Τομείς.
function CameraDiagram({ active, onActivate }: CameraDiagramProps) {
  const part = (index: number, dx: number, dy: number) => ({
    className: "h10-part",
    "data-active": index === active || undefined,
    style: { "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties,
    onMouseEnter: () => onActivate(index),
  });

  return (
    <svg className="h10-camera" viewBox="0 0 820 470" role="img" aria-label="Κάμερα σε έκρηξη με τα μέρη της">
      <line x1="40" y1="245" x2="812" y2="245" className="h10-axis" />
      <text x="812" y="236" textAnchor="end" className="h10-small">ΟΠΤΙΚΟΣ ΑΞΟΝΑΣ</text>

      <g {...part(0, 70, 0)}>
        <ellipse cx="110" cy="245" rx="22" ry="88" />
        <ellipse cx="110" cy="245" rx="12" ry="58" className="h10-glass" />
        <path d="M110 157 H180 V333 H110" />
        <rect x="180" y="172" width="60" height="146" />
        {Array.from({ length: 11 }, (_, k) => (
          <g key={k}><line x1={185 + k * 5} y1="176" x2={185 + k * 5} y2="194" /><line x1={185 + k * 5} y1="296" x2={185 + k * 5} y2="314" /></g>
        ))}
        <rect x="240" y="188" width="18" height="114" />
        <path d="M100 205 Q94 245 100 285" className="h10-glint" />
      </g>

      <g {...part(3, 0, 0)}>
        <rect x="330" y="150" width="230" height="190" rx="8" />
        <ellipse cx="330" cy="245" rx="14" ry="64" />
        <rect x="372" y="208" width="72" height="50" className="h10-sensor" />
        <text x="378" y="276" className="h10-small">S35</text>
        <circle cx="490" cy="150" r="7" /><circle cx="518" cy="150" r="7" />
        {Array.from({ length: 6 }, (_, k) => <line key={k} x1="470" y1={276 + k * 9} x2="540" y2={276 + k * 9} />)}
      </g>

      <g {...part(2, 0, 46)}>
        <rect x="360" y="52" width="180" height="34" rx="17" />
        {Array.from({ length: 12 }, (_, k) => <line key={k} x1={378 + k * 8} y1="56" x2={378 + k * 8} y2="82" />)}
        <line x1="445" y1="86" x2="445" y2="150" className="h10-dash" />
      </g>

      <g {...part(1, -60, 60)}>
        <rect x="610" y="40" width="170" height="106" rx="6" />
        <rect x="621" y="51" width="148" height="84" className="h10-screen" />
        <path d="M686 80 L706 93 L686 106 Z" />
        <line x1="640" y1="146" x2="560" y2="196" className="h10-dash" />
      </g>

      <g className="h10-part h10-part-mute" style={{ "--dx": "-50px", "--dy": "0px" } as CSSProperties}>
        <rect x="595" y="200" width="110" height="100" rx="6" />
        <line x1="615" y1="225" x2="685" y2="225" /><line x1="615" y1="245" x2="685" y2="245" />
        <text x="615" y="285" className="h10-small">BATT</text>
      </g>

      {[
        { x: 112, y: 112, tx: 128, ty: 157 },
        { x: 800, y: 172, tx: 780, ty: 146 },
        { x: 586, y: 40, tx: 540, ty: 66 },
        { x: 445, y: 400, tx: 445, ty: 340 },
      ].map((c, i) => (
        <g key={i} className="h10-callout" data-active={i === active || undefined} onMouseEnter={() => onActivate(i)}>
          <line x1={c.x} y1={c.y} x2={c.tx} y2={c.ty} />
          <circle cx={c.x} cy={c.y} r="15" />
          <text x={c.x} y={c.y + 4} textAnchor="middle">{pad(i + 1)}</text>
        </g>
      ))}

      <g className="h10-dimline">
        <line x1="88" y1="440" x2="560" y2="440" /><line x1="88" y1="432" x2="88" y2="448" /><line x1="560" y1="432" x2="560" y2="448" />
        <text x="324" y="462" textAnchor="middle">ΣΥΝΟΛΟ ΣΥΝΑΡΜΟΛΟΓΗΣΗΣ</text>
      </g>
    </svg>
  );
}

function Perforation({ vertical }: { vertical?: boolean }) {
  return (
    <div
      className={vertical ? "h10-perf h10-perf-v" : "h10-perf"}
      aria-hidden
    />
  );
}

function Hero() {
  const { frameInSecond, timecode } = useFrameClock();

  return (
    <section className="h10-hero">
      <div className="h10-giant" aria-hidden>
        <span>24</span>
        <span className="h10-giant-unit">
          <b>fps</b>
          <small>
            καρέ
            <br />
            ανά δευτ.
          </small>
        </span>
      </div>

      <figure className="h10-frame">
        <span className="h10-dim h10-dim-x">
          <i />
          16
          <i />
        </span>
        <span className="h10-dim h10-dim-y">
          <i />9<i />
        </span>
        <div className="h10-scene">
          <span className="h10-reg h10-reg-tl" />
          <span className="h10-reg h10-reg-tr" />
          <span className="h10-reg h10-reg-bl" />
          <span className="h10-reg h10-reg-br" />
          <span className="h10-scene-hud">
            <span>ΚΑΡΕ {pad(frameInSecond)}/24</span>
            <span>{timecode}</span>
          </span>
          <span className="h10-frames" aria-hidden>
            {Array.from({ length: 24 }, (_, k) => (
              <i key={k} data-on={k < frameInSecond || undefined} />
            ))}
          </span>
        </div>
        <figcaption>Εικ. 1 — Κάδρο αναφοράς, 16:9</figcaption>
      </figure>

      <h1 className="h10-title">
        Βίντεο σχεδιασμένο με ακρίβεια μηχανικού και μάτι σκηνοθέτη.
      </h1>
      <div className="h10-intro">
        <p>
          Παραγωγή βίντεο για εταιρείες στη Θεσσαλονίκη. Κάθε βήμα γραμμένο,
          κάθε Παραδοτέο στον λογαριασμό σας.
        </p>
        <a href="#h10-contact" className="h10-btn">
          Ζητήστε προσφορά <span aria-hidden>→</span>
        </a>
      </div>

      <dl className="h10-specs">
        {SPECS.map((spec, i) => (
          <div key={spec.label}>
            <dt>
              <span>{pad(i + 1)}</span>
              {spec.label}
            </dt>
            <dd>{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Services() {
  const [active, setActive] = useState(0);
  return (
    <section className="h10-section" id="h10-services">
      <SectionHead
        code="Β"
        title="Τομείς"
        note="Σχ. 2 — Η κάμερα σε έκρηξη: κάθε μέρος, ένας Τομέας."
      />
      <div className="h10-diagram">
        <CameraDiagram active={active} onActivate={setActive} />
        <ol className="h10-parts">
          {SERVICES.map((service, i) => (
            <li key={service.title}>
              <a
                href="#"
                data-active={i === active || undefined}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
              >
                <span className="h10-num">{pad(i + 1)}</span>
                <strong>{service.title}</strong>
                <span>{service.line}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Works() {
  const [open, setOpen] = useState(0);
  return (
    <section className="h10-section" id="h10-works">
      <SectionHead
        code="Γ"
        title="Δουλειές"
        note={`${pad(WORKS.length)} τεμάχια · επιλογή`}
      />
      <ul className="h10-acc">
        {WORKS.map((work, i) => (
          <li
            key={work.title}
            data-open={i === open || undefined}
            style={{ "--hue": work.hue } as CSSProperties}
          >
            <a
              href="#"
              onMouseEnter={() => setOpen(i)}
              onFocus={() => setOpen(i)}
            >
              <span className="h10-acc-code">W-{pad(i + 1)}</span>
              <span className="h10-acc-spine">{work.title}</span>
              <span className="h10-acc-body">
                <span className="h10-acc-meta">
                  <span>{work.kind}</span>
                  <span>{work.duration}</span>
                </span>
                <strong>{work.title}</strong>
                <span>{work.client} · Δείτε τη Δουλειά →</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHead({
  code,
  title,
  note,
}: {
  code: string;
  title: string;
  note: string;
}) {
  return (
    <header className="h10-head">
      <span className="h10-head-code">{code}</span>
      <h2>{title}</h2>
      <span className="h10-head-note">{note}</span>
    </header>
  );
}

export function Home10() {
  return (
    <div className={`h10 ${display.variable} ${mono.variable}`}>
      <Perforation vertical />
      <div className="h10-sheet">
        <header className="h10-bar">
          <a href="#" className="h10-logo">
            DEVRE<b>MEDIA</b>
          </a>
          <span className="h10-doc">Τεχνικό δελτίο · Νο. R1 · Εκδ. 01</span>
          <nav aria-label="Κύρια">
            {["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"].map(
              (item) => (
                <a key={item} href="#">
                  {item}
                </a>
              ),
            )}
            <a href="#" className="h10-login">
              Είσοδος
            </a>
          </nav>
        </header>
        <Perforation />
        <Hero />
        <Perforation />

        <Services />

        <section className="h10-section">
          <SectionHead
            code="Δ"
            title="Πώς δουλεύουμε"
            note="Πίν. 3 — Διαδικασία, από τη φόρμα ως την παράδοση."
          />
          <div className="h10-table-wrap">
            <table className="h10-table">
              <thead>
                <tr>
                  <th>Αρ.</th>
                  <th>Βήμα</th>
                  <th>Τι γίνεται</th>
                  <th>Τι παίρνετε</th>
                  <th>Εγκρίνει</th>
                </tr>
              </thead>
              <tbody>
                {PROCESS.map((row, i) => (
                  <tr key={row.step}>
                    <td className="h10-num">PR-{pad(i + 1)}</td>
                    <td>
                      <strong>{row.step}</strong>
                    </td>
                    <td>{row.what}</td>
                    <td>{row.get}</td>
                    <td className="h10-by">{row.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Works />

        <section className="h10-section">
          <SectionHead code="Ε" title="Πελάτες" note="Κατάλογος μερών" />
          <ol className="h10-partslist">
            {CLIENT_LOGOS.map((logo, i) => (
              <li key={logo}>
                <span className="h10-num">P-{pad(i + 1, 3)}</span>
                <span>{logo}</span>
                <i aria-hidden />
                <span>{SERVICES[i % SERVICES.length].title}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="h10-cta" id="h10-contact">
          <span className="h10-cta-code">Φόρμα F-01</span>
          <h2>Ξεκινάμε με τη φόρμα ενδιαφέροντος.</h2>
          <a href="#" className="h10-cta-btn">
            Συμπληρώστε τη φόρμα <span aria-hidden>→</span>
          </a>
          <p>Απάντηση από άνθρωπο της ομάδας. Καμία δέσμευση.</p>
        </section>

        <footer className="h10-footer">
          <span>Devre Media · Θεσσαλονίκη</span>
          <span>Σελ. 01/01</span>
          <nav aria-label="Υποσέλιδο">
            {["Απόρρητο", "Όροι", "Cookies", "Είσοδος"].map((item) => (
              <a key={item} href="#">
                {item}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
