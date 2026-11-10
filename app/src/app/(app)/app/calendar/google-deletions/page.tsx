import { SpacesGoogleDeletions } from "@/modules/google";

export const metadata = { title: "Διαγραφές από το Google" };

// A7: Γυρίσματα που διαγράφηκαν στο Google. Η απόφαση είναι του Χρήστη, πριν λήξει η προθεσμία.
export default function GoogleDeletionsPage() {
  return <SpacesGoogleDeletions />;
}
