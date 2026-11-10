import { SENDS_TITLE, SpacesSends } from "@/modules/notifications";

export const metadata = { title: SENDS_TITLE };

interface SendsPageProps {
  searchParams: Promise<{
    tab?: string;
    channel?: string;
    client?: string;
    before?: string;
    beforeId?: string;
  }>;
}

// K3 Ιστορικό αποστολών (#174): για όποιον «Διαχειρίζεται Αυτοματισμούς» ή «Βλέπει Υγεία συστήματος». Η βάση το ξανακρίνει.
export default async function SendsPage({ searchParams }: SendsPageProps) {
  return <SpacesSends params={await searchParams} />;
}
