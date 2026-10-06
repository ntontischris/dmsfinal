import { BILLABLE_REMINDER_DAYS, BILLABLES } from "@/data/finance";
import {
  ageInDays,
  invoicedBeyondOf,
  openBillables,
  toInvoiceOf,
  type BillableCoverage,
} from "@/data/finance-access";
import { findClient, type SalesClient } from "@/data/sales";

export interface BillingGroup {
  client: SalesClient;
  open: readonly BillableCoverage[];
  total: number;
  oldestAge: number;
  beyond: number;
}

const groupOf = (clientId: string): BillingGroup | null => {
  const client = findClient(clientId);
  if (!client) return null;
  const open = openBillables(clientId);
  const beyond = invoicedBeyondOf(clientId);
  if (open.length === 0 && beyond === 0) return null;
  return {
    client,
    open,
    total: toInvoiceOf(clientId),
    oldestAge: open.length ? ageInDays(open[0].billable.date) : 0,
    beyond,
  };
};

export const billingGroups = (): readonly BillingGroup[] =>
  [...new Set(BILLABLES.map((b) => b.clientId))]
    .map(groupOf)
    .filter((g): g is BillingGroup => g !== null)
    .sort((a, b) => b.oldestAge - a.oldestAge);

export const remindersSent = (age: number): readonly number[] =>
  BILLABLE_REMINDER_DAYS.filter((days) => age >= days);

export const groupsTotal = (groups: readonly BillingGroup[]): number =>
  Math.round(groups.reduce((sum, g) => sum + g.total, 0) * 100) / 100;

export const groupsCount = (groups: readonly BillingGroup[]): number =>
  groups.reduce((sum, g) => sum + g.open.length, 0);
