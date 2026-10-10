import type { CalendarDay } from "../calendar-days";
import { calendarHref, type CalendarParams } from "../url-state";

import { CalendarList, CalendarWeek } from "./calendar-views";
import { CalendarMonth } from "./calendar-month";
import type { DayViewProps } from "./calendar-parts";

// Η προβολή που ζητήθηκε από το URL· κενή περίοδος δείχνει μία φορά το μήνυμα.

interface CalendarBodyProps extends Omit<DayViewProps, "days"> {
  params: CalendarParams;
  days: readonly CalendarDay[];
  isEmpty: boolean;
}

export function CalendarBody({ params, days, isEmpty, ...props }: CalendarBodyProps) {
  if (isEmpty) {
    return <p className="m-0 rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">Τίποτα αυτή την περίοδο.</p>;
  }
  if (params.view === "month") {
    const dayHref = (date: string) => calendarHref(params, { view: "week", date });
    return <CalendarMonth days={days} anchor={params.date} dayHref={dayHref} {...props} />;
  }
  if (params.view === "list") return <CalendarList days={days} {...props} />;
  return <CalendarWeek days={days} {...props} />;
}
