import { spacesSans } from "@/spaces/shell/font";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import type { SpacesModel } from "@/spaces/data/spaces";
import { Monogram } from "@/spaces/shell/icons";
import { PageHead } from "@/spaces/shell/page-head";
import { SectionCards } from "@/spaces/shell/section-cards";
import { SideMenu } from "@/spaces/shell/side-menu";
import { BottomBar } from "@/spaces/shell/space-nav";
import { TopTools } from "@/spaces/shell/top-tools";

// Η σειρά του prototype: globals → kit → brand (root layout), shell, parts, screens. Όλα μόνο κάτω από [data-look='spaces'].
import "@/spaces/styles/globals.css";
import "@/spaces/styles/kit.css";
import "@/spaces/styles/brand.css";
import "@/spaces/styles/shell.css";
import "@/spaces/styles/parts.css";
import "@/spaces/styles/screens.css";
import "@/spaces/styles/page.css";
import "@/spaces/styles/app.css";
import "@/spaces/styles/deck.css";

interface SpacesShellProps {
  model: SpacesModel;
  tools: ComponentProps<typeof TopTools>;
  notice: string | null;
  assistant: ReactNode;
  // e1: πότε άλλαξε το λογότυπο της εταιρείας· null → το μονόγραμμα.
  logoVersion: string | null;
  children: ReactNode;
}

const LOGO_STYLE = {
  height: "1.5rem",
  width: "auto",
  maxWidth: "2.75rem",
  objectFit: "contain",
} as const;

// Το λογότυπο της εταιρείας (από τις Ρυθμίσεις) αν υπάρχει, αλλιώς το μονόγραμμα.
function HomeMark({ version }: { version: string | null }) {
  if (!version) return <Monogram />;
  return (
    // Το route σερβίρει το αρχείο από ιδιωτικό bucket· το next/image δεν προσθέτει κάτι εδώ.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/company-logo?v=${encodeURIComponent(version)}`}
      alt=""
      style={LOGO_STYLE}
    />
  );
}

// Το κέλυφος: αριστερό μενού με ένα θέμα ανά οντότητα (όπως το παλιό DMS), εργαλεία πάνω δεξιά, οι κάρτες
// του θέματος, η κεφαλίδα της σελίδας, και στο κινητό μπάρα κάτω. Τα θέματα βγαίνουν από τα Δικαιώματα (spacesModel).
export function SpacesShell({
  model,
  tools,
  notice,
  assistant,
  logoVersion,
  children,
}: SpacesShellProps) {
  return (
    <div data-look="spaces" className={spacesSans.variable}>
      <a className="skip-link" href="#main" data-spaces>
        Μετάβαση στο περιεχόμενο
      </a>
      <div className="shell-frame">
        <aside className="shell-side" data-spaces>
          <Link className="shell-home" href="/app" aria-label="Αρχική">
            <HomeMark version={logoVersion} />
          </Link>
          <SideMenu model={model} />
        </aside>
        <div className="shell-column">
          <header className="shell-bar" data-spaces>
            <Link
              className="shell-home shell-home-mobile"
              href="/app"
              aria-label="Αρχική"
            >
              <HomeMark version={logoVersion} />
            </Link>
            <TopTools {...tools} />
          </header>
          {notice && (
            <p className="shell-notice" role="status" data-spaces>
              {notice}
            </p>
          )}
          <main id="main" className="app-main" tabIndex={-1}>
            <div data-spaces>
              <SectionCards model={model} />
              <PageHead model={model} />
            </div>
            {children}
          </main>
        </div>
      </div>
      <BottomBar model={model} />
      {assistant}
    </div>
  );
}
