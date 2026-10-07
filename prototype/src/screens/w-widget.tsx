import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { Lang } from "@/data/website";
import { screenHref } from "@/screens/shared";

import "./r-forms.css";

// Το κουμπί του δημόσιου widget του Βοηθού σε κάθε δημόσια σελίδα· ανοίγει την R12.
export function WidgetBubble({ role, lang }: { role: RoleId; lang: Lang }) {
  return (
    <div className="site-widget">
      <Link
        className="site-button"
        href={screenHref(role, "R12", {
          lang: lang === "en" ? "en" : undefined,
        })}
        aria-label={lang === "en" ? "Open the Assistant" : "Άνοιγμα του Βοηθού"}
      >
        {lang === "en" ? "Ask us" : "Ρωτήστε μας"}
      </Link>
    </div>
  );
}
