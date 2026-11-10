import {
  NOTIFICATIONS_TITLE,
  SpacesNotifications,
  parseCursor,
  parseFilter,
} from "@/modules/notifications";

export const metadata = { title: NOTIFICATIONS_TITLE };

interface NotificationsPageProps {
  searchParams: Promise<{
    show?: string;
    before?: string;
    beforeId?: string;
    tab?: string;
  }>;
}

// A2 για όλους (ομάδα και πελάτη): η βάση δείχνει μόνο τις δικές σου Ειδοποιήσεις.
// Καρτέλες «Εισερχόμενα» και «Προτιμήσεις» (#173)· στις Προτιμήσεις ο Χρήστης πελάτη διαλέγει και τη γλώσσα των email του.
export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const params = await searchParams;
  return (
    <SpacesNotifications
      tab={params.tab === "prefs" ? "prefs" : "inbox"}
      filter={parseFilter(params.show)}
      cursor={parseCursor(params.before, params.beforeId)}
    />
  );
}
