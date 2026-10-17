// Τα φίλτρα του Ίχνους (P1) ζουν στη διεύθυνση: ?who=&area=&entity=&id=&action=&period=&before=&beforeId=.
// Ό,τι δεν έχει σωστή μορφή αγνοείται (όπως ελέγχει και η βάση), ώστε ένας παλιός σελιδοδείκτης να ανοίγει πάντα κάτι.

export const AUDIT_PATH = "/app/audit";

export const AUDIT_PERIODS = ["7d", "30d", "all"] as const;
export type AuditPeriod = (typeof AUDIT_PERIODS)[number];

export const AUDIT_ACTIONS = ["insert", "update", "delete", "event"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditFilters {
  // Ο δράστης: id Χρήστη ή «system» (ό,τι έγινε χωρίς Χρήστη).
  who?: string;
  area?: string;
  entity?: string;
  id?: string;
  action?: AuditAction;
  period: AuditPeriod;
}

export interface AuditCursor {
  at: string;
  id: string;
}

export interface AuditQuery {
  filters: AuditFilters;
  cursor: AuditCursor | null;
}

// Τα φίλτρα με chip (το id πάει μαζί με το στοιχείο).
export const FILTER_KEYS = [
  "who",
  "area",
  "entity",
  "action",
  "period",
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

type Param = string | string[] | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[a-z_]{1,60}$/;

const single = (value: Param): string | undefined => {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text : undefined;
};

const isOneOf = <T extends string>(
  list: readonly T[],
  value: string | undefined,
): value is T => value !== undefined && list.some((item) => item === value);

const readWho = (value: string | undefined): string | undefined => {
  const who = value?.toLowerCase();
  return who === "system" || (who && UUID.test(who)) ? who : undefined;
};

export const readAuditFilters = (
  params: Readonly<Record<string, Param>>,
): AuditFilters => {
  const entity = single(params.entity);
  const id = single(params.id);
  const area = single(params.area);
  const action = single(params.action);
  const period = single(params.period);
  const hasEntity = entity !== undefined && CODE.test(entity);
  return {
    who: readWho(single(params.who)),
    area: area && CODE.test(area) ? area : undefined,
    entity: hasEntity ? entity : undefined,
    id: hasEntity && id && id.length <= 200 ? id : undefined,
    action: isOneOf(AUDIT_ACTIONS, action) ? action : undefined,
    period: isOneOf(AUDIT_PERIODS, period) ? period : "all",
  };
};

// Μόνο έγκυρη στιγμή μαζί με έγκυρο id, αλλιώς πρώτη σελίδα.
export const readAuditCursor = (at: Param, id: Param): AuditCursor | null => {
  const when = single(at);
  const key = single(id);
  return when &&
    key &&
    /^\d{4}-\d{2}-\d{2}T/.test(when) &&
    !Number.isNaN(Date.parse(when)) &&
    /^\d{1,18}$/.test(key)
    ? { at: when, id: key }
    : null;
};

export const readAuditQuery = (
  params: Readonly<Record<string, Param>>,
): AuditQuery => ({
  filters: readAuditFilters(params),
  cursor: readAuditCursor(params.before, params.beforeId),
});

// Τα φίλτρα όπως τα δέχεται η βάση (μόνο όσα έχουν τιμή).
export const rpcFilters = (filters: AuditFilters): Record<string, string> =>
  Object.fromEntries(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

export const auditHref = (
  filters: AuditFilters,
  cursor: AuditCursor | null = null,
): string => {
  const params = new URLSearchParams();
  if (filters.who) params.set("who", filters.who);
  if (filters.area) params.set("area", filters.area);
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.entity && filters.id) params.set("id", filters.id);
  if (filters.action) params.set("action", filters.action);
  if (filters.period !== "all") params.set("period", filters.period);
  if (cursor) {
    params.set("before", cursor.at);
    params.set("beforeId", cursor.id);
  }
  const search = params.toString();
  return search ? `${AUDIT_PATH}?${search}` : AUDIT_PATH;
};

export const isActive = (filters: AuditFilters, key: FilterKey): boolean =>
  key === "period" ? filters.period !== "all" : filters[key] !== undefined;

export const activeKeys = (filters: AuditFilters): FilterKey[] =>
  FILTER_KEYS.filter((key) => isActive(filters, key));

// Χωρίς ένα φίλτρο (το στοιχείο φεύγει μαζί με το id του· η περίοδος γυρίζει στο «Όλο»).
export const withoutFilter = (
  filters: AuditFilters,
  key: FilterKey,
): AuditFilters => {
  if (key === "period") return { ...filters, period: "all" };
  if (key === "entity") return { ...filters, entity: undefined, id: undefined };
  return { ...filters, [key]: undefined };
};

export const NO_FILTERS: AuditFilters = { period: "all" };

// «Ιστορικό αλλαγών» μιας σελίδας: το Ίχνος φιλτραρισμένο στο στοιχείο (μαζί με τα ποσά, το κόστος κ.λπ. του).
export const historyHref = (entity: string, id: string): string =>
  auditHref({ entity, id, period: "all" });
