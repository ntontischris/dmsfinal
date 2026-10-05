import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import {
  CLIENT_LOGOS,
  CLIENT_SNAPSHOT,
  SERVICES,
  WORKS,
  formatEuro,
} from "@/directions/content";

import "@/directions/direction-c.css";

// C · Τολμηρό στούντιο: η εταιρεία ως δημιουργική ομάδα. Πλακίδια bento, έντονα χρώματα.

const TINTS = ["coral", "sky", "violet", "lime"] as const;

export function HomeC() {
  const [featured, ...rest] = WORKS;

  return (
    <div className="c-home c-bento">
      <section className="c-tile c-tile-lime c-hero">
        <h1>Κάνουμε βίντεο που οι άνθρωποι βλέπουν ως το τέλος.</h1>
        <a className="c-btn" href="#">
          Ζήτα προσφορά ↗
        </a>
      </section>

      <section
        className="c-tile c-video"
        style={{ "--hue": featured.hue } as React.CSSProperties}
      >
        <span className="c-badge">▶ {featured.duration}</span>
        <div>
          <h2>{featured.title}</h2>
          <p>{featured.client}</p>
        </div>
      </section>

      {SERVICES.map((service, i) => (
        <a
          key={service.title}
          href="#"
          className={`c-tile c-tile-${TINTS[i]} c-service`}
        >
          <strong>{service.title}</strong>
          <span>{service.line}</span>
        </a>
      ))}

      <section className="c-tile c-works">
        <h2>Πρόσφατες Δουλειές</h2>
        <ul>
          {rest.map((work) => (
            <li key={work.title}>
              <span
                className="c-dot"
                style={{ "--hue": work.hue } as React.CSSProperties}
              />
              <span>{work.title}</span>
              <span className="c-muted">{work.client}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="c-tile c-logos" aria-label="Πελάτες">
        {CLIENT_LOGOS.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </section>
    </div>
  );
}

export function ClientC() {
  const client = FICTIONAL_CLIENT;
  const [monthly, oneOff] = client.agreements;
  const { nextShoot, periodUsage, pendingApproval, openBalance, activity } =
    CLIENT_SNAPSHOT;
  const oneOffTotal = oneOff.lines.reduce(
    (sum, line) => sum + (line.totalPrice ?? 0),
    0,
  );

  return (
    <div className="c-client c-bento">
      <header className="c-tile c-tile-lime c-client-hero">
        <p>Πελάτης · {client.city}</p>
        <h1>{client.name}</h1>
        <p>
          {monthly.title} · τρέχουσα Περίοδος {monthly.periods.at(-1)?.label}
        </p>
      </header>

      <section className="c-tile c-stat">
        <p className="c-muted">Αυτή την Περίοδο</p>
        <div className="c-rings">
          <Ring
            label="Γυρίσματα"
            used={periodUsage.shoots.used}
            of={periodUsage.shoots.of}
          />
          <Ring
            label="Reels"
            used={periodUsage.reels.used}
            of={periodUsage.reels.of}
          />
        </div>
      </section>

      <section className="c-tile c-tile-sky c-stat">
        <p>Επόμενο Γύρισμα</p>
        <strong className="c-huge">{nextShoot.date}</strong>
        <p>
          {nextShoot.time} · {nextShoot.place}
        </p>
      </section>

      <section className="c-tile c-tile-coral c-stat">
        <p>Για έγκριση</p>
        <strong className="c-huge">{pendingApproval}</strong>
        <p>Παραδοτέα περιμένουν τη Μαρία</p>
      </section>

      <section className="c-tile c-stat">
        <p className="c-muted">Υπόλοιπο</p>
        <strong className="c-huge">{formatEuro(openBalance)}</strong>
        <p className="c-muted">Τιμολόγιο Σεπτεμβρίου</p>
      </section>

      <section className="c-tile c-tile-violet c-wide">
        <p>Πρόταση σε αναμονή</p>
        <h2>{oneOff.title}</h2>
        <p>
          {oneOff.provisions.join(" · ")} · {formatEuro(oneOffTotal)}
        </p>
      </section>

      <section className="c-tile c-wide">
        <h2>Τι έγινε</h2>
        <ul className="c-feed">
          {activity.map((item) => (
            <li key={item.what}>
              <span className="c-muted">{item.when}</span>
              {item.what}
            </li>
          ))}
        </ul>
      </section>

      <section className="c-tile c-people">
        <h2>Άνθρωποι</h2>
        {client.users.map((user) => (
          <span key={user.email} className="c-chip">
            <span className="c-face">{user.name[0]}</span>
            {user.name}
          </span>
        ))}
      </section>
    </div>
  );
}

function Ring({
  label,
  used,
  of,
}: {
  label: string;
  used: number;
  of: number;
}) {
  return (
    <div className="c-ring" style={{ "--p": used / of } as React.CSSProperties}>
      <strong>
        {used}/{of}
      </strong>
      <span>{label}</span>
    </div>
  );
}
