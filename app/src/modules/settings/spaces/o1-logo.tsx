import { removeLogo, uploadLogo } from "../actions-logo";
import { LOGO_ACCEPT } from "../logo-file";
import { ActionButton, SaveRow, SettingsForm } from "./o-form";
import { SettingsCard } from "./o-shared";

// e1 Λογότυπο: ένα αρχείο που φαίνεται στη μπάρα της εφαρμογής (ομάδα και πελάτες) και στα email.
// Χωρίς λογότυπο φαίνεται το προεπιλεγμένο και ο Έλεγχος ετοιμότητας γράφει «εκκρεμεί».

const PREVIEW_STYLE = {
  maxHeight: "4rem",
  maxWidth: "12rem",
  objectFit: "contain",
} as const;

export function LogoCard({ version }: { version: string | null }) {
  return (
    <SettingsCard
      title="Λογότυπο"
      hint={
        version
          ? "ανέβηκε· φαίνεται στη μπάρα και στα email"
          : "το προεπιλεγμένο"
      }
      isOpen={false}
    >
      <>
        {version ? (
          // Το route σερβίρει το αρχείο από ιδιωτικό bucket· το next/image δεν προσθέτει κάτι εδώ.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/company-logo?v=${encodeURIComponent(version)}`}
            alt="Το τρέχον λογότυπο"
            style={PREVIEW_STYLE}
          />
        ) : (
          <p className="ml-empty">
            Δεν έχει ανέβει λογότυπο· η εφαρμογή και τα email δείχνουν το
            προεπιλεγμένο.
          </p>
        )}
        <SettingsForm action={uploadLogo} resetOnSuccess>
          <label className="ml-field">
            <span>{version ? "Νέο λογότυπο" : "Αρχείο λογότυπου"}</span>
            <input
              className="input"
              type="file"
              name="logo"
              accept={LOGO_ACCEPT}
              required
            />
          </label>
          <p className="o-hint">
            PNG, JPG ή WebP έως 1 MB. Καλύτερα οριζόντιο, με διάφανο φόντο.
          </p>
          <SaveRow card="logo" label="Ανέβασμα" />
        </SettingsForm>
        {version && (
          <ActionButton
            action={removeLogo}
            fields={{}}
            label="Αφαίρεση λογότυπου"
            isDanger
          />
        )}
      </>
    </SettingsCard>
  );
}
