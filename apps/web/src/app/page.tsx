import { auth0, isAuth0Configured } from '../lib/auth0';

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

export default async function HomePage() {
  const session = auth0 ? await auth0.getSession() : null;

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

      <section className="auth-panel" aria-labelledby="auth-title">
        <div>
          <p className="eyebrow">Office access</p>
          <h2 id="auth-title">
            {session
              ? 'Auth0 session active.'
              : 'Sign in to the office boundary.'}
          </h2>
          <p className="section-copy">
            {session
              ? `Signed in as ${session.user.email ?? 'the current Auth0 user'}.`
              : isAuth0Configured
                ? 'Use the configured Auth0 AU application to enter the protected office boundary.'
                : 'Auth0 is not configured in this environment; the read-only foundation remains available.'}
          </p>
        </div>
        <div className="auth-actions">
          {session ? (
            <>
              <a className="action-link" href="/office">
                Open office boundary
              </a>
              <a className="quiet-link" href="/auth/logout">
                Sign out
              </a>
            </>
          ) : isAuth0Configured ? (
            <a className="action-link" href="/auth/login?returnTo=/office">
              Sign in with Auth0
            </a>
          ) : (
            <span className="quiet-link">Provider setup required</span>
          )}
        </div>
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
