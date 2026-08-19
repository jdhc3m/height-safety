const futureAssets = [
  {
    name: 'Static lines',
    description: 'A possible future asset family for industry conversations.',
  },
  {
    name: 'Guardrails',
    description: 'A possible future asset family for industry conversations.',
  },
  {
    name: 'Walkways',
    description: 'A possible future asset family for industry conversations.',
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Height Safety / Office workspace</p>
          <h1 id="page-title">Inspection evidence, ready for review.</h1>
          <p className="hero-copy">
            Foundation ready for recorded inspection evidence, review and draft
            reports.
          </p>
        </div>
        <p className="notice" role="note">
          No customer data, compliance decision or production workflow is
          implemented here.
        </p>
      </section>

      <section className="preview" aria-labelledby="preview-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Future direction</p>
            <h2 id="preview-title">Future-asset previews</h2>
          </div>
          <p className="section-copy">
            Read-only conversation starters. Installed single-point roof anchors
            remain the current MVP focus.
          </p>
        </div>

        <div className="card-grid">
          {futureAssets.map((asset) => (
            <article className="asset-card" key={asset.name}>
              <div className="card-mark" aria-hidden="true">
                {asset.name.slice(0, 1)}
              </div>
              <div className="card-content">
                <p className="card-status">Preview only</p>
                <h3>{asset.name}</h3>
                <p>{asset.description}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="disclaimer">
          These previews do not create register records, field forms, evidence,
          reports or compliance claims.
        </p>
      </section>
    </main>
  );
}
