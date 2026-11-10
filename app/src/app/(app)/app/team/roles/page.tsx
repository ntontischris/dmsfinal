import { SpacesRoles } from "@/modules/access";

export const metadata = { title: "Ρόλοι και Δικαιώματα" };

// N4 Ρόλοι και Δικαιώματα: μόνο ο Ιδιοκτήτης φτιάχνει, αλλάζει και διαγράφει Ρόλους.
export default function RolesPage() {
  return <SpacesRoles />;
}
