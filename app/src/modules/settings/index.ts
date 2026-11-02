// Module «Ρυθμίσεις» (κεφ. 5, ADR 0015): Εταιρεία (O1) και Έλεγχος ετοιμότητας (O7).
// Οι υπόλοιπες ενότητες έρχονται με τα modules τους. Έξω φαίνεται μόνο ό,τι εξάγεται εδώ.
export {
  getAiSpend,
  getCompany,
  getOpenedAt,
  getReadiness,
  listBankAccounts,
  recentChanges,
  type AiSpend,
  type CompanySettings,
} from "./queries";
export { READINESS, type ReadinessInfo } from "./readiness";
export { isValidAfm, isValidIban, formatIban } from "./validation";
export {
  AssistantCard,
  DetailsCard,
  TaxCard,
} from "./components/company-cards";
export { BankAccountsCard } from "./components/bank-accounts-card";
export { ReadinessList } from "./components/readiness-list";
export { RecentChanges } from "./components/recent-changes";
export { SettingsTabs } from "./components/settings-tabs";
// Νέα εμφάνιση (Χώροι): O1, O7 και τα κοινά των καρτελών Ρυθμίσεων (prototype `screens/o-shared.tsx`), για τις O2–O6 των άλλων modules.
export { SpacesCompanySettings } from "./spaces/o1-screen";
export { SpacesReadiness } from "./spaces/o7-screen";
export {
  ListEditor,
  LockedField,
  Pending,
  SettingsCard,
  SettingsTabs as SpacesSettingsTabs,
  TextField,
  type ListItemStatus,
  type SettingsListItem,
} from "./spaces/o-shared";
export { ActionButton, SaveRow, SettingsForm } from "./spaces/o-form";
