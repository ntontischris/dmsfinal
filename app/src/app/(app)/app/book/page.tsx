import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  BookingPage,
  bookingSelectionSchema,
  getBookingOptions,
  SpacesBooking,
} from "@/modules/filming";

import { LoadError } from "../filming/filming-parts";

export const metadata = { title: "Κράτηση" };

const EYEBROW = "E5 · Κράτηση";

// E5: ο Πελάτης κλείνει Γύρισμα ή μετατίθεται. Η επιλογή είναι στο URL· η βάση ελέγχει κάθε βήμα.
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  // Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
  if ((await lookOf(viewer)) === "spaces")
    return <SpacesBooking selection={bookingSelectionSchema.parse(await searchParams)} />;
  const header = <ScreenHeader eyebrow={EYEBROW} title="Κράτηση" />;
  if (!can(viewer, "c.book"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τις κρατήσεις τις κάνει όποιος «Κλείνει Γύρισμα».</p>
        </AccessNotice>
      </>
    );

  const selection = bookingSelectionSchema.parse(await searchParams);
  const options = await getBookingOptions();
  return (
    <>
      {header}
      {options.ok ? <BookingPage options={options.data} selection={selection} /> : <LoadError />}
    </>
  );
}
