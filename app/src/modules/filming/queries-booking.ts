import { createSupabase } from "@/lib/supabase/server";

import type {
  BookingDay,
  BookingHoursView,
  BookingOptions,
  SlotCheck,
} from "./booking-types";
import { read, type ReadResult } from "./read";
import {
  bookingDaysSchema,
  bookingHoursViewSchema,
  bookingOptionsViewSchema,
  bookingSlotsSchema,
  slotCheckSchema,
} from "./view-schema-booking";

interface BookingLookup {
  agreementId: string;
  kindId: string;
  excludeId: string | null;
}

// Ανάγνωση των Κρατήσεων. Όλα περνούν από RPC· η βάση ελέγχει Δικαίωμα και κάθε μέρα και ώρα ξανά.

export async function getBookingHours(): Promise<ReadResult<BookingHoursView>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getBookingHours",
    supabase.rpc("booking_hours_view"),
    (data) => bookingHoursViewSchema.parse(data),
  );
}

export async function getBookingOptions(): Promise<ReadResult<BookingOptions>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getBookingOptions",
    supabase.rpc("booking_options"),
    (data) => bookingOptionsViewSchema.parse(data),
  );
}

// Στην αλλαγή (excludeId) το ίδιο Γύρισμα δεν μετράει στη φόρτωση ούτε στην Παροχή του.
export async function listBookingDays({
  agreementId,
  kindId,
  excludeId,
}: BookingLookup): Promise<ReadResult<BookingDay[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listBookingDays",
    supabase.rpc("booking_days", {
      p_agreement: agreementId,
      p_kind: kindId,
      p_exclude: excludeId,
    }),
    (data) => bookingDaysSchema.parse(data),
  );
}

// Οι ελεύθερες ώρες μιας μέρας, ως ISO στιγμές (η οθόνη τις εμφανίζει σε Ώρα Ελλάδας).
export async function listBookingSlots({
  agreementId,
  kindId,
  day,
  hours,
  excludeId,
}: BookingLookup & { day: string; hours: number }): Promise<ReadResult<string[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listBookingSlots",
    supabase.rpc("booking_slots", {
      p_agreement: agreementId,
      p_kind: kindId,
      p_day: day,
      p_hours: hours,
      p_exclude: excludeId,
    }),
    (data) => bookingSlotsSchema.parse(data),
  );
}

// Το πρόβλημα μιας ώρας για την ομάδα (μόνο προειδοποίηση). Χρειάζεται Δικαίωμα κράτησης.
export async function checkSlot(
  startsAt: string,
  hours: number,
  excludeId: string | null,
): Promise<ReadResult<SlotCheck>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "checkSlot",
    supabase.rpc("filming_slot_check", {
      p_starts_at: startsAt,
      p_hours: hours,
      p_exclude: excludeId,
    }),
    (data) => slotCheckSchema.parse(data),
  );
}
