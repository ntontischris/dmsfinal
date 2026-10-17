import type { ReactNode } from "react";

import { Segmented } from "@/components/ui/segmented";

import { ReportFrame, ReportNote } from "../components/report-parts";
import type { SellerRef } from "../sales-schema";
import { reportHref, type PeriodCode } from "../url";

// Κοινά κομμάτια των Αναφορών πωλήσεων (Ρβ): φίλτρο «Πωλητής» (Ρ4) και σημείωση Εύρους Α.
// Το φίλτρο φαίνεται μόνο όταν η βάση το λέει (showSeller: Εύρος «όλα» και πάνω από ένας πιθανός Υπεύθυνος).

export const SELLER_LABEL = "Πωλητής";
export const SELLER_ALL = "Όλοι";
export const MANAGER_COLUMN = "Υπεύθυνος";
export const SCOPED_NOTE = "Βλέπεις μόνο τις Ευκαιρίες όπου είσαι Υπεύθυνος.";

export interface SellerHeader {
  isScoped: boolean;
  showSeller: boolean;
  seller: SellerRef | null;
  sellers: readonly SellerRef[];
}

interface SellerFilterProps {
  reportId: string;
  period?: PeriodCode;
  sellerId?: string;
  header: SellerHeader;
}

export function SellerFilter({
  reportId,
  period,
  sellerId,
  header,
}: SellerFilterProps) {
  if (!header.showSeller) return null;
  const href = (seller?: string) =>
    reportHref({ report: reportId, period, seller });
  return (
    <Segmented
      label={SELLER_LABEL}
      options={[
        { label: SELLER_ALL, href: href(), isCurrent: !sellerId },
        ...header.sellers.map((seller) => ({
          label: seller.name,
          href: href(seller.id),
          isCurrent: seller.id === sellerId,
        })),
      ]}
    />
  );
}

// Γύρω από κάθε σώμα πωλήσεων: φίλτρο Πωλητή, σημείωση Εύρους, και ό,τι κάνει το ReportFrame (ποσά, ενέργειες).
export function SalesFrame(
  props: SellerFilterProps & {
    amounts: boolean;
    actions: ReactNode;
    children: ReactNode;
  },
) {
  const { amounts, actions, children, ...filter } = props;
  return (
    <div className="grid min-w-0 gap-4">
      <SellerFilter {...filter} />
      {filter.header.isScoped && <ReportNote>{SCOPED_NOTE}</ReportNote>}
      <ReportFrame amounts={amounts} actions={actions}>
        {children}
      </ReportFrame>
    </div>
  );
}
