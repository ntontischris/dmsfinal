import Link from "next/link";

import { Icon, type IconName } from "@/components/shell/icons";

// Εργαλείο πάνω δεξιά (Γνώση, Ειδοποιήσεις): εικονίδιο, και η λέξη στο μεγάλο desktop.
export function ToolLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold text-muted-foreground no-underline hover:bg-foreground/8 hover:text-foreground"
    >
      <Icon name={icon} size={18} />
      <span className="max-2xl:sr-only">{label}</span>
    </Link>
  );
}
