"use client";

import { fmtMoney } from "@/spaces/screens/shared";

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
  removedCategoryText,
  removedItemText,
  removedLineText,
  type CategoryDraft,
  type Edit,
  type ItemDraft,
} from "./i6-model";

// Μία κατηγορία Εξόδων με τα έξοδα και τις γραμμές της (prototype `screens/i6-category.tsx`, αυτούσιο).

export interface CategoryProps {
  cat: CategoryDraft;
  ci: number;
  editable: boolean;
  update: (edit: Edit) => void;
  // Αφαίρεση με «Αναίρεση»: το μήνυμα λέει τι έφυγε.
  remove: (edit: Edit, message: string) => void;
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

function LineRows({ item, ci, ii, editable, update, remove }: ItemProps) {
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
                onClick={() =>
                  remove(removeLine(ci, ii, li), removedLineText(line))
                }
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

function ItemActions({ item, ci, ii, update, remove }: Omit<ItemProps, "editable">) {
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
        onClick={() => remove(removeItem(ci, ii), removedItemText(item))}
      >
        Αφαίρεση εξόδου
      </button>
    </div>
  );
}

function ItemBlock(props: ItemProps) {
  const { item, ci, ii, editable, update, remove } = props;
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
      {editable && (
        <ItemActions item={item} ci={ci} ii={ii} update={update} remove={remove} />
      )}
    </div>
  );
}

function CategoryActions({
  cat,
  ci,
  update,
  remove,
}: Omit<CategoryProps, "editable">) {
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
        onClick={() => remove(removeCategory(ci), removedCategoryText(cat))}
      >
        Αφαίρεση κατηγορίας
      </button>
    </div>
  );
}

export function CategoryCard({
  cat,
  ci,
  editable,
  update,
  remove,
}: CategoryProps) {
  return (
    <section className="kit-panel i67-cat">
      <div className="kit-panel-body i67-cat-body">
      <div className="i67-total">
        <TextCell
          value={cat.name}
          editable={editable}
          label="Όνομα κατηγορίας"
          onChange={(name) => update(editCategory(ci, (c) => ({ ...c, name })))}
        />
        <span className="i67-cat-sum">{fmtMoney(categoryTotal(cat))}</span>
      </div>
      {cat.items.map((item, ii) => (
        <ItemBlock
          key={item.id}
          item={item}
          ci={ci}
          ii={ii}
          editable={editable}
          update={update}
          remove={remove}
        />
      ))}
      {editable && (
        <CategoryActions cat={cat} ci={ci} update={update} remove={remove} />
      )}
      </div>
    </section>
  );
}
