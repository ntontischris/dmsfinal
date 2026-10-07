import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { COMPANY } from "@/data/settings-company";
import { FORM_LIMITS, INTEREST_FORM_FIELDS, type Lang } from "@/data/website";
import {
  packageName,
  publicPackages,
  publicSectors,
  sectorName,
} from "@/data/website-access";
import { screenHref, type ScreenQuery } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

import "./r-forms.css";

// Σύνδεσμος στην ίδια οθόνη με αλλαγές στο query (undefined = αφαίρεση).
export const withQuery = (
  role: RoleId,
  code: string,
  query: ScreenQuery,
  patch: Readonly<Record<string, string | undefined>>,
): string => screenHref(role, code, { ...query, ...patch });

export type FormFail = "invalid" | "human" | "limit" | undefined;

export const parseFail = (value: string | undefined): FormFail =>
  value === "invalid" || value === "human" || value === "limit"
    ? value
    : undefined;

interface InterestFormProps {
  role: RoleId;
  lang: Lang;
  query: ScreenQuery;
  fail?: FormFail;
  compact?: boolean; // μέσα στο widget: χωρίς επιλογές ενδιαφέροντος
  code?: string; // η οθόνη που φιλοξενεί τη φόρμα (για «Δοκιμάστε ξανά»)
}

const ERRORS_EL: Readonly<Record<string, string>> = {
  name: "Γράψτε το όνομά σας.",
  email: "Το email δεν φαίνεται σωστό. Δείτε αν λείπει το @ ή η κατάληξη.",
  message: "Πείτε μας λίγα λόγια για να μπορέσουμε να απαντήσουμε.",
};
const ERRORS_EN: Readonly<Record<string, string>> = {
  name: "Please enter your name.",
  email: "That email does not look right. Check the @ and the ending.",
  message: "Tell us a little so we can reply.",
};

export function ContactAlternative({ lang }: { lang: Lang }) {
  return (
    <p className="r-form-note">
      {tr(lang, "Ή γράψτε μας στο", "Or reach us at")}{" "}
      <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>{" "}
      {tr(lang, "ή καλέστε στο", "or call")} {COMPANY.phone}.
    </p>
  );
}

function LimitNotice({ lang }: { lang: Lang }) {
  const n = FORM_LIMITS.perAddressPerHour;
  return (
    <div className="r-alert" role="status">
      <strong>
        {tr(lang, "Λάβαμε ήδη το αίτημά σας", "We already have your request")}
      </strong>
      <span>
        {tr(
          lang,
          `Από αυτή τη διεύθυνση έχουν σταλεί ${n} αιτήματα την τελευταία ώρα. Θα σας απαντήσουμε σύντομα.`,
          `${n} requests were sent from this address in the last hour. We will reply soon.`,
        )}
      </span>
      <ContactAlternative lang={lang} />
    </div>
  );
}

function InterestChoices({ lang, query }: { lang: Lang; query: ScreenQuery }) {
  const sectors = publicSectors(lang);
  const packages = publicPackages(lang);
  if (sectors.length + packages.length === 0) return null;
  const field = INTEREST_FORM_FIELDS.find((f) => f.id === "interest");
  return (
    <fieldset className="r-checks">
      <legend>{lang === "en" ? field?.labelEn : field?.labelEl}</legend>
      {sectors.map((s) => (
        <label key={s.id}>
          <input
            type="checkbox"
            name="interest"
            value={s.slug}
            defaultChecked={query.sector === s.slug}
          />
          {sectorName(s, lang)}
        </label>
      ))}
      {packages.map((p) => (
        <label key={p.id}>
          <input
            type="checkbox"
            name="interest"
            value={p.id}
            defaultChecked={query.package === p.id}
          />
          {tr(lang, "Πακέτο: ", "Package: ")}
          {packageName(p, lang)}
        </label>
      ))}
    </fieldset>
  );
}

interface TextFieldProps {
  id: string;
  lang: Lang;
  error?: string;
  value?: string;
}

function TextField({ id, lang, error, value }: TextFieldProps) {
  const field = INTEREST_FORM_FIELDS.find((f) => f.id === id);
  if (!field) return null;
  const label = lang === "en" ? field.labelEn : field.labelEl;
  return (
    <label>
      <span>
        {label}
        {field.isRequired ? " *" : ""}
      </span>
      {id === "message" ? (
        <textarea
          className="input"
          name={id}
          rows={5}
          maxLength={FORM_LIMITS.messageMaxChars}
          defaultValue={value}
          aria-invalid={!!error}
        />
      ) : (
        <input
          className="input"
          name={id}
          type={id === "email" ? "email" : "text"}
          defaultValue={value}
          aria-invalid={!!error}
        />
      )}
      {error && <span className="r-field-error">{error}</span>}
    </label>
  );
}

// Στοιχεία που «έμειναν» μετά από αποτυχία (δείγμα).
const keptValues = (fail: FormFail) =>
  fail === "invalid"
    ? { name: "Άννα Κ.", email: "anna.k@", message: "" }
    : fail === "human"
      ? {
          name: "Άννα Κ.",
          email: "anna@example.com",
          message: "Θέλουμε προσφορά για reels.",
        }
      : { name: undefined, email: undefined, message: undefined };

function HumanFailNotice({ lang }: { lang: Lang }) {
  return (
    <div className="r-alert" role="alert">
      <strong>
        {tr(
          lang,
          "Δεν καταφέραμε να επιβεβαιώσουμε ότι είστε άνθρωπος.",
          "We could not confirm that you are human.",
        )}
      </strong>
      <span>
        {tr(
          lang,
          "Τα στοιχεία σας έμειναν όπως τα γράψατε.",
          "Your details are still here.",
        )}
      </span>
      <ContactAlternative lang={lang} />
    </div>
  );
}

function PrivacyLine({ role, lang }: { role: RoleId; lang: Lang }) {
  return (
    <p className="r-form-note">
      {tr(
        lang,
        "Τα στοιχεία σας χρησιμοποιούνται μόνο για να σας απαντήσουμε. ",
        "Your details are used only to reply to you. ",
      )}
      <Link href={siteHref(role, "R8", lang, { doc: "privacy" })}>
        {tr(lang, "Πολιτική απορρήτου", "Privacy policy")}
      </Link>
    </p>
  );
}

export function InterestForm(props: InterestFormProps) {
  const { role, lang, query, fail, compact, code = "R7" } = props;
  if (fail === "limit") return <LimitNotice lang={lang} />;
  const errors =
    fail === "invalid" ? (lang === "en" ? ERRORS_EN : ERRORS_EL) : {};
  const kept = keptValues(fail);
  const sent = siteHref(role, "R7", lang, { step: "sent" });
  const retry = withQuery(role, code, query, { fail: undefined });
  const isHuman = fail === "human";
  return (
    <form
      className="site-form"
      aria-label={tr(lang, "Φόρμα ενδιαφέροντος", "Interest form")}
    >
      <TextField id="name" lang={lang} error={errors.name} value={kept.name} />
      <TextField
        id="email"
        lang={lang}
        error={errors.email}
        value={kept.email}
      />
      {!compact && <TextField id="phone" lang={lang} />}
      {!compact && <TextField id="company" lang={lang} />}
      {!compact && <InterestChoices lang={lang} query={query} />}
      <TextField
        id="message"
        lang={lang}
        error={errors.message}
        value={kept.message}
      />
      <div className="site-trap" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {isHuman && <HumanFailNotice lang={lang} />}
      <div>
        <Link className="site-button" href={isHuman ? retry : sent}>
          {isHuman
            ? tr(lang, "Δοκιμάστε ξανά", "Try again")
            : tr(lang, "Στείλτε το αίτημα", "Send request")}
        </Link>
      </div>
      <PrivacyLine role={role} lang={lang} />
    </form>
  );
}
