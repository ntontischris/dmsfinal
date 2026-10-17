import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { deleteSubscription, saveSubscription } from "../actions";
import type { Subscription } from "../schemas";
import { IntegrationForm } from "./integration-form";

const PAGE = "/app/settings/integrations";

// Νέα συνδρομή ή επεξεργασία. Εδώ μόνο καταγράφεται· το πλάνο αλλάζει στον πάροχο.
export function SubscriptionForm({ sub }: { sub: Subscription | null }) {
  return (
    <section
      className="grid gap-3 rounded-md border p-4"
      aria-label={sub ? `Επεξεργασία: ${sub.provider}` : "Νέα συνδρομή"}
    >
      <h3 className="m-0 text-base font-semibold">
        {sub ? `Επεξεργασία: ${sub.provider}` : "Νέα συνδρομή"}
      </h3>
      <IntegrationForm
        action={saveSubscription}
        submitLabel={sub ? "Αποθήκευση συνδρομής" : "Προσθήκη συνδρομής"}
        pendingLabel="Αποθήκευση…"
        variant="primary"
        resetOnSuccess={!sub}
      >
        {sub && <input type="hidden" name="id" value={sub.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Πάροχος">
            <Input
              name="provider"
              required
              maxLength={80}
              defaultValue={sub?.provider ?? ""}
            />
          </Field>
          <Field label="Τι καλύπτει">
            <Input
              name="covers"
              maxLength={200}
              defaultValue={sub?.covers ?? ""}
            />
          </Field>
          <Field label="Πλάνο">
            <Input name="plan" maxLength={80} defaultValue={sub?.plan ?? ""} />
          </Field>
          <Field label="Μηνιαίο κόστος" hint="Π.χ. 20 ή 19,90.">
            <Input
              name="monthlyCost"
              required
              inputMode="decimal"
              defaultValue={
                sub ? String(sub.monthlyCost).replace(".", ",") : ""
              }
            />
          </Field>
          <Field label="Νόμισμα" hint="Κωδικός ISO, π.χ. EUR ή USD.">
            <Input
              name="currency"
              required
              maxLength={3}
              list="subscription-currencies"
              defaultValue={sub?.currency ?? "EUR"}
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Ανανέωση">
            <Input
              name="renewsOn"
              type="date"
              defaultValue={sub?.renewsOn ?? ""}
            />
          </Field>
          <Field label="Λογαριασμός" hint="Π.χ. της εταιρείας ή του developer.">
            <Input
              name="account"
              maxLength={120}
              defaultValue={sub?.account ?? ""}
            />
          </Field>
          <Field label="Ποιος πληρώνει">
            <Input
              name="paidBy"
              maxLength={120}
              defaultValue={sub?.paidBy ?? ""}
            />
          </Field>
          <Field label="Σύνδεσμος στον πάροχο" hint="Ξεκινά με https://.">
            <Input
              name="link"
              type="url"
              maxLength={500}
              defaultValue={sub?.link ?? ""}
            />
          </Field>
        </div>
        <datalist id="subscription-currencies">
          <option value="EUR" />
          <option value="USD" />
          <option value="GBP" />
        </datalist>
      </IntegrationForm>
      <div className="flex flex-wrap items-start gap-3">
        <Link className={buttonVariants({ variant: "ghost" })} href={PAGE}>
          Κλείσιμο
        </Link>
        {sub && (
          <IntegrationForm
            action={deleteSubscription}
            submitLabel="Διαγραφή συνδρομής"
            variant="danger"
          >
            <input type="hidden" name="id" value={sub.id} />
          </IntegrationForm>
        )}
      </div>
    </section>
  );
}
