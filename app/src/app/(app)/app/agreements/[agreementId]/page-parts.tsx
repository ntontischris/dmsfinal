import Link from "next/link";
import { headers } from "next/headers";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, type Viewer } from "@/modules/access";
import {
  AgreementActions,
  AgreementHeader,
  CostSection,
  DeviationsSection,
  HistorySections,
  LinesSection,
  OutboxSection,
  PeopleSection,
  ProposalPreview,
  ScheduleSection,
  TermsSection,
  athensToday,
  getProposalPreview,
  listCatalogueOptions,
  listOutbox,
  type AgreementCaps,
  type AgreementDetail,
  type CatalogueOption,
  type KindInfo,
  type OutboxItem,
  type ProposalDocumentData,
} from "@/modules/agreements";
import { listSalesLists } from "@/modules/sales";

export const EYEBROW = "D2 · Συμφωνίες";

const BackLink = () => (
  <Link href="/app/agreements" className={buttonVariants({ variant: "ghost" })}>
    ← Συμφωνίες
  </Link>
);

export function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Συμφωνία" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">
          Τις Συμφωνίες τις βλέπει όποιος «Βλέπει Συμφωνίες».
        </p>
      </AccessNotice>
    </>
  );
}

export function LoadError() {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Συμφωνία">
        <BackLink />
      </ScreenHeader>
      <Notice kind="error" title="Δεν φόρτωσε η Συμφωνία">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    </>
  );
}

// Άγνωστο id, ή Συμφωνία που η βάση δεν δείχνει σε αυτόν τον θεατή: τα δύο δεν ξεχωρίζουν.
export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Συμφωνία">
        <BackLink />
      </ScreenHeader>
      <Notice kind="empty" title="Αυτή η Συμφωνία δεν υπάρχει ή δεν σε αφορά">
        <p className="m-0">
          Μια Συμφωνία φαίνεται στον Υπεύθυνο της Ευκαιρίας ή του Πελάτη και σε
          όσους βλέπουν όλες τις Συμφωνίες.
        </p>
      </Notice>
    </>
  );
}

// Η διεύθυνση από την οποία ζητήθηκε η σελίδα: με αυτήν γράφεται ο πλήρης Σύνδεσμος της πρότασης στα εξερχόμενα.
export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host =
    list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto =
    list.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ───────────── Ό,τι δεν έρχεται με τη Συμφωνία ─────────────

export interface Extras {
  options: CatalogueOption[];
  lossReasons: { id: string; label: string }[];
  preview: ProposalDocumentData | null;
  outbox: OutboxItem[];
  isOptionsFailed: boolean;
  isLossReasonsFailed: boolean;
}

const isInternal = (caps: AgreementCaps): boolean =>
  caps.canDraft || caps.canDeviate;

// Σύνδεσμος και κωδικός φτάνουν στον browser μόνο όταν η ομάδα τα παραδίδει με το χέρι· με συνδεδεμένο πάροχο δεν φεύγουν από τον server.
const withoutSecrets = (items: readonly OutboxItem[]): OutboxItem[] =>
  items.map((item) => ({ ...item, linkPath: null, code: null }));

// Κάθε ανάγνωση γίνεται μόνο αν ο θεατής θα χρησιμοποιήσει το αποτέλεσμα. Αν αποτύχει μία από αυτές, η Συμφωνία φαίνεται
// χωρίς το κομμάτι της (το σφάλμα γράφεται στο log από την ανάγνωση) και η φόρμα που το χρειάζεται δείχνει σφάλμα· δεν ρίχνει όλη τη σελίδα.
export async function loadExtras(
  agreement: AgreementDetail,
  caps: AgreementCaps,
): Promise<Extras> {
  const { can } = agreement;
  const [options, lists, preview, outbox] = await Promise.all([
    can.edit ? listCatalogueOptions(agreement.id) : null,
    can.closeLost ? listSalesLists() : null,
    can.seeAmounts ? getProposalPreview(agreement.id) : null,
    isInternal(caps) ? listOutbox(agreement.id) : null,
  ]);
  return {
    options: options?.ok ? options.data : [],
    lossReasons: lists?.ok
      ? lists.data.lossReasons
          .filter((reason) => !reason.isRetired)
          .map((reason) => ({ id: reason.id, label: reason.label }))
      : [],
    preview: preview?.ok ? preview.data : null,
    outbox: outbox?.ok
      ? agreement.emailSenderConnected
        ? withoutSecrets(outbox.data)
        : outbox.data
      : [],
    isOptionsFailed: options !== null && !options.ok,
    isLossReasonsFailed: lists !== null && !lists.ok,
  };
}

// ───────────── Χρόνος ─────────────

const DAY_MS = 86_400_000;

// Πόσες μέρες μένουν ως τη Λήξη μιας υπογεγραμμένης ή ενεργής Συμφωνίας (μόνο τον τελευταίο μήνα).
export function daysToExpiry(agreement: AgreementDetail): number | null {
  if (agreement.state !== "signed" && agreement.state !== "active") return null;
  if (agreement.endOn === null) return null;
  const left = Math.round(
    (Date.parse(`${agreement.endOn}T00:00:00Z`) -
      Date.parse(`${athensToday()}T00:00:00Z`)) /
      DAY_MS,
  );
  return left >= 0 && left <= 30 ? left : null;
}

// Πόσες ημερολογιακές μέρες (Europe/Athens) περιμένει Έγκριση η τρέχουσα αναθεώρηση· ίδιος κανόνας με τη βάση.
export function pendingApprovalDays(agreement: AgreementDetail): number | null {
  if (agreement.path !== "awaiting_approval") return null;
  const asked = agreement.revisions.find(
    (revision) => revision.number === agreement.revision,
  )?.approval?.requestedAt;
  if (!asked) return null;
  const days = Math.round(
    (Date.parse(`${athensToday()}T00:00:00Z`) -
      Date.parse(`${athensToday(new Date(asked))}T00:00:00Z`)) /
      DAY_MS,
  );
  return Math.max(0, days);
}

// ───────────── Σύνθεση ─────────────

interface BodyProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  caps: AgreementCaps;
  extras: Extras;
  origin: string;
}

const PAIR =
  "grid items-start gap-4 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2";

// Οι ενότητες κάτω από τις ενέργειες, με τη σειρά τους: γραμμές, κόστος και Παρεκκλίσεις, Όροι, χρονοδιάγραμμα και παραλήπτες,
// εξερχόμενα, ιστορικό. Οι εσωτερικές (παραλήπτες, εξερχόμενα) μόνο σε όποιον δουλεύει την πρόταση.
function Sections({ agreement, kinds, caps, extras, origin }: BodyProps) {
  const internal = isInternal(caps);
  return (
    <div className="grid gap-4 print:hidden">
      <LinesSection
        agreement={agreement}
        kinds={kinds}
        options={extras.options}
        isOptionsFailed={extras.isOptionsFailed}
      />
      <div className={PAIR}>
        <CostSection agreement={agreement} />
        <DeviationsSection agreement={agreement} />
      </div>
      <TermsSection agreement={agreement} />
      <div className={PAIR}>
        <ScheduleSection agreement={agreement} canSeeProductions={caps.canSeeProductions} />
        {internal && <PeopleSection agreement={agreement} />}
      </div>
      {internal && (
        <OutboxSection
          items={extras.outbox}
          origin={origin}
          emailSenderConnected={agreement.emailSenderConnected}
        />
      )}
      <HistorySections agreement={agreement} kinds={kinds} isInternal={internal} />
    </div>
  );
}

// Η σελίδα της Συμφωνίας. Ό,τι δεν εκτυπώνεται (όλα εκτός από την προεπισκόπηση) κρύβεται στην Εκτύπωση.
export function AgreementBody(props: BodyProps) {
  const { agreement, kinds, caps, extras } = props;
  return (
    <>
      <div className="print:hidden">
        <AgreementHeader
          agreement={agreement}
          caps={caps}
          expiresInDays={daysToExpiry(agreement)}
        />
      </div>
      <div className="grid gap-4">
        {agreement.can.closeLost && extras.isLossReasonsFailed && (
          <div className="print:hidden">
            <Notice kind="error" title="Δεν φόρτωσαν οι λόγοι απώλειας">
              <p className="m-0">
                Το «Κλείσιμο ως χαμένη» δεν μπορεί να γίνει τώρα. Τίποτα δεν
                χάθηκε· δοκίμασε ξανά σε λίγο.
              </p>
            </Notice>
          </div>
        )}
        <div className="print:hidden empty:hidden">
          <AgreementActions
            agreement={agreement}
            lossReasons={extras.lossReasons}
            kinds={kinds}
            today={athensToday()}
            pendingDays={pendingApprovalDays(agreement)}
          />
        </div>
        <ProposalPreview document={extras.preview} />
        <Sections {...props} />
      </div>
    </>
  );
}
