import { findAgreement, type AgreementPeriod } from "@/data/agreements";
import {
  FILMINGS,
  NOW,
  OPEN_STATES,
  PRODUCTIONS,
  type ProductionStub,
} from "@/data/filming";

// Τοπικά helpers των E4/E5: Περίοδος της μέρας, Παραγωγή της Περιόδου και υπόλοιπο Παροχών «Γύρισμα».
export const TODAY_ISO = NOW.slice(0, 10);
const MS_PER_DAY = 86_400_000;

export const addDays = (iso: string, days: number): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);

export const weekdayOf = (iso: string): number =>
  new Date(`${iso}T00:00:00Z`).getUTCDay();

export const pad = (value: number): string => String(value).padStart(2, "0");

export const hhmm = (minutes: number): string =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const periodOf = (
  agreementId: string,
  date: string,
): AgreementPeriod | undefined =>
  findAgreement(agreementId)?.periods.find(
    (period) => period.starts <= date && date <= period.ends,
  );

export const productionOfPeriod = (
  agreementId: string,
  periodLabel: string,
): ProductionStub | undefined =>
  PRODUCTIONS.find(
    (production) =>
      production.agreementId === agreementId &&
      production.periodLabel === periodLabel,
  );

export interface PeriodBalance {
  period: AgreementPeriod;
  production: ProductionStub | undefined;
  total: number;
  used: number;
  reserved: number;
  left: number;
}

export const balanceOfPeriod = (
  agreementId: string,
  period: AgreementPeriod,
): PeriodBalance => {
  const production = productionOfPeriod(agreementId, period.label);
  const shoot = period.provisions.find((item) => item.kindId === "shoot");
  const total = (shoot?.given ?? 0) + (shoot?.carried ?? 0);
  const used = shoot?.used ?? 0;
  const reserved = FILMINGS.filter(
    (filming) =>
      filming.productionId === production?.id &&
      OPEN_STATES.includes(filming.state),
  ).length;
  return { period, production, total, used, reserved, left: total - used - reserved };
};

export const balanceOfDay = (
  agreementId: string,
  date: string,
): PeriodBalance | null => {
  const period = periodOf(agreementId, date);
  return period ? balanceOfPeriod(agreementId, period) : null;
};

export const lastLocationOf = (clientId: string): string => {
  const mine = FILMINGS.filter((filming) =>
    PRODUCTIONS.some(
      (production) =>
        production.id === filming.productionId &&
        production.clientId === clientId,
    ),
  ).sort((a, b) => b.date.localeCompare(a.date));
  return mine[0]?.location ?? "";
};

export function BalanceCard({ balance }: { balance: PeriodBalance }) {
  return (
    <dl className="dl">
      <dt>Περίοδος</dt>
      <dd>{balance.period.label}</dd>
      <dt>Παραγωγή</dt>
      <dd>{balance.production?.title ?? "—"}</dd>
      <dt>Παροχές «Γύρισμα»</dt>
      <dd>
        {balance.total} συνολικά · {balance.used} καταναλωμένες ·{" "}
        {balance.reserved} δεσμευμένες ·{" "}
        <strong>{balance.left} ελεύθερες</strong>
      </dd>
    </dl>
  );
}
