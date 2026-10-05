import {
  Commissioner,
  Geologica,
  Inter,
  JetBrains_Mono,
} from "next/font/google";

// Μία variable γραμματοσειρά με ελληνικά ανά κατεύθυνση, και μία mono για timecodes/κωδικούς.
const commissioner = Commissioner({
  subsets: ["latin", "greek"],
  variable: "--font-a",
});
const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-b" });
const geologica = Geologica({
  subsets: ["latin", "greek"],
  variable: "--font-c",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--font-d-mono",
});

export const DIRECTION_FONT_CLASSES = [
  commissioner.variable,
  inter.variable,
  geologica.variable,
  mono.variable,
].join(" ");
