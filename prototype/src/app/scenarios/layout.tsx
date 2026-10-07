import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

export default function ScenariosLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Link className="topbar-brand" href="/owner">
          DMS · prototype
        </Link>
        <div className="topbar-controls">
          <Link className="button" href="/scenarios">
            Σενάρια
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="main scenarios-main">{children}</main>
    </>
  );
}
