"use client";

import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Entity } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { filterItems } from "../helpers";
import { STATUS_LABELS } from "../labels";
import {
  EQUIPMENT_STATUSES,
  type EquipmentCategory,
  type EquipmentItemRow,
  type EquipmentStatus,
} from "../types";
import { F1Categories } from "./f1-categories";
import { F1NewItem } from "./f1-new-item";
import { statusTone } from "./f-model";

interface F1RegistryProps {
  canManage: boolean;
  items: readonly EquipmentItemRow[];
  categories: readonly EquipmentCategory[];
}

const ALL = "all";

const isStatus = (value: string): value is EquipmentStatus =>
  EQUIPMENT_STATUSES.some((status) => status === value);

// Το μητρώο (prototype `f1-registry.tsx`) με τα πραγματικά αντικείμενα. Χωρίς φίλτρο Κατάστασης κρύβονται τα αποσυρμένα.
export function F1Registry({ canManage, items, categories }: F1RegistryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [status, setStatus] = useState<EquipmentStatus | typeof ALL>(ALL);
  const [isAdding, setIsAdding] = useState(false);

  const visible = filterItems(items, { query, categoryId: category, status });

  return (
    <>
      <div className="toolbar">
        <span className="muted grow">
          {canManage
            ? "Η Δέσμευση γίνεται στη σελίδα του Γυρίσματος ή στη σελίδα του αντικειμένου. Εδώ κρατάς το μητρώο."
            : "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου, δεν αλλάζεις το μητρώο."}
        </span>
        {canManage && (
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
          onDone={() => setIsAdding(false)}
        />
      )}
      {items.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Το μητρώο είναι άδειο</h2>
          <p className="muted">
            {canManage
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
              onChange={(event) => {
                const next = event.target.value;
                setStatus(isStatus(next) ? next : ALL);
              }}
            >
              <option value={ALL}>Σε χρήση (χωρίς αποσυρμένα)</option>
              {EQUIPMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
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
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Αντικείμενο">
                        <Entity
                          name={item.name}
                          href={hrefOf("F2", { id: item.id })}
                          sub={item.code ?? undefined}
                        />
                      </td>
                      <td data-label="Κατηγορία">{item.categoryName}</td>
                      <td data-label="Κατάσταση">
                        <Badge tone={statusTone(item.status)}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {canManage && <F1Categories categories={categories} />}
    </>
  );
}
