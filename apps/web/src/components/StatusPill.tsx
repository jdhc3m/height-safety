import { resolveStatusPill, type StatusPillKind } from '../lib/status-pill';

export function StatusPill({
  kind,
  value,
}: {
  kind: StatusPillKind;
  value: string;
}) {
  const { label, tone } = resolveStatusPill(kind, value);
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <span aria-hidden="true" className="status-pill__tile" />
      {label}
    </span>
  );
}
