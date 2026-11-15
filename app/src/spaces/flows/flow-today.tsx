import { loadJobDigests } from "./flow-digests";
import { FlowHome } from "./flow-home";

// Η ουρά με τα πραγματικά δεδομένα: διαβάζεται στον server, μέσα σε δικό της Suspense (η Σήμερα δεν περιμένει).
export async function FlowToday() {
  const digests = await loadJobDigests();
  return <FlowHome digests={digests} />;
}
