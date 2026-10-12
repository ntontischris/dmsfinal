// Κανόνες Παραδοτέων (Ρυθμίσεις › Παραδοτέα): όπως τους δίνει η βάση (deliverable_settings_view).

export interface DeliverableRuleKind {
  id: string;
  label: string;
  deadlineDays: number;
  revisionLimit: number | null;
}

export interface DeliverableRules {
  internalReview: boolean;
  changesDays: number;
  kinds: DeliverableRuleKind[];
}
