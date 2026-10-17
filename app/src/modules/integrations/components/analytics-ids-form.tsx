import { Field, Input } from "@/components/ui/field";

import { saveAnalyticsIds } from "../actions";
import type { AnalyticsIds } from "../schemas";
import { IntegrationForm } from "./integration-form";

// GA4 και Meta Pixel: δημόσια αναγνωριστικά, όχι κλειδιά. Τα αλλάζει ο Ιδιοκτήτης· η Ιστοσελίδα θα τα βρει έτοιμα.
export function AnalyticsIdsForm({ ids }: { ids: AnalyticsIds }) {
  return (
    <IntegrationForm
      action={saveAnalyticsIds}
      submitLabel="Αποθήκευση αναγνωριστικών"
      pendingLabel="Αποθήκευση…"
    >
      <Field
        label="Google Analytics, Measurement ID"
        hint="Μορφή G-XXXXXXXXXX. Κενό = δεν έχει οριστεί."
      >
        <Input
          name="ga4"
          defaultValue={ids.ga4}
          placeholder="G-XXXXXXXXXX"
          autoComplete="off"
          className="font-mono"
        />
      </Field>
      <Field label="Meta Pixel ID" hint="Μόνο ψηφία. Κενό = δεν έχει οριστεί.">
        <Input
          name="pixel"
          defaultValue={ids.pixel}
          inputMode="numeric"
          autoComplete="off"
          className="font-mono"
        />
      </Field>
    </IntegrationForm>
  );
}
