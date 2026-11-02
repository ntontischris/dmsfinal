import { Manrope } from "next/font/google";

// Η Manrope της ταυτότητας με ελληνικά, όπως στο root layout του prototype (η Satoshi έρχεται από το brand.css).
// Μία δήλωση για το κέλυφος και τις δημόσιες σελίδες (Είσοδος, Σύνδεσμος πρότασης).
export const spacesSans = Manrope({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-kit-sans",
});
