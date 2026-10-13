import { createSupabase } from "@/lib/supabase/server";

import { signedUrl } from "./knowledge-storage";
import { read, type ReadResult } from "./read";
import {
  parseFileLink,
  parseItemView,
  parseLibrary,
  parseManageItem,
  parseManageList,
  type ItemStatus,
  type ItemView,
  type Library,
  type ManageItem,
  type ManageList,
} from "./view-schema";

// Ανάγνωση της Γνώσης. Όλα περνούν από RPC· η βάση αποφασίζει ποιος βλέπει τι (Κοινό, knowledge.manage).

export async function getLibrary(): Promise<ReadResult<Library>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getLibrary", supabase.rpc("knowledge_library"), parseLibrary);
}

// Ένα στοιχείο του A8. null = δεν υπάρχει ή δεν ανήκει στο Κοινό (η βάση δεν ξεχωρίζει τα δύο).
export async function getItem(
  id: string,
): Promise<ReadResult<ItemView | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("knowledge_item_get", {
    p_id: id,
  });
  if (error?.code === "42501") return { ok: true, data: null };
  return read("getItem", Promise.resolve({ data, error }), parseItemView);
}

export async function getManageList(
  status: ItemStatus | null,
  sectionId: string | null,
): Promise<ReadResult<ManageList | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("knowledge_manage_list", {
    p_status: status,
    p_section: sectionId,
  });
  if (error?.code === "42501") return { ok: true, data: null };
  return read(
    "getManageList",
    Promise.resolve({ data, error }),
    parseManageList,
  );
}

// Ο επεξεργαστής (L1). null = χωρίς Δικαίωμα ή το στοιχείο δεν βρέθηκε.
export async function getManageItem(
  id: string,
): Promise<ReadResult<ManageItem | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("knowledge_manage_item", {
    p_id: id,
  });
  if (error?.code === "42501" || error?.code === "P0001")
    return { ok: true, data: null };
  return read(
    "getManageItem",
    Promise.resolve({ data, error }),
    parseManageItem,
  );
}

export type LinkResult =
  { ok: true; url: string } | { ok: false; status: 404 | 500 };

// Λήψη Αρχείου: η βάση ελέγχει ορατότητα, ο server φτιάχνει σύνδεσμο 60″. Κάθε άρνηση φαίνεται ως «δεν βρέθηκε».
export async function getFileLink(id: string): Promise<LinkResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, status: 500 };
  const { data, error } = await supabase.rpc("knowledge_file_path", {
    p_id: id,
  });
  if (error) {
    if (error.code !== "42501") console.error("getFileLink:", error.message);
    return { ok: false, status: error.code === "42501" ? 404 : 500 };
  }
  const link = parseFileLink(data);
  const url = await signedUrl(link.path, link.name);
  return url ? { ok: true, url } : { ok: false, status: 404 };
}

// Εικόνα μέσα σε Άρθρο, με τον ίδιο έλεγχο ορατότητας.
export async function getImageLink(
  itemId: string,
  name: string,
): Promise<LinkResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, status: 500 };
  const { data, error } = await supabase.rpc("knowledge_image_path", {
    p_item: itemId,
    p_name: name,
  });
  if (error || typeof data !== "string") {
    if (error && error.code !== "42501")
      console.error("getImageLink:", error.message);
    return { ok: false, status: error && error.code !== "42501" ? 500 : 404 };
  }
  const url = await signedUrl(data);
  return url ? { ok: true, url } : { ok: false, status: 404 };
}
