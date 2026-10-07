import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

export default function KitLayout({ children }: { children: ReactNode }) {
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
          <Link className="button" href="/kit">
            Kit
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="main kit-main">{children}</main>
    </>
  );
}
