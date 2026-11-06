import { StatusPill } from '../../../../components/StatusPill';
import { STATUS_PILL_REFERENCE } from '../../../../lib/status-pill';

export const dynamic = 'force-dynamic';

const KIND_HEADINGS: Record<
  (typeof STATUS_PILL_REFERENCE)[number]['kind'],
  string
> = {
  outcome: 'Recorded outcome',
  sync: 'Sync',
  workflow: 'Workflow',
};

export default function StatusPillReferencePage() {
  return (
    <div className="page-stack">
      <section className="hero" aria-labelledby="status-pill-title">
        <div>
          <p className="eyebrow">Height Safety / Design system</p>
          <h1 id="status-pill-title">Status pill reference.</h1>
          <p className="hero-copy">
            One component renders every recorded outcome, sync and workflow
            status. Colour reinforces the label; the label always carries the
            meaning.
          </p>
        </div>
        <p className="notice" role="note">
          This is a design-system reference. It records nothing, drives no
          workflow and shows no live data.
        </p>
      </section>

      {STATUS_PILL_REFERENCE.map((group) => (
        <section className="preview" key={group.kind}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{group.kind}</p>
              <h2 id={`status-pill-${group.kind}`}>
                {KIND_HEADINGS[group.kind]}
              </h2>
            </div>
          </div>
          <div className="chip-row">
            {group.values.map((value) => (
              <StatusPill
                key={`${group.kind}-${value}`}
                kind={group.kind}
                value={value}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fallback</p>
            <h2>Unknown values stay visible</h2>
          </div>
          <p className="section-copy">
            A value this page does not map still renders as a neutral pill
            rather than disappearing or showing a raw internal name.
          </p>
        </div>
        <div className="chip-row">
          <StatusPill kind="workflow" value="example_unknown_state" />
        </div>
      </section>
    </div>
  );
}
