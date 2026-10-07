import Link from "next/link";
import type { ReactNode } from "react";

import { COMPANY } from "@/data/settings-company";
import type { Lang } from "@/data/website";
import { tr } from "@/screens/w-site";

import "./r-auth.css";

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="r-auth">
      <section className="r-card">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}

export function Msg({
  kind,
  children,
}: {
  kind: "error" | "info";
  children: ReactNode;
}) {
  return (
    <p
      className="r-msg"
      data-kind={kind}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export interface ProtoItem {
  key: string;
  label: string;
  href: string;
}

export function ProtoBar({
  items,
  current,
  heading,
}: {
  items: readonly ProtoItem[];
  current: string;
  heading?: string;
}) {
  return (
    <nav className="site-proto" aria-label="Prototype">
      <strong>Prototype:</strong> {heading && <span>{heading} </span>}
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Φιλικό σφάλμα της κατάστασης «σφάλμα»: με τα στοιχεία της εταιρείας.
export function FriendlyError({ lang }: { lang: Lang }) {
  return (
    <AuthCard title={tr(lang, "Κάτι πήγε στραβά", "Something went wrong")}>
      <Msg kind="error">
        {tr(
          lang,
          "Δεν καταφέραμε να ολοκληρώσουμε το αίτημα. Δοκιμάστε ξανά σε λίγο.",
          "We could not complete your request. Please try again shortly.",
        )}
      </Msg>
      <p className="r-muted">
        {tr(
          lang,
          "Αν συνεχιστεί, επικοινωνήστε μαζί μας:",
          "If it continues, contact us:",
        )}{" "}
        {COMPANY.email} · {COMPANY.phone}
      </p>
    </AuthCard>
  );
}
