import { COOKIE_CATEGORIES, type Lang } from "@/data/website";
import { COOKIE_TOOLS, SUBPROCESSORS } from "@/screens/r8-docs";
import { tr } from "@/screens/w-site";

export function SubprocessorsTable({ lang }: { lang: Lang }) {
  return (
    <div className="r-scroll">
      <table className="r-table">
        <caption className="r-meta">
          {tr(lang, "Υποεκτελούντες", "Subprocessors")}
        </caption>
        <thead>
          <tr>
            <th>{tr(lang, "Εταιρεία", "Company")}</th>
            <th>{tr(lang, "Για τι", "Purpose")}</th>
            <th>{tr(lang, "Πού · εγγυήσεις", "Where · safeguards")}</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{lang === "en" ? p.roleEn : p.roleEl}</td>
              <td>{p.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CookieToolsTable({ lang }: { lang: Lang }) {
  return (
    <div className="r-scroll">
      <table className="r-table">
        <caption className="r-meta">
          {tr(lang, "Κατηγορίες και εργαλεία", "Categories and tools")}
        </caption>
        <thead>
          <tr>
            <th>{tr(lang, "Κατηγορία", "Category")}</th>
            <th>{tr(lang, "Εργαλεία", "Tools")}</th>
            <th>{tr(lang, "Διάρκεια", "Duration")}</th>
          </tr>
        </thead>
        <tbody>
          {COOKIE_CATEGORIES.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{lang === "en" ? c.labelEn : c.labelEl}</strong>
                <br />
                {lang === "en" ? c.textEn : c.textEl}
              </td>
              <td>
                {lang === "en"
                  ? COOKIE_TOOLS[c.id]?.toolsEn
                  : COOKIE_TOOLS[c.id]?.toolsEl}
              </td>
              <td>{COOKIE_TOOLS[c.id]?.keeps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
