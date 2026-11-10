import { SpacesColleagues, getViewer } from "@/modules/access";

export const metadata = { title: "Συνάδελφοι" };

// N3 Συνάδελφοι: ο Χρήστης πελάτη βλέπει και προσκαλεί συναδέλφους στον Πελάτη του (c.colleagues).
export default async function ColleaguesPage() {
  const viewer = await getViewer();
  return <SpacesColleagues viewer={viewer} />;
}
