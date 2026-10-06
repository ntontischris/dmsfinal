"use client";

import Link from "next/link";
import { useState } from "react";

import {
  EQUIPMENT_STATUSES,
  type EquipmentCategory,
  type EquipmentItem,
} from "@/data/equipment";
import {
  conflictsOf,
  unavailableHoldsOf,
  upcomingReservationsOf,
  type EquipmentCaps,
} from "@/data/equipment-access";
import { FILMING_RULES } from "@/data/filming";
import type { RoleId } from "@/data/roles";
import { F1Categories } from "@/screens/f1-categories";
import { F1NewItem } from "@/screens/f1-new-item";
import { conflictText, filmingLabel, statusTone } from "@/screens/f-model";
import { Badge, screenHref } from "@/screens/shared";

interface F1RegistryProps {
  role: RoleId;
  caps: EquipmentCaps;
  initialItems: readonly EquipmentItem[];
  initialCategories: readonly EquipmentCategory[];
}

const ALL = "όλα";

function Signals({ item }: { item: EquipmentItem }) {
  const conflicts = conflictsOf(item.id).length;
  const holds = unavailableHoldsOf(item.id).length;
  if (conflicts === 0 && holds === 0) return <>—</>;
  return (
    <span className="f-signals">
      {conflicts > 0 && <Badge tone="attention">σύγκρουση</Badge>}
      {holds > 0 && (
        <Badge tone="attention">δεσμευμένο ενώ {item.status}</Badge>
      )}
    </span>
  );
}

export function F1Registry({
  role,
  caps,
  initialItems,
  initialCategories,
}: F1RegistryProps) {
  const [items, setItems] = useState(initialItems);
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [isAdding, setIsAdding] = useState(false);

  const categoryName = (id: string) =>
    categories.find((item) => item.id === id)?.name ?? "—";
  const visible = items.filter(
    (item) =>
      (category === ALL || item.categoryId === category) &&
      (status === ALL
        ? item.status !== "αποσυρμένο"
        : item.status === status) &&
      `${item.name} ${item.code ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const attention = items.filter(
    (item) =>
      conflictsOf(item.id).length > 0 || unavailableHoldsOf(item.id).length > 0,
  ).length;
  const blocks = FILMING_RULES.equipmentConflict === "μπλοκάρει";

  const handleAdd = (item: EquipmentItem) => {
    setItems((current) => [...current, item]);
    setIsAdding(false);
  };

  return (
    <>
      <div className="toolbar">
        <span className="muted grow">
          {caps.canManageStock
            ? "Η Δέσμευση γίνεται στο Γύρισμα (E3) ή στη σελίδα του αντικειμένου. Εδώ κρατάς το μητρώο."
            : "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου, δεν αλλάζεις το μητρώο."}
        </span>
        {caps.canManageStock && (
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setIsAdding(true)}
          >
            Νέο αντικείμενο
          </button>
        )}
      </div>
      {isAdding && (
        <F1NewItem
          items={items}
          categories={categories}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      )}
      {attention > 0 && (
        <p className="e-warn" role="status">
          {attention === 1
            ? "Ένα αντικείμενο θέλει"
            : `${attention} αντικείμενα θέλουν`}{" "}
          προσοχή: σύγκρουση σε Γυρίσματα που επικαλύπτονται, ή Δέσμευση σε
          αντικείμενο που δεν είναι διαθέσιμο. {conflictText(blocks)}
        </p>
      )}
      {items.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Το μητρώο είναι άδειο</h2>
          <p className="muted">
            {caps.canManageStock
              ? "Πρόσθεσε το πρώτο αντικείμενο με «Νέο αντικείμενο». Μέχρι τότε τα Γυρίσματα γίνονται κανονικά, απλώς χωρίς Δέσμευση εξοπλισμού."
              : "Δεν έχει καταχωρηθεί ακόμα Εξοπλισμός. Τον προσθέτει η Διαχείριση."}
          </p>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <input
              className="input grow"
              type="search"
              placeholder="Αναζήτηση με όνομα ή κωδικό…"
              aria-label="Αναζήτηση στον Εξοπλισμό"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="select"
              aria-label="Κατηγορία"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value={ALL}>Όλες οι Κατηγορίες</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="select"
              aria-label="Κατάσταση"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value={ALL}>Σε χρήση (χωρίς αποσυρμένα)</option>
              {EQUIPMENT_STATUSES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          {visible.length === 0 ? (
            <p className="muted">Τίποτα δεν ταιριάζει με τα φίλτρα.</p>
          ) : (
            <div className="scroll">
              <table className="rtable">
                <thead>
                  <tr>
                    <th>Αντικείμενο</th>
                    <th>Κατηγορία</th>
                    <th>Κατάσταση</th>
                    <th>Επόμενη Δέσμευση</th>
                    <th>Σήματα</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => {
                    const next = upcomingReservationsOf(item.id)[0];
                    return (
                      <tr key={item.id}>
                        <td data-label="Αντικείμενο">
                          <Link href={screenHref(role, "F2", { id: item.id })}>
                            {item.name}
                          </Link>{" "}
                          {item.code && (
                            <span className="muted">{item.code}</span>
                          )}
                        </td>
                        <td data-label="Κατηγορία">
                          {categoryName(item.categoryId)}
                        </td>
                        <td data-label="Κατάσταση">
                          <Badge tone={statusTone(item.status)}>
                            {item.status}
                          </Badge>
                        </td>
                        <td data-label="Επόμενη Δέσμευση">
                          {next ? filmingLabel(next) : "—"}
                        </td>
                        <td data-label="Σήματα">
                          <Signals item={item} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {caps.canManageStock && (
        <F1Categories
          categories={categories}
          items={items}
          onChange={setCategories}
        />
      )}
    </>
  );
}
