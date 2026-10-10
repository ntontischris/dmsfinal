import { MutedNote } from "./form-fields";

// Η μετατροπή κλεισμένου χρόνου: το id πάει στη βάση μαζί με το Γύρισμα, και ο Χρήστης ενημερώνεται ότι θα σβηστεί.
export function FromBlockedFields({ id }: { id: string }) {
  return (
    <>
      <input type="hidden" name="fromBlocked" value={id} />
      <MutedNote>Ο κλεισμένος χρόνος θα σβηστεί όταν αποθηκευτεί το Γύρισμα.</MutedNote>
    </>
  );
}
