import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import { athensDate, formatDateTime } from "@/modules/filming";
import {
  BlockedDeleteForm,
  BlockedTimeForm,
  LoadNotice,
  MissingNotice,
  blockedFormValues,
  calendarCaps,
  convertHref,
  getBlockedTime,
  type BlockedTime,
} from "@/modules/calendar";

export const metadata = { title: "Κλεισμένος χρόνος" };

const EYEBROW = "A6 · Κλεισμένος χρόνος";

// A6: επεξεργασία κλεισμένου χρόνου. Διαγραφή με επιβεβαίωση· μετατροπή σε Γύρισμα αν το επιτρέπει η βάση.
export default async function BlockedTimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!calendarCaps(viewer).isTeam)
    return (
      <>
        <ScreenHeader eyebrow={EYEBROW} title="Κλεισμένος χρόνος" />
        <AccessNotice viewer={viewer} />
      </>
    );

  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return <MissingNotice />;
  const time = await getBlockedTime(parsed.data);
  if (!time.ok) return <LoadNotice />;
  if (time.data === null) return <MissingNotice />;

  return <BlockedTimeDetails time={time.data} />;
}

function BlockedTimeDetails({ time }: { time: BlockedTime }) {
  const day = athensDate(time.startsAt);
  const values = {
    ...blockedFormValues(time),
    userId: time.userId,
    title: time.title ?? "",
  };
  return (
    <>
      <ScreenHeader
        eyebrow={EYEBROW}
        title={time.userName ?? "Κλεισμένος χρόνος"}
      >
        <Link
          className={buttonVariants({ variant: "ghost" })}
          href={`/app/calendar?view=week&date=${day}`}
        >
          ← Ημερολόγιο
        </Link>
      </ScreenHeader>
      {time.canEdit ? (
        <BlockedTimeForm
          id={time.id}
          values={values}
          people={[]}
          personName={time.userName}
        />
      ) : (
        <Notice kind="empty" title="Μόνο ανάγνωση">
          <p className="m-0">
            Δεν μπορείς να αλλάξεις αυτόν τον κλεισμένο χρόνο.
          </p>
        </Notice>
      )}
      <p className="m-0 mt-2 text-sm text-muted-foreground">
        Ώρα: {formatDateTime(time.startsAt)} – {formatDateTime(time.endsAt)}
      </p>
      {time.canEdit && (
        <div className="mt-6 grid max-w-xl gap-6">
          {time.canConvert && (
            <section className="grid gap-2 rounded-md border bg-card p-4">
              <h2 className="m-0 text-sm font-semibold">
                Μετατροπή σε Γύρισμα
              </h2>
              <p className="m-0 text-sm text-muted-foreground">
                Ο κλεισμένος χρόνος θα σβηστεί όταν αποθηκευτεί το Γύρισμα.
              </p>
              <Link
                className={buttonVariants({ variant: "default" })}
                href={convertHref(time)}
              >
                Μετατροπή σε Γύρισμα
              </Link>
            </section>
          )}
          <BlockedDeleteForm id={time.id} day={day} />
        </div>
      )}
    </>
  );
}
