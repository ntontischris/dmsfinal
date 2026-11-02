import { Manrope } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { BottomBar, SpaceNav } from "@/components/shell/space-nav";
import { SpaceTabs } from "@/components/shell/space-tabs";
import type { SpacesShell as Shell } from "@/components/shell/spaces";

// Manrope για τα ελληνικά της νέας εμφάνισης· η Satoshi (λατινικά) έρχεται από το globals.css.
const brandSans = Manrope({ subsets: ["latin", "greek"], variable: "--font-brand-sans" });

interface SpacesShellProps {
  shell: Shell;
  // Τα εργαλεία πάνω δεξιά (Πελάτης, καμπανάκι, Γνώση, θέμα, εμφάνιση, έξοδος)· τα συνθέτει το layout.
  tools: ReactNode;
  notice: ReactNode;
  assistant: ReactNode;
  children: ReactNode;
}

// Το κέλυφος των Χώρων (νέα εμφάνιση): χάπι πάνω με μονόγραμμα, Χώρους και εργαλεία, από κάτω οι καρτέλες
// του Χώρου· στο κινητό οι Χώροι πάνε σε μπάρα κάτω. Όλα τα νέα χρώματα ζουν κάτω από το data-look.
export function SpacesShell({ shell, tools, notice, assistant, children }: SpacesShellProps) {
  return (
    <div data-look="spaces" className={brandSans.variable}>
      <header className="z-40 flex justify-center px-2 pt-2 md:sticky md:top-4 md:px-4 md:pt-4">
        <div className="flex w-full max-w-full flex-wrap items-center justify-between gap-1 rounded-lg border border-primary/20 bg-background/72 p-1.5 shadow-(--shadow-pop) backdrop-blur-xl md:w-auto xl:flex-nowrap xl:rounded-full">
          <Link
            href="/app"
            aria-label="Αρχική"
            className="grid h-10 w-12 shrink-0 bg-(image:--monogram) bg-[length:auto_1.35rem] bg-center bg-no-repeat max-md:hidden"
          />
          <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border-strong max-md:hidden" />
          <SpaceNav shell={shell} />
          <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border-strong max-md:hidden" />
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">{tools}</div>
        </div>
      </header>
      {notice}
      <main className="mx-auto w-full max-w-[82rem] min-w-0 px-4 pt-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-24">
        <SpaceTabs shell={shell} />
        {children}
      </main>
      <BottomBar shell={shell} />
      <div className="max-md:[&>span.fixed]:bottom-24">{assistant}</div>
    </div>
  );
}
