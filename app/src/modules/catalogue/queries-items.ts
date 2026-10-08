import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { CatalogueItem, CostHint, ProvisionKind } from "./types";

// Ανάγνωση του Καταλόγου. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή και η βάση
// επιστρέφει null σε τιμή, ώρες και κόστος που ο θεατής δεν δικαιούται να δει (το null δεν είναι μηδέν).

const KIND_COLUMNS =
  "id, code, label, label_en, unit, unit_en, measure, default_hours, sort, retired_at";

// Το z.coerce.number().nullable() θα έκανε το null 0, γι' αυτό η ένωση.
const nullableNumber = z.union([z.null(), z.coerce.number()]);

const provisionSchema = z.object({
  kind_id: z.string(),
  quantity: z.coerce.number(),
});

const itemSchema = z.object({
  id: z.string(),
  kind: z.enum(["package", "service"]),
  billing: z.enum(["monthly", "one_off"]).nullable(),
  name: z.string(),
  name_en: z.string(),
  description: z.string(),
  unit: z.string(),
  is_public: z.boolean(),
  shows_price: z.boolean(),
  description_public: z.string(),
  description_public_en: z.string(),
  is_retired: z.boolean(),
  price: nullableNumber,
  hours_shoot: nullableNumber,
  hours_edit: nullableNumber,
  direct_cost: nullableNumber,
  direct_cost_note: z.string().nullable(),
  provisions: z.array(provisionSchema).nullable(),
  uses: nullableNumber,
  updated_at: z.string(),
  updated_by_name: z.string().nullable(),
});

const parseItems = (data: unknown): CatalogueItem[] =>
  z
    .array(itemSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      billing: row.billing,
      name: row.name,
      nameEn: row.name_en,
      description: row.description,
      unit: row.unit,
      isPublic: row.is_public,
      showsPrice: row.shows_price,
      descriptionPublic: row.description_public,
      descriptionPublicEn: row.description_public_en,
      isRetired: row.is_retired,
      price: row.price,
      hoursShoot: row.hours_shoot,
      hoursEdit: row.hours_edit,
      directCost: row.direct_cost,
      directCostNote: row.direct_cost_note,
      provisions: (row.provisions ?? []).map((p) => ({
        kindId: p.kind_id,
        quantity: p.quantity,
      })),
      uses: row.uses,
      updatedAt: row.updated_at,
      updatedByName: row.updated_by_name,
    }));

const kindSchema = z.array(
  z.object({
    id: z.string(),
    code: z.string().nullable(),
    label: z.string(),
    label_en: z.string(),
    unit: z.string(),
    unit_en: z.string(),
    measure: z.enum(["per_filming", "per_hour", "per_day"]).nullable(),
    default_hours: nullableNumber,
    sort: z.coerce.number(),
    retired_at: z.string().nullable(),
  }),
);

const parseKinds = (data: unknown): ProvisionKind[] =>
  kindSchema.parse(data).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    labelEn: row.label_en,
    unit: row.unit,
    unitEn: row.unit_en,
    measure: row.measure,
    defaultHours: row.default_hours,
    sort: row.sort,
    isRetired: row.retired_at !== null,
  }));

const hintSchema = z.array(
  z.object({
    hour_cost_month: z.string().nullable(),
    hour_cost: nullableNumber,
    multiplier_min: z.coerce.number(),
    multiplier_target: z.coerce.number(),
    multiplier_max: z.coerce.number(),
  }),
);

// Άδειο αποτέλεσμα = ο θεατής δεν «Βλέπει κόστος και κερδοφορία».
const parseHint = (data: unknown): CostHint | null => {
  const row = hintSchema.parse(data)[0];
  if (!row) return null;
  return {
    hourCostMonth: row.hour_cost_month,
    hourCost: row.hour_cost,
    multipliers: {
      min: row.multiplier_min,
      target: row.multiplier_target,
      max: row.multiplier_max,
    },
  };
};

export async function listCatalogue(
  options: { withRetired?: boolean } = {},
): Promise<ReadResult<CatalogueItem[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listCatalogue",
    supabase.rpc("catalogue_items_view", {
      p_with_retired: options.withRetired ?? false,
    }),
    parseItems,
  );
}

// Ό,τι ο θεατής δεν δικαιούται να ανοίξει (και τα αρχειοθετημένα για όποιον δεν διαχειρίζεται) έρχεται ως null.
export async function getCatalogueItem(
  itemId: string,
): Promise<ReadResult<CatalogueItem | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getCatalogueItem",
    supabase.rpc("catalogue_items_view", { p_item: itemId }),
    (data) => parseItems(data)[0] ?? null,
  );
}

// Μαζί με τα αποσυρμένα: το UI φιλτράρει με activeKinds, αλλά τα παλιά στοιχεία πρέπει να βρίσκουν το όνομα του είδους τους.
export async function listProvisionKinds(): Promise<
  ReadResult<ProvisionKind[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listProvisionKinds",
    supabase
      .from("provision_kinds")
      .select(KIND_COLUMNS)
      .order("sort")
      .order("id"),
    parseKinds,
  );
}

export async function getCostHint(): Promise<ReadResult<CostHint | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getCostHint", supabase.rpc("cost_hint"), parseHint);
}
