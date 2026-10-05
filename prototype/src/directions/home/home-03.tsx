"use client";

import { JetBrains_Mono, Sofia_Sans_Extra_Condensed } from "next/font/google";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { CLIENT_LOGOS, SERVICES, WORKS, type Work } from "@/directions/content";

import "./home-03.css";

// Πρόταση 3 · Φωτοτράπεζα: η Αρχική ως contact sheet πάνω σε φωτισμένο τραπέζι.
// Οι Δουλειές είναι τα «selects», κυκλωμένα με κόκκινο μολύβι. Φακός που μεγεθύνει.

const display = Sofia_Sans_Extra_Condensed({
  subsets: ["latin", "greek"],
  variable: "--h3-display",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--h3-mono",
});

type Kind =
  | "cafe"
  | "interview"
  | "sunset"
  | "studio"
  | "harbor"
  | "stage"
  | "bakery"
  | "street";

interface Frame {
  kind: Kind;
  z?: number;
  dx?: number;
  work?: number;
  note?: string;
  reject?: boolean;
}

const ROLLS: readonly { roll: string; frames: readonly Frame[] }[] = [
  {
    roll: "14",
    frames: [
      { kind: "cafe", reject: true },
      { kind: "cafe", z: 1.15, dx: -4 },
      { kind: "cafe", z: 1.3, dx: 6, work: 0, note: "ΕΞΩΦΥΛΛΟ" },
      { kind: "interview" },
      { kind: "interview", z: 1.25, dx: 5, reject: true },
      { kind: "sunset" },
    ],
  },
  {
    roll: "15",
    frames: [
      { kind: "studio" },
      { kind: "studio", z: 1.2, dx: -6, work: 1, note: "ΩΡΑΙΟ ΦΩΣ" },
      { kind: "studio", z: 1.45, dx: 8, reject: true },
      { kind: "harbor" },
      { kind: "harbor", z: 1.2, dx: -5, work: 2, note: "ΚΡΑΤΑΜΕ" },
      { kind: "harbor", z: 1.35, dx: 4 },
    ],
  },
  {
    roll: "16",
    frames: [
      { kind: "stage" },
      { kind: "stage", z: 1.2, dx: 6, work: 3, note: "ΑΥΤΟ!" },
      { kind: "stage", z: 1.4, dx: -8, reject: true },
      { kind: "bakery", z: 1.1, work: 4, note: "ΤΕΛΙΚΟ" },
      { kind: "bakery", z: 1.3, dx: -6 },
      { kind: "street" },
    ],
  },
];

// Τρεμάμενος κύκλος με μολύβι: ελαφρώς ακανόνιστος, κλείνει με υπερκάλυψη.
const pencilCircle = (seed: number): string => {
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = (i / 26) * Math.PI * 2 + seed;
    const wobble = 1 + Math.sin(i * 1.7 + seed * 3) * 0.035;
    return `${(50 + Math.cos(t) * 47 * wobble).toFixed(1)},${(50 + Math.sin(t) * 44 * wobble).toFixed(1)}`;
  });
  return `M${points[0]} L${points.slice(1).join(" L")}`;
};

function Scene({
  kind,
  z = 1,
  dx = 0,
}: {
  kind: Kind;
  z?: number;
  dx?: number;
}) {
  return (
    <div className="h3-scene" data-kind={kind}>
      <div
        className="h3-shot"
        style={{ "--z": z, "--dx": `${dx}%` } as CSSProperties}
      >
        <span className="s1" />
        <span className="s2" />
        <span className="s3" />
      </div>
    </div>
  );
}

interface SheetProps {
  onOpen?: (work: number) => void;
  isClone?: boolean;
}

function Sheet({ onOpen, isClone }: SheetProps) {
  let count = 11;
  return (
    <div className="h3-rolls" aria-hidden={isClone || undefined}>
      {ROLLS.map(({ roll, frames }) => (
        <div key={roll} className="h3-strip">
          <span className="h3-edge">DEVRE 2026 ▸ ΡΟΛΟ {roll} ▸ ΦΥΛΛΟ 01</span>
          <span className="h3-edge h3-edge-r">◂ 5203 · {roll}</span>
          {frames.map((frame, i) => {
            count += i % 2 === 0 ? 1 : 0;
            const number = `${count}${i % 2 ? "A" : ""}`;
            const select = frame.work !== undefined;
            const body = (
              <>
                <Scene kind={frame.kind} z={frame.z} dx={frame.dx} />
                <span className="h3-num">▸ {number}</span>
                {select && (
                  <svg
                    className="h3-mark"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d={pencilCircle(i + Number(roll))} pathLength={1} />
                  </svg>
                )}
                {frame.reject && (
                  <svg
                    className="h3-mark h3-x"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d="M22,18 L80,84 M78,16 L24,86" pathLength={1} />
                  </svg>
                )}
                {frame.note && <span className="h3-note">{frame.note}</span>}
              </>
            );
            return select && !isClone ? (
              <button
                key={i}
                type="button"
                className="h3-frame h3-select"
                onClick={() => onOpen?.(frame.work ?? 0)}
                aria-label={`Άνοιγμα: ${WORKS[frame.work ?? 0].title}`}
              >
                {body}
              </button>
            ) : (
              <div key={i} className={`h3-frame${select ? " h3-select" : ""}`}>
                {body}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const KIND_OF_WORK: readonly Kind[] = [
  "cafe",
  "studio",
  "harbor",
  "stage",
  "bakery",
];

function Projection({
  index,
  onClose,
}: {
  index: number;
  onClose: () => void;
}) {
  const work: Work = WORKS[index];
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="h3-projection" role="dialog" aria-label={work.title}>
      <div className="h3-projection-frame">
        <Scene kind={KIND_OF_WORK[index]} z={1.05} />
      </div>
      <div className="h3-projection-card">
        <p className="h3-micro">
          ΕΠΙΛΟΓΗ {String(index + 1).padStart(2, "0")} /{" "}
          {String(WORKS.length).padStart(2, "0")}
        </p>
        <h3>{work.title}</h3>
        <dl>
          <div>
            <dt>Πελάτης</dt>
            <dd>{work.client}</dd>
          </div>
          <div>
            <dt>Είδος</dt>
            <dd>{work.kind}</dd>
          </div>
          <div>
            <dt>Διάρκεια</dt>
            <dd>{work.duration}</dd>
          </div>
        </dl>
        <a href="#" className="h3-link">
          Η ιστορία της Δουλειάς →
        </a>
        <button type="button" className="h3-close" onClick={onClose}>
          ✕ Πίσω στο φύλλο
        </button>
      </div>
    </div>
  );
}

const LOUPE_SCALE = 2.4;

export function Home03() {
  const [open, setOpen] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    if (!sheet || event.pointerType !== "mouse") return;
    const box = sheet.getBoundingClientRect();
    sheet.style.setProperty("--lx", `${event.clientX - box.left}px`);
    sheet.style.setProperty("--ly", `${event.clientY - box.top}px`);
    sheet.style.setProperty("--sw", `${box.width}px`);
    sheet.dataset.loupe = "on";
  };

  return (
    <div className={`h3 ${display.variable} ${mono.variable}`}>
      <header className="h3-nav">
        <a href="#" className="h3-brand">
          DEVRE<span>MEDIA</span>
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
        <a href="#" className="h3-login">
          Είσοδος
        </a>
      </header>

      <section className="h3-table" aria-labelledby="h3-title">
        <div className="h3-table-head">
          <p className="h3-micro">
            ΦΥΛΛΟ ΕΠΑΦΩΝ 01 · ΘΕΣΣΑΛΟΝΙΚΗ · ΕΠΙΛΟΓΕΣ {WORKS.length}
          </p>
          <h1 id="h3-title">
            <span>Κάθε καρέ</span>
            <span>περνά από</span>
            <span>το χέρι μας.</span>
          </h1>
          <div className="h3-lead">
            <p>
              Βίντεο για εταιρείες, από το σενάριο ως το τελικό μοντάζ.
              Γυρίζουμε πολλά, κρατάμε μόνο ό,τι λέει την ιστορία σας.
            </p>
            <a href="#" className="h3-cta">
              Ζητήστε προσφορά
            </a>
          </div>
        </div>

        <div
          ref={sheetRef}
          className="h3-sheet"
          onPointerMove={handleMove}
          onPointerLeave={() =>
            sheetRef.current && delete sheetRef.current.dataset.loupe
          }
        >
          <Sheet onOpen={setOpen} />
          <div className="h3-loupe" aria-hidden>
            <div
              className="h3-loupe-lens"
              style={{ "--s": LOUPE_SCALE } as CSSProperties}
            >
              <Sheet isClone />
            </div>
          </div>
          {open !== null && (
            <Projection index={open} onClose={() => setOpen(null)} />
          )}
        </div>
        <p className="h3-hint">
          Τα κυκλωμένα καρέ είναι Δουλειές μας. Πατήστε ένα για να το δείτε.
        </p>
      </section>

      <section className="h3-sleeves" aria-labelledby="h3-services">
        <div className="h3-section-head">
          <p className="h3-micro">ΑΡΧΕΙΟ · ΤΟΜΕΙΣ</p>
          <h2 id="h3-services">Τέσσερις φάκελοι. Μία μέθοδος.</h2>
        </div>
        <div className="h3-sleeve-grid">
          {SERVICES.map((service, i) => (
            <a key={service.title} href="#" className="h3-sleeve">
              <span className="h3-tab">
                {String(i + 1).padStart(2, "0")} · {service.title}
              </span>
              <span className="h3-pockets" aria-hidden>
                {(["cafe", "studio", "stage", "sunset"] as const).map(
                  (kind, k) => (
                    <Scene
                      key={kind}
                      kind={
                        k === i
                          ? kind
                          : (
                              [
                                "harbor",
                                "bakery",
                                "interview",
                                "street",
                              ] as const
                            )[(i + k) % 4]
                      }
                    />
                  ),
                )}
              </span>
              <span className="h3-sleeve-text">{service.line}</span>
              <span className="h3-sleeve-go">Άνοιγμα φακέλου →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="h3-clients" aria-label="Πελάτες">
        <p className="h3-micro">ΕΤΙΚΕΤΕΣ ΑΡΧΕΙΟΥ</p>
        <ul>
          {CLIENT_LOGOS.map((logo, i) => (
            <li key={logo}>
              <span>Π-{String(i + 1).padStart(2, "0")}</span>
              {logo}
            </li>
          ))}
        </ul>
      </section>

      <section className="h3-final">
        <h2>
          Φέρτε μας την ιστορία.
          <br />
          Τα καρέ τα διαλέγουμε μαζί.
        </h2>
        <a href="#" className="h3-cta h3-cta-big">
          Φόρμα ενδιαφέροντος
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={pencilCircle(4)} pathLength={1} />
          </svg>
        </a>
      </section>

      <footer className="h3-foot">
        <span>DEVRE MEDIA · ΘΕΣΣΑΛΟΝΙΚΗ</span>
        <span>
          <a href="#">Απόρρητο</a> · <a href="#">Όροι</a> ·{" "}
          <a href="#">Είσοδος</a>
        </span>
      </footer>
    </div>
  );
}
