import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type {
  BookingAgreement,
  CrewTemplate,
  EquipmentCandidate,
  FilmingCard,
  FilmingQueue,
  FilmingRow,
  FilmingSettings,
  FilmingTab,
  MineEntry,
  NamedRef,
} from "./types";
import {
  bookingOptionsSchema,
  candidatesSchema,
  crewTemplatesSchema,
  equipmentCandidatesSchema,
  mineViewSchema,
  queueSchema,
  settingsViewSchema,
} from "./view-schema";
import { cardSchema, filmingsViewSchema } from "./view-schema-card";

// Ανάγνωση των Γυρισμάτων. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.
// «Δεν βρέθηκε» ή «δεν έχεις Δικαίωμα» (P0001, 42501) είναι η ίδια σελίδα, όχι σφάλμα φόρτωσης.

const NOT_VISIBLE = ["P0001", "42501"];

export async function listFilmings(tab: FilmingTab): Promise<ReadResult<FilmingRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listFilmings",
    supabase.rpc("filmings_view", { p_tab: tab, p_limit: 100 }),
    (data) => filmingsViewSchema.parse(data),
  );
}

// Τα ανοιχτά Γυρίσματα για τη δέσμευση εξοπλισμού από την F2.
export async function listOpenFilmings(): Promise<ReadResult<FilmingRow[]>> {
  return listFilmings("open");
}

export async function getFilming(
  filmingId: string,
): Promise<ReadResult<FilmingCard | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("filming_view", { p_id: filmingId });
  if (error && NOT_VISIBLE.includes(error.code ?? "")) return { ok: true, data: null };
  if (error) {
    console.error("getFilming:", error.message);
    return { ok: false };
  }
  return { ok: true, data: cardSchema.parse(data) };
}

export async function getQueue(): Promise<ReadResult<FilmingQueue>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getQueue", supabase.rpc("filming_queue_view"), (data) => queueSchema.parse(data));
}

export async function listMine(): Promise<ReadResult<MineEntry[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("listMine", supabase.rpc("filming_mine_view"), (data) => mineViewSchema.parse(data));
}

export async function listBookingOptions(
  clientId: string | null = null,
): Promise<ReadResult<BookingAgreement[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listBookingOptions",
    supabase.rpc("filming_new_options", { p_client: clientId }),
    (data) => bookingOptionsSchema.parse(data),
  );
}

export async function listCrewTemplates(): Promise<ReadResult<CrewTemplate[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listCrewTemplates",
    supabase.rpc("crew_templates_view"),
    (data) => crewTemplatesSchema.parse(data),
  );
}

// Ενεργοί Χρήστες ομάδας για το Συνεργείο (μόνο για filming.crew).
export async function listCrewCandidates(): Promise<ReadResult<NamedRef[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listCrewCandidates",
    supabase.rpc("filming_crew_candidates"),
    (data) => candidatesSchema.parse(data),
  );
}

export async function listEquipmentCandidates(): Promise<ReadResult<EquipmentCandidate[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listEquipmentCandidates",
    supabase.rpc("filming_equipment_candidates"),
    (data) => equipmentCandidatesSchema.parse(data),
  );
}

export async function getFilmingSettings(): Promise<ReadResult<FilmingSettings>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getFilmingSettings",
    supabase.rpc("filming_settings_view"),
    (data) => settingsViewSchema.parse(data),
  );
}
