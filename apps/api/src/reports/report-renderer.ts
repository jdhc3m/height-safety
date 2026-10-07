import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium, type Browser, type Page } from 'playwright';

import type {
  ApprovedSnapshotDocument,
  ApprovedSnapshotExpectedAnchor,
  ApprovedSnapshotReviewIssue,
} from '../approved-snapshot/approved-snapshot.types';
import type {
  ReportPhoto,
  ReportRenderInput,
  ReportRenderer,
} from './report-generation.types';
import { ReportRenderFailure } from './report-generation.types';
import {
  assertReportRenderTimeRemaining,
  ReportRenderDeadlineExceededError,
  remainingReportRenderTimeMs,
  withReportRenderDeadline,
} from './report-render-deadline';

const BROWSER_TEARDOWN_TIMEOUT_MS = 1_000;
const MAX_REPORT_BYTES = 25 * 1024 * 1024;
const resolvePackage = createRequire(__filename);
const PROTOTYPE_DISCLAIMER =
  'This report was generated using an early-stage inspection workflow prototype. Inspection outcomes, technical decisions and report approval remain the responsibility of the inspecting organisation and its authorised personnel.';

export class ReportWorkerTerminationRequiredError extends Error {
  readonly workerTerminationRequired = true;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ReportWorkerTerminationRequiredError';
  }
}

export function buildReportHtml(
  input: ReportRenderInput,
  fontBase64 = '',
): string {
  const document = input.document;
  const context = document.reportContext;
  if (document.snapshotSchemaVersion !== 2 || !context) {
    throw new ReportRenderFailure(
      'APPROVED_SNAPSHOT_INVALID',
      'approved snapshot does not contain frozen report context',
      false,
    );
  }

  const inspectionsByAnchor = new Map<
    string,
    (typeof document.inspectionSubmission.anchorInspections)[number][]
  >();
  const provisionalInspections: (typeof document.inspectionSubmission.anchorInspections)[number][] =
    [];
  const registeredIds = new Set(
    context.expectedAnchors.map((anchor) => anchor.anchorId),
  );
  for (const inspection of document.inspectionSubmission.anchorInspections) {
    if (
      inspection.expectedAnchorId &&
      registeredIds.has(inspection.expectedAnchorId)
    ) {
      const matches =
        inspectionsByAnchor.get(inspection.expectedAnchorId) ?? [];
      matches.push(inspection);
      inspectionsByAnchor.set(inspection.expectedAnchorId, matches);
    } else {
      provisionalInspections.push(inspection);
    }
  }

  const anchorSections = context.expectedAnchors
    .map((anchor) => {
      const inspections = inspectionsByAnchor.get(anchor.anchorId) ?? [];
      return renderExpectedAnchor(anchor, inspections, input.photos);
    })
    .join('');
  const provisionalSections = provisionalInspections
    .map((inspection) => renderAnchorInspection(inspection, input.photos, true))
    .join('');
  const reviewIssues = context.reviewIssues.length
    ? `<section class="review" aria-labelledby="review-title">
        <h2 id="review-title">Recorded review notes</h2>
        ${context.reviewIssues.map(renderReviewIssue).join('')}
      </section>`
    : '<section class="review"><h2>Recorded review notes</h2><p>No separate review issue was recorded in this approved snapshot.</p></section>';

  // Older sync rows reused the server acknowledgement time for both fields;
  // equal values do not establish when field capture actually began.
  const inspectionStarted =
    context.inspectionStartedAt === context.inspectionSubmittedAt
      ? 'Not recorded'
      : (context.inspectionStartedAt ?? 'Not recorded');
  const siteAddress = context.site.address ?? 'Not recorded';
  const siteReference = context.site.siteReference ?? 'Not recorded';
  const generatedAt = input.generationAt;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Prototype Draft Inspection Report</title>
    <style>
      @font-face { font-family: 'Height Safety Noto'; src: url(data:font/woff2;base64,${fontBase64}) format('woff2'); font-weight: 400; }
      @page { size: A4; margin: 14mm 12mm 16mm; }
      * { box-sizing: border-box; }
      html, body { background: #fff; }
      body { margin: 0; color: #18252b; font: 9pt/1.4 'Height Safety Noto', sans-serif; -webkit-print-color-adjust: exact; }
      header { border-bottom: 2px solid #155e63; margin-bottom: 7mm; padding-bottom: 5mm; }
      h1 { color: #155e63; font-size: 21pt; margin: 2mm 0 3mm; }
      h2 { color: #155e63; font-size: 14pt; margin: 0 0 3mm; }
      h3 { color: #263c43; font-size: 11pt; margin: 0 0 2mm; }
      .draft { background: #a93728; color: #fff; display: inline-block; font-weight: 700; letter-spacing: .14em; padding: 2mm 4mm; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 8mm; margin: 4mm 0; }
      .meta div { border-bottom: 1px solid #d4dedf; padding: 1.5mm 0; overflow-wrap: anywhere; }
      .disclaimer { border: 1px solid #c65b4b; color: #78362f; margin: 5mm 0 0; padding: 3mm; }
      .section { margin: 6mm 0; }
      .anchor { break-before: page; border-top: 1px solid #d4dedf; padding-top: 4mm; }
      .anchor-meta { display: grid; grid-template-columns: 34mm 1fr; gap: 1mm 3mm; margin: 2mm 0; }
      .label { font-weight: 700; }
      .value { overflow-wrap: anywhere; white-space: pre-wrap; }
      .submitted-record { border-left: 3px solid #6a8f91; margin: 4mm 0; padding-left: 4mm; break-inside: avoid; }
      .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; margin-top: 3mm; }
      figure { margin: 0; break-inside: avoid; }
      figure img { background: #e6ecec; display: block; height: 68mm; object-fit: contain; width: 100%; }
      figcaption { color: #536469; font-size: 7.5pt; margin-top: 1mm; overflow-wrap: anywhere; }
      .review-item { border-bottom: 1px solid #d4dedf; margin: 3mm 0; padding: 2mm 0; break-inside: avoid; }
      .review-actions { margin: 2mm 0 0 5mm; padding: 0; }
      .muted { color: #586a70; }
      .page-note { color: #586a70; font-size: 7.5pt; margin-top: 5mm; }
    </style>
  </head>
  <body>
    <header>
      <span class="draft">DRAFT</span>
      <h1>Prototype Draft Inspection Report</h1>
      <div class="meta">
        ${metaField('Company ID', document.companyId)}
        ${metaField('Client ID', context.site.clientId)}
        ${metaField('Site', context.site.name)}
        ${metaField('Site address', siteAddress)}
        ${metaField('Site reference', siteReference)}
        ${metaField('Jurisdiction context', document.jurisdiction)}
        ${metaField('Job ID', document.jobId)}
        ${metaField('Inspection revision', `${document.sourceInspectionRevision}`)}
        ${metaField('Job-pack version', `${context.jobPackVersion}`)}
        ${metaField('Inspection started', inspectionStarted)}
        ${metaField('Inspection submitted', context.inspectionSubmittedAt)}
        ${metaField('Submitted by inspector', document.inspectorUserId)}
        ${metaField('Reviewed by', document.approvedByUserId)}
        ${metaField('Approved at', document.approvedAt)}
        ${metaField('Draft report revision', `${input.revisionNumber}`)}
        ${metaField('Template version', input.templateVersion)}
        ${metaField('Generation requested', generatedAt)}
      </div>
      <p class="disclaimer">${escapeHtml(PROTOTYPE_DISCLAIMER)}</p>
    </header>

    <section class="section" aria-labelledby="register-title">
      <h2 id="register-title">Expected anchor register</h2>
      ${
        context.expectedAnchors.length
          ? `<div>${context.expectedAnchors.map(renderRegisterAnchor).join('')}</div>`
          : '<p>No expected anchor record was present in the released job pack.</p>'
      }
    </section>

    <section aria-labelledby="inspection-title">
      <h2 id="inspection-title">Submitted anchor evidence</h2>
      ${anchorSections || '<p>No expected-anchor inspection record was included in this revision.</p>'}
      ${
        provisionalSections
          ? `<h2 class="anchor">Additional or provisional anchor records</h2>${provisionalSections}`
          : ''
      }
    </section>

    ${reviewIssues}
    <p class="page-note">Jurisdiction is shown as recorded site context only. This report does not derive jurisdiction-specific rules or conclusions.</p>
  </body>
</html>`;
}

export class PlaywrightReportRenderer implements ReportRenderer {
  async render(input: ReportRenderInput): Promise<Uint8Array> {
    let browser: Browser | undefined;
    let page: Page | undefined;
    let pageClosePromise: Promise<void> | undefined;
    let browserClosePromise: Promise<void> | undefined;
    let renderError: unknown;
    const closePage = (): Promise<void> => {
      pageClosePromise ??= page?.close() ?? Promise.resolve();
      return pageClosePromise;
    };
    const closeBrowser = (): Promise<void> => {
      browserClosePromise ??= browser?.close() ?? Promise.resolve();
      return browserClosePromise;
    };
    try {
      const launchTimeoutMs = remainingReportRenderTimeMs(
        input.renderDeadline,
        'Chromium launch',
      );
      const launchPromise = chromium.launch({
        headless: true,
        timeout: launchTimeoutMs,
      });
      try {
        browser = await withReportRenderDeadline(
          input.renderDeadline,
          'Chromium launch',
          () => launchPromise,
        );
      } catch (error) {
        if (error instanceof ReportRenderDeadlineExceededError) {
          try {
            await withTimeout(
              launchPromise.then(
                async (lateBrowser) => {
                  browser = lateBrowser;
                  await closeBrowser();
                },
                () => undefined,
              ),
              BROWSER_TEARDOWN_TIMEOUT_MS,
              'late Chromium launch cleanup',
            );
          } catch (cleanupError) {
            throw new ReportWorkerTerminationRequiredError(
              'Chromium launch did not stop within the bounded teardown time',
              { cause: cleanupError },
            );
          }
        }
        throw error;
      }
      const launchedBrowser = browser;
      page = await withReportRenderDeadline(
        input.renderDeadline,
        'Chromium page creation',
        () => launchedBrowser.newPage(),
        closeBrowser,
      );
      const renderPage = page;
      await withReportRenderDeadline(
        input.renderDeadline,
        'network route setup',
        () => renderPage.route(/^https?:\/\//, (route) => route.abort()),
        closePage,
      );
      const fontPath = resolvePackage.resolve(
        '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2',
      );
      const font = await withReportRenderDeadline(
        input.renderDeadline,
        'report font preparation',
        (signal) => readFile(fontPath, { signal }),
      );
      assertReportRenderTimeRemaining(
        input.renderDeadline,
        'report HTML preparation',
      );
      const html = buildReportHtml(input, font.toString('base64'));
      assertReportRenderTimeRemaining(
        input.renderDeadline,
        'report HTML preparation',
      );
      await withReportRenderDeadline(
        input.renderDeadline,
        'report HTML preparation',
        () =>
          renderPage.setContent(html, {
            waitUntil: 'load',
            timeout: remainingReportRenderTimeMs(
              input.renderDeadline,
              'report HTML preparation',
            ),
          }),
        closePage,
      );
      await withReportRenderDeadline(
        input.renderDeadline,
        'photo and font preparation',
        () =>
          renderPage.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(
              Array.from(document.images, async (image) => {
                if (!image.complete) {
                  await new Promise<void>((resolve, reject) => {
                    image.addEventListener('load', () => resolve(), {
                      once: true,
                    });
                    image.addEventListener(
                      'error',
                      () => reject(new Error('photo did not render')),
                      { once: true },
                    );
                  });
                }
                if (image.decode) await image.decode();
              }),
            );
          }),
        closePage,
      );
      const pdf = await withReportRenderDeadline(
        input.renderDeadline,
        'PDF rendering',
        () =>
          renderPage.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false,
          }),
        closePage,
      );
      assertReportRenderTimeRemaining(input.renderDeadline, 'PDF finalisation');
      const canonical = canonicalizePdfMetadata(
        Buffer.from(pdf),
        input.generationAt,
      );
      assertReportRenderTimeRemaining(input.renderDeadline, 'PDF finalisation');
      if (canonical.byteLength > MAX_REPORT_BYTES) {
        throw new ReportRenderFailure(
          'PDF_TOO_LARGE',
          'rendered report exceeds the prototype file-size limit',
          false,
        );
      }
      if (!canonical.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        throw new ReportRenderFailure(
          'PDF_INVALID',
          'renderer did not return a PDF document',
          false,
        );
      }
      return canonical;
    } catch (error) {
      renderError = error;
      if (error instanceof ReportWorkerTerminationRequiredError) throw error;
      if (error instanceof ReportRenderFailure) throw error;
      throw new ReportRenderFailure(
        'RENDERER_UNAVAILABLE',
        'draft report rendering did not complete',
        true,
        { cause: error },
      );
    } finally {
      let pageShutdownError: unknown;
      let browserShutdownError: unknown;
      if (page) {
        try {
          await withTimeout(
            closePage(),
            BROWSER_TEARDOWN_TIMEOUT_MS,
            'Chromium page shutdown',
          );
        } catch (error) {
          pageShutdownError = error;
        }
      }
      if (browser) {
        try {
          await withTimeout(
            closeBrowser(),
            BROWSER_TEARDOWN_TIMEOUT_MS,
            'Chromium shutdown',
          );
        } catch (error) {
          browserShutdownError = error;
        }
      }
      if (browserShutdownError) {
        throw new ReportWorkerTerminationRequiredError(
          'Chromium shutdown did not complete within the bounded teardown time',
          { cause: renderError ?? browserShutdownError },
        );
      }
      if (pageShutdownError && !renderError) {
        throw new ReportRenderFailure(
          'RENDERER_UNAVAILABLE',
          'Chromium page shutdown did not complete cleanly',
          true,
          { cause: pageShutdownError },
        );
      }
    }
  }
}

function renderExpectedAnchor(
  anchor: ApprovedSnapshotExpectedAnchor,
  inspections: readonly ApprovedSnapshotDocument['inspectionSubmission']['anchorInspections'][number][],
  photos: ReadonlyMap<string, ReportPhoto>,
): string {
  const title = anchor.label ?? anchor.registerId ?? anchor.anchorId;
  return `<article class="anchor">
    <h3>Expected anchor ${escapeHtml(title)}</h3>
    ${renderRegisterAnchor(anchor)}
    ${
      inspections.length
        ? inspections
            .map((inspection) =>
              renderAnchorInspection(inspection, photos, false),
            )
            .join('')
        : '<p class="muted">No inspection evidence was recorded for this expected anchor in the submitted revision.</p>'
    }
  </article>`;
}

function renderRegisterAnchor(anchor: ApprovedSnapshotExpectedAnchor): string {
  return `<dl class="anchor-meta">
    ${detail('Anchor ID', anchor.anchorId)}
    ${detail('Register ID', anchor.registerId)}
    ${detail('Register label', anchor.label)}
    ${detail('Register location', anchor.location)}
    ${detail('Anchor type', 'Single-point roof anchor')}
    ${detail('Manufacturer / model', [anchor.manufacturer, anchor.model].filter(Boolean).join(' / ') || null)}
    ${detail('Install context', anchor.installContext)}
    ${detail('Register status', anchor.registerStatus)}
  </dl>`;
}

function renderAnchorInspection(
  inspection: ApprovedSnapshotDocument['inspectionSubmission']['anchorInspections'][number],
  photos: ReadonlyMap<string, ReportPhoto>,
  provisional: boolean,
): string {
  const recordId = provisional
    ? (inspection.provisionalAnchorId ??
      inspection.expectedAnchorId ??
      'Unidentified record')
    : (inspection.expectedAnchorId ??
      inspection.provisionalAnchorId ??
      'Unidentified record');
  const photoSections = inspection.photos
    .map((photo) => renderPhoto(photo, photos.get(photo.localId)))
    .join('');
  return `<section class="submitted-record">
    <h3>${provisional ? 'Provisional record' : 'Submitted evidence'} · ${escapeHtml(recordId)}</h3>
    <dl class="anchor-meta">
      ${detail('Anchor inspection ID', inspection.inspectionId)}
      ${detail('Identity confirmed', inspection.identityConfirmed ? 'Recorded as confirmed' : 'Not recorded as confirmed')}
      ${detail('Location confirmed', inspection.locationConfirmed ? 'Recorded as confirmed' : 'Not recorded as confirmed')}
      ${detail('Recorded location', inspection.location)}
      ${detail('Recorded outcome', inspection.recordedOutcome)}
      ${detail('Exception', inspection.exceptionReason)}
      ${detail('Register reconciliation proposal', inspection.reconciliationProposal)}
      ${detail('Reconciliation reference', inspection.reconciliationReferenceId)}
      ${detail('Recorded disposition', inspection.disposition)}
      ${detail('Observation', inspection.observations)}
      ${detail('Notes', inspection.notes)}
      ${detail('Recorded defect', inspection.defectDescription)}
      ${detail('Recorded recommendation', inspection.recommendation)}
      ${detail('Recorded proof-test load', inspection.proofTestLoad)}
      ${detail('Recorded proof-test hold', inspection.proofTestHold)}
      ${detail('Recorded proof-test result', inspection.proofTestResult)}
      ${detail('Proof-test equipment reference', inspection.proofTestEquipmentReference)}
    </dl>
    ${photoSections ? `<div class="photos">${photoSections}</div>` : '<p class="muted">No photograph was attached to this anchor inspection.</p>'}
  </section>`;
}

function renderPhoto(
  photo: ApprovedSnapshotDocument['inspectionSubmission']['anchorInspections'][number]['photos'][number],
  resolved: ReportPhoto | undefined,
): string {
  if (!resolved) {
    throw new ReportRenderFailure(
      'PHOTO_UNAVAILABLE',
      'an approved photo could not be read from private storage',
      true,
    );
  }
  const contentType = resolved.contentType ?? 'image/jpeg';
  return `<figure>
    <img src="data:${escapeHtml(contentType)};base64,${Buffer.from(resolved.bytes).toString('base64')}" alt="Photograph ${escapeHtml(photo.localId)} captured ${escapeHtml(new Date(photo.capturedAtEpochMillis).toISOString())}">
    <figcaption>Recorded photograph · ${escapeHtml(new Date(photo.capturedAtEpochMillis).toISOString())} · SHA-256 ${escapeHtml(photo.checksum)}</figcaption>
  </figure>`;
}

function renderReviewIssue(issue: ApprovedSnapshotReviewIssue): string {
  const actions = issue.actions.length
    ? `<ol class="review-actions">${issue.actions
        .map(
          (action) =>
            `<li>${escapeHtml(action.action)} — ${escapeHtml(action.reason)} <span class="muted">(${escapeHtml(action.reviewerUserId)}, ${escapeHtml(action.createdAt)})</span></li>`,
        )
        .join('')}</ol>`
    : '<p class="muted">No follow-up action was recorded.</p>';
  return `<article class="review-item">
    <p><strong>${escapeHtml(issue.issueType)}</strong> · ${escapeHtml(issue.status)} · reviewer ${escapeHtml(issue.reviewerUserId)}</p>
    <p>${escapeHtml(issue.reason)}</p>
    ${detail('Affected anchor inspection', issue.anchorInspectionId)}
    <p class="muted">Recorded ${escapeHtml(issue.createdAt)}${issue.resolvedAt ? ` · resolved ${escapeHtml(issue.resolvedAt)}` : ''}</p>
    ${actions}
  </article>`;
}

function detail(label: string, value: string | null | undefined): string {
  return `<dt class="label">${escapeHtml(label)}</dt><dd class="value">${escapeHtml(value ?? 'Not recorded')}</dd>`;
}

function metaField(label: string, value: string): string {
  return `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function canonicalizePdfMetadata(pdf: Buffer, generationAt: string): Buffer {
  const date = new Date(generationAt);
  if (Number.isNaN(date.getTime())) {
    throw new ReportRenderFailure(
      'APPROVED_SNAPSHOT_INVALID',
      'report generation timestamp is invalid',
      false,
    );
  }
  const digits = date
    .toISOString()
    .replaceAll(/[-:T.Z]/g, '')
    .slice(0, 14);
  const canonicalDate = `D:${digits}+00'00'`;
  let replacements = 0;
  const canonical = pdf
    .toString('latin1')
    .replace(
      /\/(CreationDate|ModDate) \(D:\d{14}\+00'00'\)/g,
      (_match, field: string) => {
        replacements += 1;
        return `/${field} (${canonicalDate})`;
      },
    );
  if (replacements !== 2) {
    throw new ReportRenderFailure(
      'PDF_INVALID',
      `renderer returned unexpected PDF date metadata (${replacements})`,
      false,
    );
  }
  return Buffer.from(canonical, 'latin1');
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded ${timeoutMs} ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
