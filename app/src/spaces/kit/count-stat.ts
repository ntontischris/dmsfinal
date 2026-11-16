import type { StatProps } from "./panel";

// Μία κάρτα-μέτρημα της λωρίδας: μένει πάντα στη θέση της και ζητά προσοχή μόνο όταν μετρά κάτι.
// isAlarm=false για ό,τι είναι δουλειά και όχι πρόβλημα (π.χ. «για μένα»): μένει ήσυχη ακόμα και πάνω από 0.
export const countStat = (
  stat: Omit<StatProps, "value" | "tone">,
  count: number,
  isAlarm = true,
): StatProps => ({
  ...stat,
  value: String(count),
  tone: isAlarm && count > 0 ? "attention" : undefined,
});
