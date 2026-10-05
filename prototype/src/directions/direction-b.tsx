import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import {
  CLIENT_LOGOS,
  CLIENT_SNAPSHOT,
  SERVICES,
  WORKS,
  formatEuro,
} from "@/directions/content";

import "@/directions/direction-b.css";

// B · Ακρίβεια: η εταιρεία ως καλοφτιαγμένο εργαλείο. Πυκνό, λεπτές γραμμές, πίνακες.

export function HomeB() {
  return (
    <div className="b-home">
      <section className="b-hero">
        <div>
          <p className="b-kicker">Παραγωγή βίντεο · Θεσσαλονίκη</p>
          <h1>Βίντεο για εταιρείες, με σαφή διαδικασία από την πρώτη μέρα.</h1>
          <p className="b-muted">
            Από το σενάριο ως το τελικό μοντάζ. Βλέπετε κάθε Παραδοτέο και
            εγκρίνετε από τον λογαριασμό σας.
          </p>
          <div className="b-actions">
            <a className="b-btn b-btn-primary" href="#">
              Ζήτα προσφορά
            </a>
            <a className="b-btn" href="#">
              Δες τις Δουλειές
            </a>
          </div>
        </div>
        <div className="b-reel" aria-label="Showreel">
          <span className="b-play">▶</span>
          <span className="b-muted">Showreel 2026 · 01:48</span>
        </div>
      </section>

      <section className="b-services">
        {SERVICES.map((service) => (
          <a key={service.title} href="#" className="b-service">
            <strong>{service.title}</strong>
            <span className="b-muted">{service.line}</span>
          </a>
        ))}
      </section>

      <section>
        <div className="b-section-head">
          <h2>Επιλεγμένες Δουλειές</h2>
          <a href="#" className="b-muted">
            Όλες →
          </a>
        </div>
        <table className="b-table">
          <thead>
            <tr>
              <th>Δουλειά</th>
              <th>Πελάτης</th>
              <th>Είδος</th>
              <th>Διάρκεια</th>
            </tr>
          </thead>
          <tbody>
            {WORKS.map((work) => (
              <tr key={work.title}>
                <td>
                  <span
                    className="b-swatch"
                    style={{ "--hue": work.hue } as React.CSSProperties}
                  />
                  {work.title}
                </td>
                <td className="b-muted">{work.client}</td>
                <td className="b-muted">{work.kind}</td>
                <td className="b-mono">{work.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="b-logos" aria-label="Πελάτες">
        {CLIENT_LOGOS.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </section>
    </div>
  );
}

export function ClientB() {
  const client = FICTIONAL_CLIENT;
  const [monthly, oneOff] = client.agreements;
  const { nextShoot, periodUsage, pendingApproval, openBalance, activity } =
    CLIENT_SNAPSHOT;

  return (
    <div className="b-client">
      <div className="b-crumbs b-muted">
        Πελάτες / <span>{client.name}</span>
      </div>
      <header className="b-client-head">
        <div className="b-avatar">ΚΚ</div>
        <h1>{client.name}</h1>
        <span className="b-pill b-pill-ok">Ενεργός</span>
        <span className="b-pill">Μηνιαία Συμφωνία</span>
        <div className="b-head-actions">
          <button className="b-btn" type="button">
            Νέα Ευκαιρία
          </button>
          <button className="b-btn b-btn-primary" type="button">
            Νέο Γύρισμα
          </button>
        </div>
      </header>
      <nav className="b-tabs" aria-label="Ενότητες Πελάτη">
        {[
          "Επισκόπηση",
          "Συμφωνίες",
          "Γυρίσματα",
          "Παραδοτέα",
          "Οικονομικά",
          "Μηνύματα",
        ].map((tab, i) => (
          <a key={tab} href="#" aria-current={i === 0 ? "page" : undefined}>
            {tab}
          </a>
        ))}
      </nav>

      <div className="b-layout">
        <div className="b-col">
          <section className="b-box">
            <h2>{monthly.title}</h2>
            <table className="b-table">
              <thead>
                <tr>
                  <th>Περίοδος</th>
                  <th>Από</th>
                  <th>Έως</th>
                  <th>Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {monthly.periods.map((period) => (
                  <tr key={period.label}>
                    <td>{period.label}</td>
                    <td className="b-mono">{period.starts}</td>
                    <td className="b-mono">{period.ends}</td>
                    <td>
                      <span
                        className={`b-pill ${period.state === "τρέχουσα" ? "b-pill-accent" : ""}`}
                      >
                        {period.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="b-meters">
              <Meter
                label="Γυρίσματα"
                used={periodUsage.shoots.used}
                of={periodUsage.shoots.of}
              />
              <Meter
                label="Reels"
                used={periodUsage.reels.used}
                of={periodUsage.reels.of}
              />
            </div>
          </section>

          <section className="b-box">
            <h2>
              {oneOff.title} <span className="b-pill">πρόταση</span>
            </h2>
            {oneOff.lines.map((line) => (
              <div key={line.description} className="b-row">
                <span>{line.description}</span>
                <span className="b-mono">
                  {formatEuro(line.totalPrice ?? 0)}
                </span>
              </div>
            ))}
          </section>

          <section className="b-box">
            <h2>Δραστηριότητα</h2>
            {activity.map((item) => (
              <div key={item.what} className="b-row">
                <span>{item.what}</span>
                <span className="b-muted">{item.when}</span>
              </div>
            ))}
          </section>
        </div>

        <aside className="b-props">
          <Prop label="Επωνυμία" value={client.legalName} />
          <Prop label="Πόλη" value={client.city} />
          <Prop label="Υπεύθυνη" value={client.owner} />
          <Prop
            label="Επόμενο Γύρισμα"
            value={`${nextShoot.date} ${nextShoot.time}`}
          />
          <Prop label="Για έγκριση" value={`${pendingApproval} Παραδοτέα`} />
          <Prop label="Υπόλοιπο" value={formatEuro(openBalance)} />
          <Prop label="Ανανέωση" value="31/12/2026" />
          <p className="b-props-title">Χρήστες πελάτη</p>
          {client.users.map((user) => (
            <div key={user.email} className="b-user">
              <span className="b-avatar b-avatar-sm">{user.name[0]}</span>
              {user.name}
              {user.isSignatory && <span className="b-pill">υπογράφει</span>}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function Meter({
  label,
  used,
  of,
}: {
  label: string;
  used: number;
  of: number;
}) {
  return (
    <div className="b-meter">
      <span>{label}</span>
      <span className="b-mono">
        {used}/{of}
      </span>
      <div className="b-track">
        <div style={{ width: `${(used / of) * 100}%` }} />
      </div>
    </div>
  );
}

function Prop({ label, value }: { label: string; value: string }) {
  return (
    <div className="b-prop">
      <span className="b-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
