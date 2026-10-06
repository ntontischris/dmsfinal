"use client";

import { lineTotal, type AgreementLine } from "@/data/agreements";
import { HoursCell, ProvisionsCell } from "@/screens/d2-line-cells";
import { AddLine, LinesTotals } from "@/screens/d2-line-add";
import { lineDeviationsOf, withQuantity } from "@/screens/d2-model";
import { NumberInput, type SectionProps } from "@/screens/d2-ui";
import { Badge, fmtMoney } from "@/screens/shared";

interface LineRowProps extends SectionProps {
  line: AgreementLine;
}

function DescriptionCell({
  line,
  draft,
  update,
  isEditing,
  caps,
}: LineRowProps) {
  const deviations = caps.isClient ? [] : lineDeviationsOf(draft, line);
  const isOffCatalogue =
    line.catalogPrice !== null && line.catalogPrice !== line.unitPrice;
  const setDescription = (description: string) =>
    update((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.id === line.id ? { ...l, description } : l)),
    }));
  return (
    <div>
      {isEditing ? (
        <input
          className="input d2-wide"
          aria-label="Περιγραφή γραμμής"
          value={line.description}
          onChange={(event) => setDescription(event.target.value)}
        />
      ) : (
        line.description
      )}
      {!caps.isClient && isOffCatalogue && line.catalogPrice !== null && (
        <div className="muted">Κατάλογος: {fmtMoney(line.catalogPrice)}</div>
      )}
      {!caps.isClient && line.itemId === null && (
        <div className="muted">Ελεύθερη γραμμή</div>
      )}
      {deviations.length > 0 && (
        <div>
          <Badge tone="attention">Παρέκκλιση</Badge>{" "}
          <span className="muted">{deviations.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}

function LineRow(props: LineRowProps) {
  const { line, update, isEditing, caps } = props;
  const replace = (next: AgreementLine) =>
    update((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.id === line.id ? next : l)),
    }));
  const remove = () =>
    update((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== line.id) }));
  return (
    <tr>
      <td data-label="Γραμμή">
        <DescriptionCell {...props} />
      </td>
      <td className="num" data-label="Ποσότητα">
        {isEditing ? (
          <NumberInput
            label="Ποσότητα"
            min={1}
            value={line.quantity}
            onChange={(value) =>
              replace(withQuantity(line, Math.max(1, value)))
            }
          />
        ) : (
          line.quantity
        )}
      </td>
      <td className="num" data-label="Τιμή μονάδας">
        {isEditing ? (
          <NumberInput
            label="Τιμή μονάδας"
            value={line.unitPrice}
            step={10}
            onChange={(unitPrice) => replace({ ...line, unitPrice })}
            suffix="€"
          />
        ) : (
          fmtMoney(line.unitPrice)
        )}
      </td>
      <td data-label="Παροχές">
        <ProvisionsCell line={line} isEditing={isEditing} onChange={replace} />
      </td>
      {caps.canSeeCost && (
        <td className="num" data-label="Ώρες γύρ. / μοντ.">
          <HoursCell
            line={line}
            isEditing={isEditing && caps.canManageCost}
            onChange={replace}
          />
        </td>
      )}
      <td className="num" data-label="Σύνολο">
        <div>
          <strong>{fmtMoney(lineTotal(line))}</strong>
          {isEditing && (
            <div>
              <button type="button" className="button" onClick={remove}>
                Αφαίρεση
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function LinesSection(props: SectionProps) {
  const { draft, isEditing, caps } = props;
  const perPeriod = draft.kind === "μηνιαία" ? " ανά μήνα" : "";
  return (
    <section className="card">
      <div className="card-title">
        <h2>Γραμμές</h2>
        <span className="muted">Τιμές χωρίς ΦΠΑ{perPeriod}</span>
      </div>
      {draft.lines.length === 0 ? (
        <p className="muted">
          Καμία γραμμή ακόμα. Πρόσθεσε Πακέτο ή Υπηρεσία από τον Κατάλογο ή
          ελεύθερη γραμμή.
        </p>
      ) : (
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Γραμμή</th>
                <th className="num">Ποσότητα</th>
                <th className="num">Τιμή μονάδας</th>
                <th>Παροχές</th>
                {caps.canSeeCost && <th className="num">Ώρες γύρ. / μοντ.</th>}
                <th className="num">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line) => (
                <LineRow key={line.id} {...props} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditing && <AddLine {...props} />}
      <LinesTotals draft={draft} />
    </section>
  );
}
