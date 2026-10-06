"use client";

import {
  addItem,
  addLine,
  categoryTotal,
  editCategory,
  editItem,
  editLine,
  itemTotal,
  removeCategory,
  removeItem,
  removeLine,
  type CategoryDraft,
  type Edit,
  type ItemDraft,
} from "@/screens/i6-model";
import { fmtMoney } from "@/screens/shared";

export interface CategoryProps {
  cat: CategoryDraft;
  ci: number;
  editable: boolean;
  update: (edit: Edit) => void;
}

const newId = (): string => crypto.randomUUID();

interface TextProps {
  value: string;
  editable: boolean;
  label: string;
  onChange: (value: string) => void;
}

function TextCell({ value, editable, label, onChange }: TextProps) {
  return editable ? (
    <input
      className="input i67-label"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <span className="i67-label">{value}</span>
  );
}

interface ItemProps extends Omit<CategoryProps, "cat"> {
  item: ItemDraft;
  ii: number;
}

function LineRows({ item, ci, ii, editable, update }: ItemProps) {
  return (
    <>
      {item.lines.map((line, li) => (
        <div className="i67-line" key={line.id}>
          <TextCell
            value={line.label}
            editable={editable}
            label="Περιγραφή γραμμής"
            onChange={(label) => update(editLine(ci, ii, li, { label }))}
          />
          {editable ? (
            <>
              <input
                className="input i67-amount"
                type="number"
                min={0}
                aria-label="Ποσό γραμμής"
                value={line.amount}
                onChange={(e) =>
                  update(
                    editLine(ci, ii, li, {
                      amount: Number(e.target.value) || 0,
                    }),
                  )
                }
              />
              <button
                type="button"
                className="button"
                data-danger
                onClick={() => update(removeLine(ci, ii, li))}
              >
                Αφαίρεση γραμμής
              </button>
            </>
          ) : (
            <span>{fmtMoney(line.amount)}</span>
          )}
        </div>
      ))}
    </>
  );
}

function ItemActions({ ci, ii, update }: Omit<ItemProps, "item" | "editable">) {
  return (
    <div className="i67-actions">
      <button
        type="button"
        className="button"
        onClick={() => update(addLine(ci, ii, newId()))}
      >
        Προσθήκη γραμμής
      </button>
      <button
        type="button"
        className="button"
        data-danger
        onClick={() => update(removeItem(ci, ii))}
      >
        Αφαίρεση εξόδου
      </button>
    </div>
  );
}

function ItemBlock(props: ItemProps) {
  const { item, ci, ii, editable, update } = props;
  return (
    <div className="i67-item">
      <div className="i67-line">
        <TextCell
          value={item.name}
          editable={editable}
          label="Όνομα εξόδου"
          onChange={(name) => update(editItem(ci, ii, (i) => ({ ...i, name })))}
        />
        <strong>{fmtMoney(itemTotal(item))}</strong>
      </div>
      <LineRows {...props} />
      {editable && <ItemActions ci={ci} ii={ii} update={update} />}
    </div>
  );
}

function CategoryActions({ ci, update }: Pick<CategoryProps, "ci" | "update">) {
  return (
    <div className="i67-actions">
      <button
        type="button"
        className="button"
        onClick={() => update(addItem(ci, newId()))}
      >
        Προσθήκη εξόδου
      </button>
      <button
        type="button"
        className="button"
        data-danger
        onClick={() => update(removeCategory(ci))}
      >
        Αφαίρεση κατηγορίας
      </button>
    </div>
  );
}

export function CategoryCard({ cat, ci, editable, update }: CategoryProps) {
  return (
    <section className="card i67-cat">
      <div className="i67-total">
        <TextCell
          value={cat.name}
          editable={editable}
          label="Όνομα κατηγορίας"
          onChange={(name) => update(editCategory(ci, (c) => ({ ...c, name })))}
        />
        <span>{fmtMoney(categoryTotal(cat))}</span>
      </div>
      {cat.items.map((item, ii) => (
        <ItemBlock
          key={item.id}
          item={item}
          ci={ci}
          ii={ii}
          editable={editable}
          update={update}
        />
      ))}
      {editable && <CategoryActions ci={ci} update={update} />}
    </section>
  );
}
