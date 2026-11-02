import type { ClientSend } from "../sends-schema";

// Η σύνοψη πάνω από τη λίστα (prototype `screens/b2-sections.tsx` DispatchList): πόσες αποστολές, πόσες απέτυχαν.
export const sendsSummary = (
  sends: readonly ClientSend[],
  hasMore: boolean,
): string => {
  const count = sends.length;
  const counted =
    count === 1 ? "1 αποστολή" : `${hasMore ? "Τελευταίες " : ""}${count} αποστολές`;
  const failed = sends.filter((send) => send.state === "failed").length;
  return `${counted} προς τον Πελάτη${failed > 0 ? `, ${failed} απέτυχαν` : ""}.`;
};
