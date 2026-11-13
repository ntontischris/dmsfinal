import { SpacesMyTasks } from "@/modules/productions";

export const metadata = { title: "Οι εργασίες μου" };

// G4: οι Εργασίες που σου έχουν ανατεθεί, με «Ξεκίνησα» / «Έγινε».
export default function MyTasksPage() {
  return <SpacesMyTasks />;
}
