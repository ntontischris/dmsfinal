"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { newActionHref, type NewAction } from "@/spaces/data/new-actions";
import { Icon } from "@/spaces/shell/icons";
import { ToolMenu } from "@/spaces/shell/tool-menu";

interface NewMenuProps {
  actions: readonly NewAction[];
}

// Το «+ Νέο»: κάθε επιλογή πάει πάντα στη φόρμα της, και όταν είσαι ήδη στην ίδια οθόνη.
export function NewMenu({ actions }: NewMenuProps) {
  const router = useRouter();
  const handlePick = (event: MouseEvent, action: NewAction) => {
    if (!action.query) return;
    event.preventDefault();
    router.push(newActionHref(action, String(Date.now())));
  };

  return (
    <ToolMenu
      summary={
        <>
          <Icon name="plus" size={18} />
          <span>Νέο</span>
        </>
      }
      summaryClassName="tool-button tool-new"
      label="Νέο"
    >
      <ul className="tool-menu-list">
        {actions.map((action) => (
          <li key={action.label}>
            <Link
              href={newActionHref(action, "1")}
              onClick={(event) => handlePick(event, action)}
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </ToolMenu>
  );
}
