export type StatusPillKind = 'outcome' | 'sync' | 'workflow';

export type StatusPillTone =
  | 'green'
  | 'red'
  | 'yellow'
  | 'slate'
  | 'purple'
  | 'blue'
  | 'orange'
  | 'neutral';

export interface StatusPillSpec {
  readonly label: string;
  readonly tone: StatusPillTone;
}

type StatusPillValueMap = Readonly<Record<string, StatusPillSpec>>;

const OUTCOME_VALUES: StatusPillValueMap = {
  serviceable: { label: 'Serviceable', tone: 'green' },
  defective: { label: 'Defective', tone: 'red' },
  not_inspected: { label: 'Not inspected', tone: 'slate' },
  further_assessment_required: { label: 'Further assessment', tone: 'yellow' },
};

const SYNC_VALUES: StatusPillValueMap = {
  synchronised: { label: 'Synchronised', tone: 'green' },
  conflict: { label: 'Conflict', tone: 'orange' },
  sending: { label: 'Sending', tone: 'blue' },
  not_synced: { label: 'Not synced', tone: 'slate' },
  offline: { label: 'Offline', tone: 'yellow' },
};

const WORKFLOW_VALUES: StatusPillValueMap = {
  draft: { label: 'Draft', tone: 'slate' },
  released: { label: 'Released', tone: 'slate' },
  assigned: { label: 'Assigned', tone: 'blue' },
  in_progress: { label: 'In progress', tone: 'blue' },
  submitted: { label: 'Submitted', tone: 'purple' },
  under_review: { label: 'Under review', tone: 'purple' },
  changes_requested: { label: 'Changes requested', tone: 'yellow' },
  approved_for_report_generation: {
    label: 'Approved for report',
    tone: 'green',
  },
  report_generated: { label: 'Report generated', tone: 'green' },
  queued: { label: 'Queued', tone: 'blue' },
  processing: { label: 'Processing', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
  superseded: { label: 'Superseded', tone: 'slate' },
  open: { label: 'Open', tone: 'blue' },
  resolved: { label: 'Resolved', tone: 'green' },
};

const VALUES_BY_KIND: Readonly<Record<StatusPillKind, StatusPillValueMap>> = {
  outcome: OUTCOME_VALUES,
  sync: SYNC_VALUES,
  workflow: WORKFLOW_VALUES,
};

export const STATUS_PILL_REFERENCE: ReadonlyArray<{
  kind: StatusPillKind;
  values: readonly string[];
}> = (
  [
    { kind: 'outcome', values: Object.keys(OUTCOME_VALUES) },
    { kind: 'sync', values: Object.keys(SYNC_VALUES) },
    { kind: 'workflow', values: Object.keys(WORKFLOW_VALUES) },
  ] as const
).map((entry) => ({ kind: entry.kind, values: [...entry.values] }));

function humaniseValue(value: string): string {
  const spaced = value.trim().replace(/_/g, ' ');
  if (!spaced) {
    return 'Unknown';
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function resolveStatusPill(
  kind: StatusPillKind,
  value: string,
): StatusPillSpec {
  const known = VALUES_BY_KIND[kind][value];
  if (known) {
    return known;
  }
  return { label: humaniseValue(value), tone: 'neutral' };
}
