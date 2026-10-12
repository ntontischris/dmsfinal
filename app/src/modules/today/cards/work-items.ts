import type { CardItem } from "../view-schema";

// Οι κάρτες «Η δουλειά μου» με ημερομηνία (προθεσμία, λήξη): η βάση στέλνει τη μέρα ως μεσάνυχτα Αθήνας στο at.
// Δείχνεται ως μέρα με το πρόθεμα της κάρτας, όχι ως ώρα.

const DAY_FORMAT = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "numeric",
  month: "short",
});

export const formatDay = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DAY_FORMAT.format(date);
};

export const withDayLabel = (
  items: readonly CardItem[],
  prefix: string,
): CardItem[] =>
  items.map((item) =>
    item.at === null
      ? item
      : {
          ...item,
          subtitle: [item.subtitle, `${prefix} ${formatDay(item.at)}`]
            .filter(Boolean)
            .join(" · "),
          at: null,
        },
  );
