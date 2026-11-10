import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/modules/access";
import { newActionHref, type NewEntry } from "@/spaces/data/new-actions";
import type { SearchItem } from "@/spaces/data/search";
import type { ScreenLink } from "@/spaces/data/spaces";
import { initialsOf } from "@/spaces/shell/avatar";
import { Icon } from "@/spaces/shell/icons";
import { NewMenu } from "@/spaces/shell/new-menu";
import { ProfileActions } from "@/spaces/shell/profile-items";
import { SearchDialog } from "@/spaces/shell/search-dialog";
import { ToolMenu } from "@/spaces/shell/tool-menu";

interface TopToolsProps {
  search: readonly SearchItem[];
  entry: NewEntry | null;
  tools: readonly ScreenLink[];
  profile: readonly ScreenLink[];
  // Το πραγματικό καμπανάκι (ζωντανές Ειδοποιήσεις), όταν φορτώνει· αλλιώς σύνδεσμος, όπως στο prototype.
  bell: ReactNode;
  // Η εναλλαγή Πελάτη, για Χρήστη πελάτη με πολλούς Πελάτες.
  clientSwitcher: ReactNode;
  name: string;
  canSignOut: boolean;
}

const toolOf = (tools: readonly ScreenLink[], code: string) =>
  tools.find((tool) => tool.code === code);

// Πάντα πάνω δεξιά: αναζήτηση, + Νέο, καμπανάκι, Γνώση, προφίλ. Στο κινητό και στο μεγάλο desktop κάθε εικονίδιο
// έχει και λέξη· ενδιάμεσα η λέξη βγαίνει ως tooltip. Στο προφίλ: θέμα και Έξοδος.
export function TopTools(props: TopToolsProps) {
  const {
    search,
    entry,
    tools,
    profile,
    bell,
    clientSwitcher,
    name,
    canSignOut,
  } = props;
  const notifications = toolOf(tools, "A2");
  const knowledge = toolOf(tools, "A8");
  return (
    <div className="top-tools">
      <SearchDialog items={search} />
      {entry?.kind === "menu" && <NewMenu actions={entry.actions} />}
      {entry?.kind === "single" && (
        <Link
          className="tool-button tool-new"
          href={newActionHref(entry.action, "1")}
          title={entry.action.label}
        >
          <Icon name="plus" size={18} />
          <span>{entry.label}</span>
        </Link>
      )}
      {clientSwitcher && <span data-tw>{clientSwitcher}</span>}
      {bell ? (
        <span data-tw>{bell}</span>
      ) : (
        notifications && (
          <Link
            className="tool-button"
            href={notifications.href}
            aria-label="Ειδοποιήσεις"
            title="Ειδοποιήσεις"
          >
            <Icon name="bell" size={18} />
            <span className="tool-label">Ειδοποιήσεις</span>
          </Link>
        )
      )}
      {knowledge && (
        <Link
          className="tool-button"
          href={knowledge.href}
          aria-label="Γνώση και Βοηθός"
          title="Γνώση και Βοηθός"
        >
          <Icon name="book" size={18} />
          <span className="tool-label">Γνώση</span>
        </Link>
      )}
      <ToolMenu
        summary={initialsOf(name) || "?"}
        summaryClassName="tool-avatar"
        label={`Προφίλ: ${name}`}
      >
        <ul className="tool-menu-list" data-align="end">
          {profile.map((link) => (
            <li key={link.code}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <ProfileActions />
          {canSignOut && (
            <li>
              <form action={signOut}>
                <button type="submit">Έξοδος</button>
              </form>
            </li>
          )}
        </ul>
      </ToolMenu>
    </div>
  );
}
