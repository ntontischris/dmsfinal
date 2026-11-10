import { SpacesApprovals } from "@/modules/agreements";

export const metadata = { title: "Προτάσεις προς έγκριση" };

// D4: η ουρά Εγκρίσεων. «Εγκρίνω» στέλνει την πρόταση αμέσως σε όλους τους παραλήπτες· «Απόρριψη» θέλει σχόλιο.
export default function ApprovalsPage() {
  return <SpacesApprovals />;
}
