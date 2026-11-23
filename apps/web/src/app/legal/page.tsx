import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Scope and legal',
  description:
    'The single home of scope and legal wording for the Height Safety workspace.',
};

export default function LegalPage() {
  return (
    <main className="legal">
      <section className="hero" aria-labelledby="legal-title">
        <div>
          <p className="eyebrow">Height Safety</p>
          <h1 id="legal-title">Scope and legal.</h1>
          <p className="hero-copy">
            This page is the one home for the product&apos;s standing scope and
            legal wording. Individual screens link here instead of repeating it.
          </p>
        </div>
      </section>

      <section className="preview" aria-labelledby="legal-record-title">
        <h2 id="legal-record-title">Recorded evidence</h2>
        <p className="section-copy">
          The product records inspection outcomes and evidence as submitted by
          the inspector and reviewed by the office. It does not certify an
          anchor, approve engineering work or determine compliance. Approval in
          this product means approve for report generation only.
        </p>
      </section>

      <section className="preview" aria-labelledby="legal-jurisdiction-title">
        <h2 id="legal-jurisdiction-title">Jurisdiction</h2>
        <p className="section-copy">
          The supported site jurisdiction is recorded explicitly as NSW or
          Queensland. It is context only: it does not select required fields,
          intervals, authority or a compliance result, and no legal rule is
          inferred from it.
        </p>
      </section>

      <section className="preview" aria-labelledby="legal-review-title">
        <h2 id="legal-review-title">Review and reports</h2>
        <p className="section-copy">
          Review actions are append-only and audited. Resolving an issue or
          requesting changes never rewrites the inspector&apos;s submitted
          evidence. Reports are draft inspection records generated from the
          approved snapshot; a correction creates a new revision and earlier
          revisions remain available. A draft report does not issue a
          certificate or determine compliance.
        </p>
      </section>

      <section className="preview" aria-labelledby="legal-judgement-title">
        <h2 id="legal-judgement-title">Professional judgement</h2>
        <p className="section-copy">
          Recorded outcomes, technical decisions and report approval remain the
          responsibility of the inspecting organisation and its authorised
          personnel. This product does not replace professional judgement.
        </p>
      </section>

      <p>
        <Link className="quiet-link" href="/office">
          Back to the office workspace
        </Link>
      </p>
    </main>
  );
}
