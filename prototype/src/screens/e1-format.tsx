import { NOW, type Filming } from "@/data/filming";
import { endTime } from "@/data/filming-access";

const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "short" });

export const whenLabel = (filming: Filming): string => {
  const [, month, day] = filming.date.split("-");
  const weekday = WEEKDAY.format(new Date(`${filming.date}T12:00:00`));
  return `${day}/${month} ${weekday} ${filming.start}–${endTime(filming)}`;
};

export const hoursSince = (iso: string): number =>
  Math.round((Date.parse(NOW) - Date.parse(iso)) / 3_600_000);

export const waitingLabel = (hours: number): string =>
  hours >= 48 ? `${Math.round(hours / 24)} ημέρες` : `${hours} ώρες`;
