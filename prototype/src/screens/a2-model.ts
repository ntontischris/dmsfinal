import type { InboxItem } from "@/data/notifications";

export type A2Tab = "inbox" | "prefs";
export type A2Show = "unread" | "all";

export const parseTab = (value: string | undefined): A2Tab =>
  value === "prefs" ? "prefs" : "inbox";

export const parseShow = (value: string | undefined): A2Show =>
  value === "all" ? "all" : "unread";

export const unreadCount = (items: readonly InboxItem[]): number =>
  items.filter((item) => !item.isRead).length;

export const visibleItems = (
  items: readonly InboxItem[],
  show: A2Show,
): readonly InboxItem[] =>
  show === "unread" ? items.filter((item) => !item.isRead) : items;

export const fmtWhen = (iso: string): string => {
  const [date, time] = iso.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} ${time}`;
};
