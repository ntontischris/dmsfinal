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

// Η βάση παραλείπει όποιον έχει άλλο Γύρισμα· όποιος έχει ρεπό/άδεια μένει μέσα με προειδοποίηση (stino flow.md:
// «μόνο προειδοποίηση»). Το αντικείμενο σε σύγκρουση (όταν η ρύθμιση το επιτρέπει) απελευθερώνεται εδώ, ένα-ένα,
// και το βήμα Συνεργείου το δείχνει με όνομα και λόγο.
async function releaseClashingEquipment(id: string): Promise<void> {
  const card = await getFilming(id);
  if (!card.ok || !card.data) return;
  for (const line of card.data.equipment.filter((item) => item.conflict)) {
    const outcome = await callRpc("equipment_item_release", {
      p_item: line.itemId,
      p_filming: id,
    });
    if (!outcome.ok) console.error("equipment_item_release", outcome.state);
  }
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
  await releaseClashingEquipment(id.data);
}
