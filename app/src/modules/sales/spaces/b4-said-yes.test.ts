import { expect, test } from "vitest";

import { SAID_YES_TEXT, noteKindId, saidYesNotice } from "./b4-said-yes";

test("με πρόταση που υπάρχει: ανοίγει αυτή, η Ευκαιρία μένει ανοιχτή", () => {
  expect(saidYesNotice(true)).toBe(
    "Σημειώθηκε ότι ο πελάτης είπε ναι. Η Ευκαιρία μένει ανοιχτή και γίνεται κερδισμένη μόλις υπογράψει ο Υπογράφων. Δεν ειδοποιήθηκε ακόμα κανείς· ο πελάτης παίρνει τη Συμφωνία όταν τη στείλεις.",
  );
});

test("χωρίς πρόταση: ξεκινά νέα, έτοιμη με τα στοιχεία της Ευκαιρίας", () => {
  expect(saidYesNotice(false)).toContain(
    "Η νέα πρόταση ξεκινά με τον Πελάτη και τον τίτλο της Ευκαιρίας.",
  );
});

test("η Δραστηριότητα που μένει στο ιστορικό", () => {
  expect(SAID_YES_TEXT).toBe(
    "Ο πελάτης είπε ναι στην κουβέντα. Ετοιμάζεται η Συμφωνία για υπογραφή.",
  );
});

test("γράφεται ως Σημείωση, ή στο πρώτο ενεργό είδος", () => {
  const kind = (id: string, label: string, isRetired = false) => ({ id, label, isRetired });
  expect(noteKindId([kind("1", "Κλήση"), kind("2", "Σημείωση")])).toBe("2");
  expect(noteKindId([kind("1", "Σημείωση", true), kind("2", "Κλήση")])).toBe("2");
  expect(noteKindId([])).toBeNull();
});
