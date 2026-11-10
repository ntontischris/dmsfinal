import {
  SpacesUnanswered,
  UNANSWERED_TITLE,
  parseDone,
  parseSelection,
  parseUnansweredTab,
} from "@/modules/knowledge";

export const metadata = { title: UNANSWERED_TITLE };

interface UnansweredPageProps {
  searchParams: Promise<{
    tab?: string;
    done?: string;
    close?: string;
    by?: string;
    reason?: string;
  }>;
}

// L3 Αναπάντητες ερωτήσεις: μόνο με «Διαχειρίζεται Γνώση». Η καρτέλα και η επιλογή κλεισίματος στη διεύθυνση.
export default async function UnansweredPage({
  searchParams,
}: UnansweredPageProps) {
  const params = await searchParams;
  return (
    <SpacesUnanswered
      tab={parseUnansweredTab(params.tab)}
      selection={parseSelection(params)}
      done={parseDone(params.done)}
    />
  );
}
