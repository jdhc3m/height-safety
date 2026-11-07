import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('office shell renders sidebar, breadcrumb header and legal footer', async () => {
  const layout = await read('../src/app/office/(shell)/layout.tsx');
  const sidebar = await read('../src/components/ShellSidebarNav.tsx');
  const breadcrumb = await read('../src/components/ShellBreadcrumb.tsx');
  const globals = await read('../src/app/globals.css');

  assert.match(layout, /className="shell-sidebar"/);
  assert.match(layout, /<ShellSidebarNav \/>/);
  assert.match(layout, /<ShellBreadcrumb \/>/);
  assert.match(layout, /className="shell-header"/);
  assert.match(layout, /className="shell-footer"/);
  assert.match(layout, /href="\/legal"/);
  assert.match(layout, /Scope and legal/);

  assert.match(sidebar, /usePathname/);
  assert.match(sidebar, /aria-current/);
  assert.match(sidebar, /href: '\/office', label: 'Jobs'/);

  assert.match(breadcrumb, /usePathname/);
  assert.match(breadcrumb, /aria-label="Breadcrumb"/);
  assert.match(breadcrumb, /office: 'Office'/);

  assert.match(globals, /@import '\.\/tokens\.css';/);
  assert.doesNotMatch(
    globals,
    /#f3f7f4|#17352d|#285f46|#426356|#4c7a65|#d9e6dc|#b9d5c2|#e8f3eb|#386a50|#d2e1d6|#dceee1|#2f694c|#cbdacf/,
  );
});

test('office pages stay at their current URLs inside the shell route group', async () => {
  const office = await read('../src/app/office/(shell)/page.tsx');
  const review = await read(
    '../src/app/office/(shell)/reviews/[inspectionId]/page.tsx',
  );
  const fileRoute = await read(
    '../src/app/office/(shell)/reports/[generationId]/file/route.ts',
  );

  assert.match(office, /redirect\('\/auth\/login\?returnTo=\/office'\)/);
  assert.match(
    review,
    /\/auth\/login\?returnTo=\/office\/reviews\/\$\{encodeURIComponent\(inspectionId\)\}/,
  );
  assert.match(fileRoute, /openOfficeSession\(\)/);
});

test('StatusPill is the single status pill component for outcome, sync and workflow', async () => {
  const component = await read('../src/components/StatusPill.tsx');
  const mapping = await read('../src/lib/status-pill.ts');

  assert.match(component, /kind, value/);
  assert.match(component, /resolveStatusPill\(kind, value\)/);
  assert.match(component, /kind: StatusPillKind;\s+value: string;/);

  for (const value of [
    'serviceable',
    'defective',
    'not_inspected',
    'further_assessment_required',
    'synchronised',
    'conflict',
    'sending',
    'not_synced',
    'offline',
    'draft',
    'released',
    'assigned',
    'in_progress',
    'submitted',
    'under_review',
    'changes_requested',
    'approved_for_report_generation',
    'report_generated',
    'queued',
    'processing',
    'completed',
    'failed',
    'superseded',
    'open',
    'resolved',
  ]) {
    assert.match(mapping, new RegExp(`\\b${value}:`, 'g'));
  }

  assert.doesNotMatch(mapping, /label: '[^']*_/);
  assert.match(mapping, /tone: 'neutral'/);
  assert.match(mapping, /STATUS_PILL_REFERENCE/);
});

test('office pages render statuses through StatusPill, not ad-hoc chips', async () => {
  const office = await read('../src/app/office/(shell)/page.tsx');
  const review = await read(
    '../src/app/office/(shell)/reviews/[inspectionId]/page.tsx',
  );

  assert.match(
    office,
    /<StatusPill kind="workflow" value=\{job\.workflowStatus\} \/>/,
  );
  assert.match(office, /Jurisdiction recorded: \{jurisdiction\}/);
  assert.doesNotMatch(office, /chip--nsw|chip--qld/);

  assert.match(
    review,
    /<StatusPill kind="workflow" value=\{issue\.status\} \/>/,
  );
  assert.match(
    review,
    /<StatusPill\s+kind="workflow"\s+value=\{reportGeneration\.status\}\s+\/>/,
  );
  assert.doesNotMatch(review, /chip--info/);
});

test('the status pill reference page renders every variant inside the shell', async () => {
  const reference = await read(
    '../src/app/office/(shell)/status-pill/page.tsx',
  );

  assert.match(reference, /STATUS_PILL_REFERENCE/);
  assert.match(reference, /<StatusPill /);
  assert.match(reference, /design-system reference/);
});

test('the legal page is the single home of standing scope and legal wording', async () => {
  const legal = await read('../src/app/legal/page.tsx');
  const review = await read(
    '../src/app/office/(shell)/reviews/[inspectionId]/page.tsx',
  );

  assert.match(legal, /one home for the product/);
  assert.match(
    legal,
    /does not certify an\s+anchor, approve engineering work or\s+determine compliance/,
  );
  assert.match(legal, /recorded explicitly as NSW or\s+Queensland/);
  assert.match(legal, /append-only and audited/);
  assert.match(legal, /does not replace professional judgement/);

  assert.doesNotMatch(review, /certif/);
  assert.match(review, /href="\/legal"/);
});

test('new web pages keep neutral language without unsupported claims', async () => {
  const sources = [
    '../src/app/office/(shell)/layout.tsx',
    '../src/app/office/(shell)/page.tsx',
    '../src/app/office/(shell)/status-pill/page.tsx',
    '../src/app/legal/page.tsx',
    '../src/components/StatusPill.tsx',
  ];

  for (const source of sources) {
    const content = await read(source);
    assert.doesNotMatch(
      content,
      /product (is|provides|issues) (a )?certif|automatic compliance conclusion|standards compliant|certified/,
      source,
    );
  }
});
