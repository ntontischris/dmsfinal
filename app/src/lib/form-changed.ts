// Μετατρέπει τα πεδία μιας φόρμας σε σταθερό κείμενο, ώστε δύο καταστάσεις να συγκρίνονται με ισότητα.
// Τα πεδία ταξινομούνται, ώστε η σειρά στο DOM να μην μετράει ως αλλαγή.

type FormEntry = readonly [name: string, value: string];

// Το «version» των καρτών Εταιρείας αλλάζει όταν αποθηκεύεται άλλη κάρτα· δεν είναι αλλαγή του Χρήστη.
const IGNORED_FIELDS = new Set(["version"]);

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareEntries(left: FormEntry, right: FormEntry): number {
  const byName = compareText(left[0], right[0]);
  return byName !== 0 ? byName : compareText(left[1], right[1]);
}

export function serializeFormData(data: FormData): string {
  const entries: FormEntry[] = [];
  data.forEach((value, name) => {
    if (IGNORED_FIELDS.has(name)) return;
    entries.push([name, typeof value === "string" ? value : value.name]);
  });
  return JSON.stringify(entries.sort(compareEntries));
}
