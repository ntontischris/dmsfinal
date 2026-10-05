import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import {
  CLIENT_LOGOS,
  CLIENT_SNAPSHOT,
  SERVICES,
  WORKS,
  formatEuro,
} from "@/directions/content";

import "@/directions/direction-a.css";

// A · Κινηματογραφικό: η εταιρεία ως αίθουσα προβολής. Κάδρα, timecodes, μία ζεστή απόχρωση.

export function HomeA() {
  return (
    <div className="a-home">
      <section className="a-hero">
        <div className="a-hero-frame">
          <span className="a-rec">REC</span>
          <span className="a-tc">00:00:12:08</span>
          <h1>
            Ιστορίες
            <br />
            που κινούνται.
          </h1>
        </div>
        <div className="a-hero-foot">
          <p>
            Παραγωγή βίντεο για εταιρείες στη Θεσσαλονίκη. Από το σενάριο ως το
            τελικό μοντάζ.
          </p>
          <a className="a-cta" href="#">
            Ζήτα προσφορά →
          </a>
        </div>
      </section>

      <section>
        <h2 className="a-label">Δουλειές</h2>
        <ol className="a-strip">
          {WORKS.map((work, i) => (
            <li key={work.title} className="a-reveal">
              <div
                className="a-thumb"
                style={{ "--hue": work.hue } as React.CSSProperties}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{work.duration}</span>
              </div>
              <h3>{work.title}</h3>
              <p>
                {work.client} · {work.kind}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="a-services">
        <h2 className="a-label">Τι κάνουμε</h2>
        {SERVICES.map((service, i) => (
          <a key={service.title} href="#" className="a-service a-reveal">
            <span className="a-num">{String(i + 1).padStart(2, "0")}</span>
            <strong>{service.title}</strong>
            <span>{service.line}</span>
          </a>
        ))}
      </section>

      <section className="a-logos" aria-label="Πελάτες">
        {CLIENT_LOGOS.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </section>
    </div>
  );
}

export function ClientA() {
  const client = FICTIONAL_CLIENT;
  const [monthly, oneOff] = client.agreements;
  const { nextShoot, periodUsage, pendingApproval, openBalance, activity } =
    CLIENT_SNAPSHOT;

  return (
    <div className="a-client">
      <header className="a-slate">
        <div className="a-slate-bar" aria-hidden />
        <p className="a-label">Πελάτης</p>
        <h1>{client.name}</h1>
        <dl className="a-meta">
          <div>
            <dt>Επωνυμία</dt>
            <dd>{client.legalName}</dd>
          </div>
          <div>
            <dt>Πόλη</dt>
            <dd>{client.city}</dd>
          </div>
          <div>
            <dt>Υπεύθυνη</dt>
            <dd>{client.owner}</dd>
          </div>
          <div>
            <dt>Υπόλοιπο</dt>
            <dd className="a-accent">{formatEuro(openBalance)}</dd>
          </div>
        </dl>
      </header>

      <section className="a-next">
        <p className="a-label">Επόμενο Γύρισμα</p>
        <p className="a-big">
          {nextShoot.date} <span className="a-tc">{nextShoot.time}</span>
        </p>
        <p>
          {nextShoot.place} · {nextShoot.crew}
        </p>
      </section>

      <section>
        <h2 className="a-label">{monthly.title}</h2>
        <ol className="a-periods">
          {monthly.periods.map((period) => (
            <li key={period.label} data-state={period.state}>
              <span className="a-tc">
                {period.starts.slice(5).replace("-", "/")}
              </span>
              {period.label}
              <small>{period.state}</small>
            </li>
          ))}
        </ol>
        <p className="a-usage">
          Γυρίσματα {periodUsage.shoots.used}/{periodUsage.shoots.of} · Reels{" "}
          {periodUsage.reels.used}/{periodUsage.reels.of} ·{" "}
          <span className="a-accent">
            {pendingApproval} Παραδοτέα περιμένουν έγκριση
          </span>
        </p>
        <p className="a-muted">{monthly.renewal}</p>
      </section>

      <section>
        <h2 className="a-label">Πρόταση · {oneOff.title}</h2>
        {oneOff.lines.map((line) => (
          <p key={line.description} className="a-line">
            <span>{line.description}</span>
            <span className="a-tc">{formatEuro(line.totalPrice ?? 0)}</span>
          </p>
        ))}
      </section>

      <section>
        <h2 className="a-label">Χρονολόγιο</h2>
        <ul className="a-log">
          {activity.map((item) => (
            <li key={item.what}>
              <span className="a-tc">{item.when}</span>
              {item.what}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
