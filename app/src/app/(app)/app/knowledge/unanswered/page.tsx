import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  LOAD_ERROR_TEXT,
  NO_UNANSWERED_ACCESS_TEXT,
  UNANSWERED_EYEBROW,
  UNANSWERED_LOAD_ERROR,
  UNANSWERED_TITLE,
  UnansweredScreen,
  getCoverOptions,
  getUnanswered,
  parseDone,
  parseUnansweredTab,
} from "@/modules/knowledge";

export const metadata = { title: UNANSWERED_TITLE };

interface UnansweredPageProps {
  searchParams: Promise<{ tab?: string; done?: string }>;
}

// L3 Αναπάντητες ερωτήσεις: μόνο με «Διαχειρίζεται Γνώση». Η καρτέλα στη διεύθυνση.
export default async function UnansweredPage({
  searchParams,
}: UnansweredPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const tab = parseUnansweredTab(params.tab);
  const result =
    viewer.status === "signed-in" ? await getUnanswered(tab) : null;
  // Οι επιλογές του «Καλύφθηκε από…» μόνο όταν η λίστα φόρτωσε (χωρίς Δικαίωμα γυρίζει null) και μόνο στις ανοιχτές.
  const options =
    result?.ok && result.data && tab === "open"
      ? await getCoverOptions()
      : null;
  const isFailed = result?.ok === false || options?.ok === false;
  return (
    <>
      <ScreenHeader eyebrow={UNANSWERED_EYEBROW} title={UNANSWERED_TITLE} />
      {isFailed ? (
        <Notice kind="error" title={UNANSWERED_LOAD_ERROR}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : result?.ok && result.data ? (
        <UnansweredScreen
          list={result.data}
          tab={tab}
          options={options?.ok ? options.data : []}
          done={parseDone(params.done)}
        />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_UNANSWERED_ACCESS_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
