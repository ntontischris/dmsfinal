import { EXPORT_LOG } from "@/data/reports";
import type { RoleId } from "@/data/roles";
import { fmtDate } from "@/screens/shared";

const visibleLog = (role: RoleId) =>
  role === "accountant"
    ? EXPORT_LOG.filter((e) => e.by.includes("(Λογιστής)"))
    : EXPORT_LOG;

export function LogSection({ role }: { role: RoleId }) {
  const entries = visibleLog(role);
  return (
    <section className="card m2-section">
      <h2 className="card-title">Ιστορικό εξαγωγών</h2>
      {role === "accountant" && (
        <p className="note">Βλέπεις μόνο τις δικές σου εξαγωγές.</p>
      )}
      <table className="rtable">
        <thead>
          <tr>
            <th>Πότε</th>
            <th>Ποιος</th>
            <th>Τι</th>
            <th className="num">Γραμμές</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td data-label="Πότε">
                {fmtDate(e.when.slice(0, 10))} {e.when.slice(11)}
              </td>
              <td data-label="Ποιος">{e.by}</td>
              <td data-label="Τι">{e.what}</td>
              <td className="num" data-label="Γραμμές">
                {e.rows}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
