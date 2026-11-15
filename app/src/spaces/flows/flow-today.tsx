import { renderTime } from "./athens-time";
import { loadJobDigests } from "./flow-digests";
import { FlowHome } from "./flow-home";
import { loadTodayRows } from "./today-load";

// Η ουρά με τα πραγματικά δεδομένα: διαβάζεται στον server, μέσα σε δικό της Suspense (η Σήμερα δεν περιμένει).
// Οδηγοί και κάρτες μαζί: μία λίστα.
export async function FlowToday() {
  const [digests, today] = await Promise.all([
    loadJobDigests(),
    loadTodayRows(renderTime()),
  ]);
  return <FlowHome digests={digests} today={today} />;
}
