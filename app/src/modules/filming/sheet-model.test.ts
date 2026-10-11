import { describe, expect, it } from "vitest";

import { addShot, moveShot, removeShot, renameShot, SHOT_LIMIT } from "./sheet-model";
import type { SheetShot } from "./sheet-types";

const shot = (id: string, text = `λήψη ${id}`): SheetShot => ({ id, text });
const TWO: SheetShot[] = [shot("a"), shot("b")];

describe("η λίστα λήψεων", () => {
  it("προσθέτει λήψη στο τέλος με κομμένο κείμενο", () => {
    expect(addShot(TWO, "  Πάγκος  ", "c")).toEqual([...TWO, { id: "c", text: "Πάγκος" }]);
  });

  it("δεν προσθέτει κενή λήψη", () => {
    expect(addShot(TWO, "   ", "c")).toEqual(TWO);
  });

  it("δεν περνά το όριο των λήψεων του Δελτίου", () => {
    const full = Array.from({ length: SHOT_LIMIT }, (_, index) => shot(`s${index}`));
    expect(addShot(full, "νέα", "x")).toHaveLength(SHOT_LIMIT);
  });

  it("μετακινεί μία θέση πάνω και κάτω", () => {
    const three = [shot("a"), shot("b"), shot("c")];
    expect(moveShot(three, "b", -1).map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moveShot(three, "b", 1).map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("δεν μετακινεί έξω από τα όρια ή ξένη λήψη", () => {
    expect(moveShot(TWO, "a", -1)).toEqual(TWO);
    expect(moveShot(TWO, "b", 1)).toEqual(TWO);
    expect(moveShot(TWO, "zz", 1)).toEqual(TWO);
  });

  it("διαγράφει μόνο τη λήψη με το id", () => {
    expect(removeShot(TWO, "a")).toEqual([shot("b")]);
  });

  it("αλλάζει το κείμενο μόνο της λήψης που ζητήθηκε", () => {
    expect(renameShot(TWO, "b", "Νέο")).toEqual([shot("a"), { id: "b", text: "Νέο" }]);
  });

  it("δεν αλλάζει την αρχική λίστα", () => {
    const original = [...TWO];
    moveShot(TWO, "b", -1);
    removeShot(TWO, "a");
    expect(TWO).toEqual(original);
  });
});
