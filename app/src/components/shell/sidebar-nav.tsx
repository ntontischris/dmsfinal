"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV } from "@/components/shell/nav";
import { cn } from "@/lib/cn";

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Οθόνες" className="grid gap-4">
      {NAV.map((section) => (
        <div key={section.title}>
          <p className="kit-label mb-1 px-2">{section.title}</p>
          <ul className="m-0 list-none p-0">
            {section.items.map((item) => {
              const isCurrent = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "flex gap-2 rounded-sm border-l-2 px-2 py-1 text-sm no-underline",
                      isCurrent
                        ? "border-primary bg-muted font-semibold text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="min-w-9 font-mono text-xs leading-[1.9] text-muted-foreground">
                      {item.code}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
