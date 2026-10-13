import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Rows, type RowItem } from "@/components/ui/rows";
import { Segmented, Tabs } from "@/components/ui/segmented";

import {
  audienceText,
  editHref,
  formatDate,
  KNOWLEDGE_PATH,
  MANAGE_PATH,
  type ManageTab,
} from "../helpers";
import {
  ASSISTANT_LIMITS_NOTE,
  EMPTY_KNOWLEDGE_TITLE,
  KIND_LABEL,
  STATUS_LABEL,
  TEXT_STATUS_LABEL,
} from "../labels";
import type { ItemStatus, ManageItemRow, ManageList } from "../view-schema";
import { NewItemForm } from "./new-item-form";
import { SectionsTab } from "./sections-tab";

// L1 Διαχείριση Γνώσης: καρτέλες «Στοιχεία» και «Ενότητες», φίλτρα κατάστασης στη διεύθυνση, νέο στοιχείο.

const hrefOf = (params: Record<string, string | null>): string => {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== null,
    ),
  ).toString();
  return query ? `${MANAGE_PATH}?${query}` : MANAGE_PATH;
};

function ManageTabs({ tab }: { tab: ManageTab }) {
  return (
    <Tabs
      label="Καρτέλες Διαχείρισης Γνώσης"
      options={[
        { label: "Στοιχεία", href: MANAGE_PATH, isCurrent: tab === "items" },
        {
          label: "Ενότητες",
          href: hrefOf({ tab: "sections" }),
          isCurrent: tab === "sections",
        },
      ]}
    />
  );
}

const rowOf = (item: ManageItemRow): RowItem => ({
  id: item.id,
  title: item.title,
  href: editHref(item.id),
  meta: (
    <>
      <span className="block">
        {KIND_LABEL[item.kind]} · {item.sectionName} · Κοινό:{" "}
        {audienceText(item.audience)}
      </span>
      <span className="block text-xs">
        Ενημερώθηκε {formatDate(item.updatedAt)}
        {item.updatedByName ? ` από ${item.updatedByName}` : ""}
      </span>
      {item.textStatus === "image_only" && (
        <span className="block text-xs">{TEXT_STATUS_LABEL.image_only}</span>
      )}
    </>
  ),
  aside: (
    <Badge tone={item.status === "draft" ? "attention" : "ok"}>
      {STATUS_LABEL[item.status]}
    </Badge>
  ),
});

function SectionFilter({ list, status, sectionId }: ItemsTabProps) {
  return (
    <form method="get" action={MANAGE_PATH} className="mb-3 flex flex-wrap items-end gap-2">
      {status && <input type="hidden" name="status" value={status} />}
      <Field label="Ενότητα">
        <Select name="section" defaultValue={sectionId ?? ""}>
          <option value="">Όλες</option>
          {list.sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit">Φίλτρο</Button>
    </form>
  );
}

interface ItemsTabProps {
  list: ManageList;
  status: ItemStatus | null;
  sectionId: string | null;
}

function ItemsTab({ list, status, sectionId }: ItemsTabProps) {
  const filters = [
    {
      label: "όλα",
      href: hrefOf({ section: sectionId }),
      isCurrent: status === null,
      count: list.counts.all,
    },
    {
      label: "πρόχειρα",
      href: hrefOf({ status: "draft", section: sectionId }),
      isCurrent: status === "draft",
      count: list.counts.draft,
    },
    {
      label: "δημοσιευμένα",
      href: hrefOf({ status: "published", section: sectionId }),
      isCurrent: status === "published",
      count: list.counts.published,
    },
  ];
  return (
    <div className="grid gap-6">
      <Panel label="Νέο στοιχείο">
        <NewItemForm sections={list.sections} />
      </Panel>
      <Panel
        label="Στοιχεία"
        aside={<Segmented label="Φίλτρο κατάστασης" options={filters} />}
      >
        <SectionFilter list={list} status={status} sectionId={sectionId} />
        {list.items.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">
            Κανένα στοιχείο σε αυτό το φίλτρο.
          </p>
        ) : (
          <Rows isNumbered={false} items={list.items.map(rowOf)} />
        )}
      </Panel>
    </div>
  );
}

interface ManageScreenProps {
  list: ManageList;
  tab: ManageTab;
  status: ItemStatus | null;
  sectionId: string | null;
}

export function ManageScreen({ list, tab, status, sectionId }: ManageScreenProps) {
  const isEmpty = list.counts.all === 0;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={KNOWLEDGE_PATH}>Η Γνώση όπως τη βλέπω (A8)</Link>
        <span className="text-muted-foreground">{ASSISTANT_LIMITS_NOTE}</span>
      </div>
      <ManageTabs tab={tab} />
      {isEmpty && tab === "items" && <Notice kind="empty" title={EMPTY_KNOWLEDGE_TITLE} />}
      {tab === "sections" || list.sections.length === 0 ? (
        <SectionsTab sections={list.sections} />
      ) : (
        <ItemsTab list={list} status={status} sectionId={sectionId} />
      )}
    </div>
  );
}
