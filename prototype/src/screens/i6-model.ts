import type { ExpenseCategory } from "@/data/finance";

export interface LineDraft {
  id: string;
  label: string;
  amount: number;
}
export interface ItemDraft {
  id: string;
  name: string;
  lines: readonly LineDraft[];
}
export interface CategoryDraft {
  id: string;
  name: string;
  items: readonly ItemDraft[];
}

export const toDrafts = (
  categories: readonly ExpenseCategory[],
): readonly CategoryDraft[] =>
  categories.map((c, ci) => ({
    id: `c${ci}`,
    name: c.name,
    items: c.items.map((item, ii) => ({
      id: `c${ci}i${ii}`,
      name: item.name,
      lines: item.lines.map((l, li) => ({ id: `c${ci}i${ii}l${li}`, ...l })),
    })),
  }));

const sum = (values: readonly number[]): number =>
  values.reduce((s, v) => s + v, 0);

export const itemTotal = (item: ItemDraft): number =>
  sum(item.lines.map((l) => l.amount));
export const categoryTotal = (cat: CategoryDraft): number =>
  sum(cat.items.map(itemTotal));
export const draftsTotal = (cats: readonly CategoryDraft[]): number =>
  sum(cats.map(categoryTotal));

export const rateOf = (total: number, hours: number): number =>
  hours > 0 ? Math.round((total / hours) * 100) / 100 : 0;

export const fmtRate = (value: number): string =>
  `${value.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const fmtMonth = (month: string): string => {
  const [year, m] = month.split("-").map(Number);
  const name = new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("el-GR", {
    month: "long",
    timeZone: "UTC",
  });
  return `${name} ${year}`;
};

const replaceAt = <T>(
  list: readonly T[],
  index: number,
  fn: (item: T) => T,
): readonly T[] => list.map((x, i) => (i === index ? fn(x) : x));
const removeAt = <T>(list: readonly T[], index: number): readonly T[] =>
  list.filter((_, i) => i !== index);

export type Edit = (cats: readonly CategoryDraft[]) => readonly CategoryDraft[];

export const editCategory =
  (ci: number, fn: (c: CategoryDraft) => CategoryDraft): Edit =>
  (cats) =>
    replaceAt(cats, ci, fn);

export const editItem = (
  ci: number,
  ii: number,
  fn: (i: ItemDraft) => ItemDraft,
): Edit =>
  editCategory(ci, (c) => ({ ...c, items: replaceAt(c.items, ii, fn) }));

export const editLine = (
  ci: number,
  ii: number,
  li: number,
  patch: Partial<Omit<LineDraft, "id">>,
): Edit =>
  editItem(ci, ii, (item) => ({
    ...item,
    lines: replaceAt(item.lines, li, (l) => ({ ...l, ...patch })),
  }));

export const removeLine = (ci: number, ii: number, li: number): Edit =>
  editItem(ci, ii, (item) => ({ ...item, lines: removeAt(item.lines, li) }));

export const addLine = (ci: number, ii: number, id: string): Edit =>
  editItem(ci, ii, (item) => ({
    ...item,
    lines: [...item.lines, { id, label: "Νέα γραμμή", amount: 0 }],
  }));

export const removeItem = (ci: number, ii: number): Edit =>
  editCategory(ci, (c) => ({ ...c, items: removeAt(c.items, ii) }));

export const addItem = (ci: number, id: string): Edit =>
  editCategory(ci, (c) => ({
    ...c,
    items: [
      ...c.items,
      {
        id,
        name: "Νέο έξοδο",
        lines: [{ id: `${id}l0`, label: "Νέα γραμμή", amount: 0 }],
      },
    ],
  }));

export const removeCategory =
  (ci: number): Edit =>
  (cats) =>
    removeAt(cats, ci);

export const addCategory =
  (id: string): Edit =>
  (cats) => [...cats, { id, name: "Νέα κατηγορία", items: [] }];
