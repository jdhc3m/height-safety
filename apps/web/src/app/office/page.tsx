import { redirect } from 'next/navigation';

import { auth0, isAuth0Configured } from '../../lib/auth0';

export default async function OfficePage() {
  if (!isAuth0Configured || !auth0) {
    return (
      <main className="shell">
        <section className="hero" aria-labelledby="office-title">
          <div>
            <p className="eyebrow">Height Safety / Office workspace</p>
            <h1 id="office-title">Office access is not configured.</h1>
            <p className="hero-copy">
              Configure the Auth0 AU office application before connecting an
              authenticated office session.
            </p>
          </div>
          <p className="notice" role="note">
            This boundary does not expose customer data or bypass API
            authorisation.
          </p>
        </section>
      </main>
    );
  }

  const session = await auth0.getSession();
  if (!session) {
    redirect('/auth/login?returnTo=/office');
  }

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="office-title">
        <div>
          <p className="eyebrow">Height Safety / Office workspace</p>
          <h1 id="office-title">Authenticated office boundary.</h1>
          <p className="hero-copy">
            Signed in as {session.user.email ?? 'the current Auth0 user'}.
            Company membership, product role and API session exchange remain
            authoritative at the NestJS API.
          </p>
        </div>
        <p className="notice" role="note">
          Job review data is not connected in this slice. No customer record or
          compliance conclusion is displayed here.
        </p>
      </section>

      <section className="preview" aria-labelledby="office-next-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Next office slice</p>
            <h2 id="office-next-title">Review workspace boundary</h2>
          </div>
          <p className="section-copy">
            The next implementation connects this protected boundary to
            company-scoped jobs and review states through the application
            session exchange.
          </p>
        </div>
        <p className="disclaimer">
          This page proves the browser authentication boundary only; it does not
          imply that office review or reporting is complete.
        </p>
      </section>
    </main>
  );
}
