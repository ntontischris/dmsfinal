import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, ClientUsersSection, can, getViewer, listMemberships } from "@/modules/access";

export const metadata = { title: "Συνάδελφοι" };

// N3 Συνάδελφοι: ο Χρήστης πελάτη βλέπει και προσκαλεί συναδέλφους στον Πελάτη του (c.colleagues).
export default async function ColleaguesPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="N3 · Ο Πελάτης μου" title="Συνάδελφοι" />;
  if (!can(viewer, "c.colleagues"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τους συναδέλφους τους βλέπει όποιος έχει το Δικαίωμα «Βλέπει και προσκαλεί συναδέλφους».</p>
        </AccessNotice>
      </>
    );

  const memberships = await listMemberships();
  const current = memberships.ok
    ? (memberships.data.find((row) => row.isCurrent) ?? memberships.data[0])
    : undefined;
  if (!current)
    return (
      <>
        {header}
        <Notice kind="empty" title="Δεν έχεις Πελάτη ακόμα">
          <p className="m-0">Ζήτησε από την ομάδα να σε προσθέσει σε Πελάτη.</p>
        </Notice>
      </>
    );

  return (
    <>
      {header}
      <ClientUsersSection clientId={current.clientId} viewer={viewer} />
    </>
  );
}
