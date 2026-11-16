import { z } from "zod";

import { callRpc } from "./action-support";
import { pickTemplate } from "./default-templates";
import { getFilming } from "./queries";
import { crewTemplatesSchema } from "./view-schema";

// Κοινό για τους οδηγούς «Στήνω γύρισμα» και «Εγκρίνω αιτήματα γυρίσματος». Δεν είναι αρχείο "use server".

const equipmentTemplatesSchema = z.array(
  z.object({ id: z.uuid(), name: z.string() }),
);

// Ένα Πρότυπο από τη λίστα του (μέσω RPC, ώστε η βάση να ελέγχει το Δικαίωμα), διαλεγμένο για το είδος.
async function templateFor(
  view: string,
  schema: z.ZodType<readonly { id: string; name: string }[]>,
  kindLabel: string,
) {
  const list = await callRpc(view, {});
  const parsed = list.ok ? schema.safeParse(list.data ?? []) : null;
  return parsed?.success ? pickTemplate(parsed.data, kindLabel) : undefined;
}

// Η βάση παραλείπει όποιον έχει άλλο Γύρισμα, αλλά βάζει όποιον έχει ρεπό/άδεια και το αντικείμενο σε σύγκρουση
// (όταν η ρύθμιση το επιτρέπει). Για τα προεπιλεγμένα ισχύει «ό,τι δεν χωρά δεν μπαίνει»: βγαίνουν εδώ,
// και το βήμα Συνεργείου τα δείχνει με όνομα και λόγο.
async function dropWhatDoesNotFit(id: string): Promise<void> {
  const card = await getFilming(id);
  if (!card.ok || !card.data) return;
  const { crew, equipment } = card.data;
  const fits = crew.filter((member) => !member.isBlocked);
  const clashes = equipment.filter((line) => line.conflict);
  await Promise.all([
    fits.length < crew.length
      ? callRpc("filming_crew_set", {
          p_id: id,
          p_user_ids: fits.map((member) => member.userId),
        })
      : null,
    ...clashes.map((line) =>
      callRpc("equipment_item_release", { p_item: line.itemId, p_filming: id }),
    ),
  ]);
}

// Με τη δημιουργία ή την έγκριση μπαίνουν τα προεπιλεγμένα Πρότυπα Συνεργείου και Εξοπλισμού, μόνο όσα χωρούν.
// Χωρίς Δικαίωμα ή Πρότυπο, απλώς δεν μπαίνει. Το Γύρισμα υπάρχει ήδη: ένα λάθος εδώ δεν το ακυρώνει,
// το βήμα Συνεργείου του οδηγού δείχνει τι δεν μπήκε και γιατί.
export async function applyDefaultTemplates(
  data: unknown,
  kindLabel: string,
): Promise<void> {
  const id = z.uuid().safeParse(data);
  if (!id.success) return;
  const [crew, equipment] = await Promise.all([
    templateFor("crew_templates_view", crewTemplatesSchema, kindLabel),
    templateFor(
      "equipment_templates_view",
      equipmentTemplatesSchema,
      kindLabel,
    ),
  ]);
  if (!crew && !equipment) return;
  await Promise.all([
    crew
      ? callRpc("filming_crew_apply_template", {
          p_id: id.data,
          p_template: crew.id,
        })
      : null,
    equipment
      ? callRpc("filming_equipment_apply_template", {
          p_id: id.data,
          p_template: equipment.id,
        })
      : null,
  ]);
  await dropWhatDoesNotFit(id.data);
}
