import type { Metadata } from "next";
import { Suspense } from "react";

import { HomePreview } from "@/directions/direction-preview";

export const metadata: Metadata = {
  title: "Devre Media · 10 προτάσεις για την Αρχική",
  description: "Πρόχειρες οπτικές κατευθύνσεις. Μόνο φανταστικά δεδομένα.",
  robots: { index: false, follow: false },
};

// Η δημόσια βιτρίνα των 10 προτάσεων για την Αρχική (R1), για να σταλεί σε τρίτους.
export default function DirectionsPage() {
  return (
    <Suspense>
      <HomePreview isShowcase />
    </Suspense>
  );
}
