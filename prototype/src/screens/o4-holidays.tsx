import Link from "next/link";

import { HOLIDAYS } from "@/data/settings-filming";
import { SettingsCard } from "@/screens/o-shared";
import { Badge, fmtDate, screenHref, type ScreenProps } from "@/screens/shared";

// Αργίες 2026: κλειστές αυτόματα, με «Άνοιγμα ως εξαίρεση» (?open=<id> / ?close=<id>).
export function O4Holidays({ role, query }: ScreenProps) {
  const href = (params: Record<string, string | undefined>) =>
    screenHref(role, "O4", { state: query.state, part: "holidays", ...params });
  const isOpened = (id: string, base: boolean) =>
    query.open === id ? true : query.close === id ? false : base;
  return (
    <SettingsCard title="Επίσημες αργίες 2026">
      <p className="muted o-hint">
        Κλειστές μόνες τους. Αν θες να δουλέψεις, τις ανοίγεις ως εξαίρεση.
      </p>
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Αργία</th>
              <th>Ημερομηνία</th>
              <th>Είδος</th>
              <th>Κατάσταση</th>
              <th>Ενέργεια</th>
            </tr>
          </thead>
          <tbody>
            {HOLIDAYS.map((h) => {
              const isOpen = isOpened(h.id, h.isOpenedAsException);
              return (
                <tr key={h.id}>
                  <td data-label="Αργία">{h.name}</td>
                  <td data-label="Ημερομηνία">{fmtDate(h.date)}</td>
                  <td data-label="Είδος">{h.kind}</td>
                  <td data-label="Κατάσταση">
                    {isOpen ? (
                      <Badge tone="attention">ανοιχτή ως εξαίρεση</Badge>
                    ) : (
                      "κλειστή αυτόματα"
                    )}
                  </td>
                  <td data-label="Ενέργεια">
                    {isOpen ? (
                      <Link href={href({ close: h.id })}>Κλείσιμο ξανά</Link>
                    ) : (
                      <Link href={href({ open: h.id })}>
                        Άνοιγμα ως εξαίρεση
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted o-hint">
        Οι αργίες που εξαρτώνται από το Πάσχα υπολογίζονται από το ορθόδοξο
        Πάσχα κάθε έτους. Η αλλαγή γράφεται στο Ίχνος.
      </p>
    </SettingsCard>
  );
}
