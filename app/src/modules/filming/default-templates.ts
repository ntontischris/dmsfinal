// Το προεπιλεγμένο Πρότυπο (Συνεργείου ή Εξοπλισμού) για το είδος του Γυρίσματος, όταν ο οδηγός το κλείνει.
// Τα Πρότυπα δεν δένονται ακόμα με είδος στη βάση: κερδίζει όποιο έχει στο όνομά του το είδος (π.χ. «Podcast»),
// αλλιώς το πρώτο της λίστας (αλφαβητικά, όπως τα δείχνει το E3).

const normal = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export const pickTemplate = <T extends { name: string }>(
  templates: readonly T[],
  kindLabel: string,
): T | undefined => {
  const kind = normal(kindLabel);
  return (
    (kind ? templates.find((item) => normal(item.name).includes(kind)) : undefined) ??
    templates[0]
  );
};
