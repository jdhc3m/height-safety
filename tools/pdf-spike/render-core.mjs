import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { hostname } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '../..');
const FONT_PATH = path.join(
  ROOT,
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2',
);
const TEMPLATE_VERSION = 'prototype-draft-v1';
const LOCK_DATABASE_FILE = '.pdf-spike-locks.sqlite';
const MINIMUM_LOCK_LEASE_MS = 1000;

export class ReportOwnershipLostError extends Error {
  constructor(key, options) {
    super(`Report ownership lost for ${key}`, options);
    this.name = 'ReportOwnershipLostError';
  }
}

export class WorkerTerminationRequiredError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'WorkerTerminationRequiredError';
    this.workerTerminationRequired = true;
  }
}

export async function loadFixture(fixturePath) {
  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

export function validateFixture(fixture) {
  const errors = [];
  if (fixture.templateVersion !== TEMPLATE_VERSION) errors.push('templateVersion');
  if (!['NSW', 'QLD'].includes(fixture.jurisdiction)) errors.push('jurisdiction');
  for (const field of ['anchorCount', 'photosPerAnchor', 'photoWidth', 'photoHeight']) {
    if (!Number.isInteger(fixture[field]) || fixture[field] < 1) errors.push(field);
  }
  if (fixture.anchorCount < 20) errors.push('anchorCount must remain representative');
  if (Number.isNaN(Date.parse(fixture.generationDate))) errors.push('generationDate');
  if (!fixture.disclaimer?.includes('early-stage inspection workflow prototype')) {
    errors.push('prototype disclaimer');
  }
  if (errors.length) throw new Error(`Invalid report fixture: ${errors.join(', ')}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function buildHtml(fixture, variant = 'baseline') {
  validateFixture(fixture);
  const font = (await readFile(FONT_PATH)).toString('base64');
  const sections = Array.from({ length: fixture.anchorCount }, (_, index) => {
    const anchorNumber = index + 1;
    const photos = Array.from({ length: fixture.photosPerAnchor }, (_, photoIndex) => {
      const seed = anchorNumber * 1009 + photoIndex * 9176;
      return `<figure><img class="synthetic-photo" data-seed="${seed}" alt="Synthetic fixture photograph ${photoIndex + 1} for anchor ${anchorNumber}"><figcaption>Synthetic photo ${photoIndex + 1} — renderer fixture only</figcaption></figure>`;
    }).join('');
    return `<section class="anchor">
      <h2>Anchor A-${String(anchorNumber).padStart(3, '0')}</h2>
      <dl><dt>Location</dt><dd>Roof zone ${Math.ceil(anchorNumber / 5)}, grid ${anchorNumber}</dd><dt>Recorded outcome</dt><dd>Further assessment required</dd></dl>
      <p>${escapeHtml(fixture.observationTemplate)}</p>
      <div class="photos">${photos}</div>
      <p class="recommendation"><strong>Recorded recommendation:</strong> ${escapeHtml(fixture.recommendationTemplate)}</p>
    </section>`;
  }).join('');

  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(fixture.title)}</title>
  <style>
    @font-face { font-family: 'Noto Sans Fixture'; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 400; }
    @page { size: A4; margin: 14mm 12mm 16mm; }
    * { box-sizing: border-box; }
    html, body { background: #fff; }
    body { margin: 0; color: #17202a; font: 9pt/1.38 'Noto Sans Fixture', sans-serif; -webkit-print-color-adjust: exact; }
    header { border-bottom: 2px solid #164e63; margin-bottom: 8mm; padding-bottom: 4mm; }
    h1 { color: #164e63; font-size: 21pt; margin: 0 0 3mm; }
    h2 { color: #164e63; font-size: 13pt; margin: 0 0 2mm; }
    .draft { background: #b42318; color: white; display: inline-block; font-weight: bold; letter-spacing: .12em; padding: 2mm 4mm; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5mm 8mm; margin: 5mm 0; }
    .meta div, dl { border-bottom: 1px solid #d5d9dc; padding: 1mm 0; }
    .anchor { break-before: page; }
    dl { display: grid; grid-template-columns: 36mm 1fr; margin: 0 0 3mm; }
    dt { font-weight: bold; } dd { margin: 0; }
    .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; }
    figure { margin: 0; break-inside: avoid; }
    img { background: #dde5e8; display: block; height: 74mm; object-fit: cover; width: 100%; }
    figcaption { color: #52616b; font-size: 7.5pt; margin-top: 1mm; }
    .recommendation { background: #f2f4f5; border-left: 3px solid #667085; padding: 3mm; }
    .disclaimer { border: 1px solid #b42318; color: #7a271a; margin-top: 6mm; padding: 4mm; }
  </style></head><body>
    <header><span class="draft">DRAFT</span><h1>${escapeHtml(fixture.title)}</h1>
      <div class="meta"><div><strong>Company:</strong> ${escapeHtml(fixture.company)}</div><div><strong>Client:</strong> ${escapeHtml(fixture.client)}</div><div><strong>Site:</strong> ${escapeHtml(fixture.site)}</div><div><strong>Jurisdiction context:</strong> ${escapeHtml(fixture.jurisdiction)}</div><div><strong>Job:</strong> ${escapeHtml(fixture.jobReference)}</div><div><strong>Inspection date:</strong> ${escapeHtml(fixture.inspectionDate)}</div><div><strong>Inspector:</strong> ${escapeHtml(fixture.inspector)}</div><div><strong>Reviewer:</strong> ${escapeHtml(fixture.reviewer)}</div><div><strong>Revision:</strong> ${fixture.revision}</div><div><strong>Fixture variant:</strong> ${escapeHtml(variant)}</div></div>
      <p class="disclaimer">${escapeHtml(fixture.disclaimer)}</p>
    </header>${sections}
    <script>
      const width = ${fixture.photoWidth}; const height = ${fixture.photoHeight}; const quality = ${fixture.jpegQuality};
      function random(seed) { return () => ((seed = Math.imul(48271, seed) % 2147483647) & 2147483647) / 2147483647; }
      async function makePhoto(img) {
        const rand = random(Number(img.dataset.seed)); const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#70808a'); gradient.addColorStop(.5, '#b7c0c4'); gradient.addColorStop(1, '#4d5d63'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#303b40'; ctx.lineWidth = 14; for (let x = -height; x < width; x += 130) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + height, height); ctx.stroke(); }
        for (let i = 0; i < 4500; i++) { const shade = Math.floor(70 + rand() * 120); ctx.fillStyle = 'rgba(' + shade + ',' + shade + ',' + shade + ',.18)'; ctx.fillRect(rand() * width, rand() * height, 2 + rand() * 12, 2 + rand() * 12); }
        const cx = width * (.35 + rand() * .3); const cy = height * (.35 + rand() * .3); ctx.fillStyle = '#d8d0ba'; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5f5544'; ctx.lineWidth = 25; ctx.stroke(); ctx.fillStyle = '#242b2e'; ctx.fillRect(cx - 18, cy - 130, 36, 260);
        ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, height - 74, width, 74); ctx.fillStyle = '#fff'; ctx.font = '32px Noto Sans Fixture'; ctx.fillText(img.alt, 24, height - 27);
        img.src = canvas.toDataURL('image/jpeg', quality); await img.decode(); canvas.width = 1; canvas.height = 1;
      }
      Promise.all([...document.querySelectorAll('.synthetic-photo')].map(makePhoto)).then(async () => { await document.fonts.ready; window.__reportReady = true; });
    </script></body></html>`;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function abortReason(signal) {
  return signal?.reason instanceof Error ? signal.reason : new Error('Report render aborted');
}

function wait(delayMs, signal) {
  if (!delayMs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function createDeadline(externalSignal, timeoutMs, operation = 'Report render') {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(abortReason(externalSignal));
  if (externalSignal?.aborted) onExternalAbort();
  else externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error(`${operation} exceeded ${timeoutMs} ms`)),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    abort(error) {
      controller.abort(error);
    },
    dispose() {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

function runAbortable(operation, signal) {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', handleAbort);
      callback(value);
    };
    const handleAbort = () => {
      finish(reject, abortReason(signal));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    Promise.resolve()
      .then(operation)
      .then((value) => finish(resolve, value), (error) => finish(reject, error));
  });
}

export async function closeBrowserBounded(browser, timeoutMs, operation = 'Browser termination') {
  if (!browser) return;
  if (typeof browser.close !== 'function') {
    throw new WorkerTerminationRequiredError(`${operation} is unavailable`);
  }
  let timer;
  const closeResult = await Promise.race([
    Promise.resolve()
      .then(() => browser.close())
      .then(
        () => ({ closed: true }),
        (error) => ({ closed: false, error }),
      ),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve({ closed: false, timedOut: true }), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  if (!closeResult.closed) {
    const reason = closeResult.timedOut
      ? `${operation} exceeded ${timeoutMs} ms`
      : `${operation} failed`;
    throw new WorkerTerminationRequiredError(reason, { cause: closeResult.error });
  }
}

async function closePageBounded(page, browser, timeoutMs) {
  if (!page) return;
  let pageCloseSucceeded = false;
  let teardownTimer;
  const pageClose = Promise.resolve()
    .then(() => page.close())
    .then(
      () => { pageCloseSucceeded = true; },
      () => {},
    );
  try {
    await Promise.race([
      pageClose,
      new Promise((resolve) => { teardownTimer = setTimeout(resolve, timeoutMs); }),
    ]);
  } finally {
    clearTimeout(teardownTimer);
  }
  if (!pageCloseSucceeded) {
    await closeBrowserBounded(
      browser,
      timeoutMs,
      'Browser termination after page teardown',
    );
  }
}

function canonicalizePdfMetadata(pdf, generationDate) {
  const date = new Date(generationDate);
  const digits = date.toISOString().replaceAll(/[-:T.Z]/g, '').slice(0, 14);
  const canonicalDate = `D:${digits}+00'00'`;
  let replacements = 0;
  const canonical = pdf.toString('latin1').replace(
    /\/(CreationDate|ModDate) \(D:\d{14}\+00'00'\)/g,
    (_, field) => {
      replacements += 1;
      return `/${field} (${canonicalDate})`;
    },
  );
  if (replacements !== 2) {
    throw new Error(`Expected two Chromium PDF date fields; found ${replacements}`);
  }
  return Buffer.from(canonical, 'latin1');
}

const DEFAULT_COMMIT_FILE_OPERATIONS = { rename, rm, writeFile };

export async function commitRenderedReport({
  tempPath,
  finalPath,
  manifestPath,
  manifest,
  signal,
  fileOperations = DEFAULT_COMMIT_FILE_OPERATIONS,
}) {
  const temporaryManifestPath = `${manifestPath}.${process.pid}.${randomUUID()}.tmp`;
  let committed = false;
  const assertActive = () => {
    if (signal.aborted) throw abortReason(signal);
  };
  try {
    assertActive();
    await fileOperations.writeFile(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    assertActive();
    await fileOperations.rename(tempPath, finalPath);
    assertActive();
    await fileOperations.rename(temporaryManifestPath, manifestPath);
    assertActive();
    committed = true;
  } finally {
    if (!committed) {
      await Promise.all([
        fileOperations.rm(tempPath, { force: true }),
        fileOperations.rm(temporaryManifestPath, { force: true }),
        fileOperations.rm(manifestPath, { force: true }),
        fileOperations.rm(finalPath, { force: true }),
      ]);
    }
  }
}

async function validExisting(finalPath, manifestPath, inputHash) {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const bytes = await readFile(finalPath);
    return manifest.inputHash === inputHash && manifest.pdfSha256 === hash(bytes);
  } catch {
    return false;
  }
}

async function reusedReportResult(finalPath, manifestPath, key) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const bytes = await readFile(finalPath);
  return {
    inputHash: manifest.inputHash,
    key,
    pdfSha256: manifest.pdfSha256,
    bytes: bytes.length,
    renderer: manifest.renderer,
    templateVersion: manifest.templateVersion,
    generationDate: manifest.generationDate,
    reused: true,
    path: finalPath,
  };
}

async function cleanStaleTemps(outputDir, key) {
  const names = await readdir(outputDir).catch(() => []);
  await Promise.all(names.filter((name) => (
    (name.startsWith(`${key}.`) && name.endsWith('.tmp.pdf'))
    || (name.startsWith(`${key}.json.`) && name.endsWith('.tmp'))
  )).map((name) => rm(path.join(outputDir, name), { force: true })));
}

function openLockDatabase(outputDir, busyTimeoutMs = 5000) {
  const database = new DatabaseSync(path.join(outputDir, LOCK_DATABASE_FILE));
  database.exec(`PRAGMA busy_timeout = ${Math.max(1, Math.floor(busyTimeoutMs))}`);
  database.exec(`
    CREATE TABLE IF NOT EXISTS report_leases (
      report_key TEXT PRIMARY KEY,
      owner_token TEXT NOT NULL,
      owner_pid INTEGER NOT NULL,
      owner_hostname TEXT NOT NULL,
      lease_expires_at_ms INTEGER NOT NULL
    )
  `);
  return database;
}

function lockWaitExpiredError(timeoutMs) {
  return new Error(`Report lock wait exceeded ${timeoutMs} ms`);
}

export function lockPollDelayMs(deadlineAtMs, nowMs = Date.now()) {
  return Math.min(250, Math.max(0, deadlineAtMs - nowMs));
}

function inImmediateTransaction(database, operation) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function currentLockOwner(database, key) {
  return database.prepare(`
    SELECT report_key, owner_token, owner_pid, owner_hostname, lease_expires_at_ms
    FROM report_leases
    WHERE report_key = ?
  `).get(key);
}

export function readReportLock(outputDir, key) {
  const database = openLockDatabase(outputDir);
  try {
    return currentLockOwner(database, key);
  } finally {
    database.close();
  }
}

function tryAcquireReportLock({ outputDir, key, lockStaleMs, deadlineAtMs, timeoutMs }) {
  const remainingMs = Math.max(1, deadlineAtMs - Date.now());
  // DatabaseSync blocks the event loop while SQLite honours busy_timeout.
  // Use short slices so both schema setup and BEGIN IMMEDIATE return often
  // enough for the outer absolute deadline to remain meaningful.
  let database;
  try {
    database = openLockDatabase(outputDir, Math.min(100, remainingMs));
    const lock = inImmediateTransaction(database, () => {
      const existing = currentLockOwner(database, key);
      const now = Date.now();
      if (now >= deadlineAtMs) throw lockWaitExpiredError(timeoutMs);
      if (existing && existing.lease_expires_at_ms > now) return { acquired: false };

      const leaseMs = Math.max(lockStaleMs, MINIMUM_LOCK_LEASE_MS);
      const owner = {
        token: randomUUID(),
        pid: process.pid,
        hostname: hostname(),
        leaseExpiresAtMs: now + leaseMs,
      };
      database.prepare(`
        INSERT INTO report_leases (
          report_key, owner_token, owner_pid, owner_hostname, lease_expires_at_ms
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(report_key) DO UPDATE SET
          owner_token = excluded.owner_token,
          owner_pid = excluded.owner_pid,
          owner_hostname = excluded.owner_hostname,
          lease_expires_at_ms = excluded.lease_expires_at_ms
      `).run(key, owner.token, owner.pid, owner.hostname, owner.leaseExpiresAtMs);
      return { acquired: true, ownerToken: owner.token, leaseMs };
    });
    if (Date.now() >= deadlineAtMs) {
      if (lock.acquired) {
        try {
          database.prepare('DELETE FROM report_leases WHERE report_key = ? AND owner_token = ?')
            .run(key, lock.ownerToken);
        } catch {}
      }
      throw lockWaitExpiredError(timeoutMs);
    }
    return lock;
  } catch (error) {
    if (Date.now() >= deadlineAtMs) throw lockWaitExpiredError(timeoutMs);
    if (error?.errcode === 5) return { acquired: false };
    throw error;
  } finally {
    database?.close();
  }
}

function removeDeadReportLock(outputDir, key) {
  const database = openLockDatabase(outputDir);
  try {
    return inImmediateTransaction(database, () => {
      const owner = currentLockOwner(database, key);
      if (!owner) return false;
      if (owner.lease_expires_at_ms > Date.now()) return false;
      database.prepare('DELETE FROM report_leases WHERE report_key = ? AND owner_token = ?')
        .run(key, owner.owner_token);
      return true;
    });
  } finally {
    database.close();
  }
}

function removeOwnedLock(outputDir, key, ownerToken) {
  const database = openLockDatabase(outputDir);
  try {
    database.prepare('DELETE FROM report_leases WHERE report_key = ? AND owner_token = ?').run(key, ownerToken);
  } finally {
    database.close();
  }
}

function startLockHeartbeat(outputDir, key, ownerToken, leaseMs, onOwnershipLost) {
  const intervalMs = Math.max(100, Math.floor(leaseMs / 3));
  const timer = setInterval(() => {
    let database;
    try {
      database = openLockDatabase(outputDir);
      const refreshed = inImmediateTransaction(database, () => {
        const owner = currentLockOwner(database, key);
        const now = Date.now();
        if (
          !owner
          || owner.owner_token !== ownerToken
          || owner.lease_expires_at_ms <= now
        ) return false;
        database.prepare(`
          UPDATE report_leases
          SET lease_expires_at_ms = ?
          WHERE report_key = ? AND owner_token = ?
        `).run(now + leaseMs, key, ownerToken);
        return true;
      });
      if (!refreshed) {
        clearInterval(timer);
        onOwnershipLost(new ReportOwnershipLostError(key));
      }
    } catch (error) {
      clearInterval(timer);
      onOwnershipLost(new ReportOwnershipLostError(key, { cause: error }));
    } finally {
      database?.close();
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

function publishPreparedReportWithLease({
  outputDir,
  key,
  ownerToken,
  leaseMs,
  tempPath,
  temporaryManifestPath,
  finalPath,
  manifestPath,
}) {
  const database = openLockDatabase(outputDir);
  let transactionOpen = false;
  let pdfPublished = false;
  let manifestPublished = false;
  try {
    database.exec('BEGIN IMMEDIATE');
    transactionOpen = true;
    const owner = currentLockOwner(database, key);
    const now = Date.now();
    if (
      !owner
      || owner.owner_token !== ownerToken
      || owner.lease_expires_at_ms <= now
    ) {
      throw new ReportOwnershipLostError(key);
    }
    database.prepare(`
      UPDATE report_leases
      SET lease_expires_at_ms = ?
      WHERE report_key = ? AND owner_token = ?
    `).run(now + leaseMs, key, ownerToken);

    // SQLite excludes takeover while these synchronous renames publish the
    // pair. A stale renderer can therefore never overwrite a newer owner's
    // files after its lease has expired.
    renameSync(tempPath, finalPath);
    pdfPublished = true;
    renameSync(temporaryManifestPath, manifestPath);
    manifestPublished = true;
    database.exec('COMMIT');
    transactionOpen = false;
  } catch (error) {
    if (manifestPublished) rmSync(manifestPath, { force: true });
    if (pdfPublished) rmSync(finalPath, { force: true });
    if (transactionOpen) {
      try { database.exec('ROLLBACK'); } catch {}
    }
    throw error;
  } finally {
    database.close();
  }
}

export async function commitRenderedReportWithLease({
  outputDir,
  key,
  ownerToken,
  leaseMs,
  tempPath,
  finalPath,
  manifestPath,
  manifest,
  signal,
  fileOperations = { writeFile },
}) {
  const temporaryManifestPath = `${manifestPath}.${process.pid}.${randomUUID()}.tmp`;
  let committed = false;
  try {
    if (signal.aborted) throw abortReason(signal);
    await fileOperations.writeFile(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    if (signal.aborted) throw abortReason(signal);
    publishPreparedReportWithLease({
      outputDir,
      key,
      ownerToken,
      leaseMs,
      tempPath,
      temporaryManifestPath,
      finalPath,
      manifestPath,
    });
    committed = true;
  } finally {
    if (!committed) {
      await Promise.all([
        rm(tempPath, { force: true }),
        rm(temporaryManifestPath, { force: true }),
      ]);
    }
  }
}

async function acquireReportLock({ outputDir, finalPath, manifestPath, inputHash, key, signal, lockStaleMs, onLockContention, deadlineAtMs, timeoutMs }) {
  let contentionReported = false;
  while (true) {
    if (signal.aborted || Date.now() >= deadlineAtMs) throw lockWaitExpiredError(timeoutMs);
    const existingIsValid = await validExisting(finalPath, manifestPath, inputHash);
    if (signal.aborted || Date.now() >= deadlineAtMs) throw lockWaitExpiredError(timeoutMs);
    if (existingIsValid) {
      return { acquired: false, result: await reusedReportResult(finalPath, manifestPath, key) };
    }
    const lock = tryAcquireReportLock({ outputDir, key, lockStaleMs, deadlineAtMs, timeoutMs });
    if (lock.acquired) return lock;
    if (!contentionReported) {
      contentionReported = true;
      await onLockContention?.();
    }
    await wait(lockPollDelayMs(deadlineAtMs), signal);
  }
}

export async function renderReport({ browser, fixture, outputDir, variant = 'baseline', delayMs = 0, postRenderDelayMs = 0, renderTimeoutMs = 60000, teardownTimeoutMs = 1000, lockStaleMs = 5000, signal, onLockContention }) {
  validateFixture(fixture);
  if (!Number.isFinite(renderTimeoutMs) || renderTimeoutMs <= 0) {
    throw new Error('renderTimeoutMs must be a positive number');
  }
  if (!Number.isFinite(lockStaleMs) || lockStaleMs < 0) {
    throw new Error('lockStaleMs must be a non-negative number');
  }
  if (!Number.isFinite(teardownTimeoutMs) || teardownTimeoutMs <= 0) {
    throw new Error('teardownTimeoutMs must be a positive number');
  }
  await mkdir(outputDir, { recursive: true });
  const inputHash = hash(JSON.stringify({ fixture, template: TEMPLATE_VERSION, variant }));
  const key = inputHash.slice(0, 20);
  const finalPath = path.join(outputDir, `${key}.pdf`);
  const manifestPath = path.join(outputDir, `${key}.json`);
  if (await validExisting(finalPath, manifestPath, inputHash)) {
    removeDeadReportLock(outputDir, key);
    await cleanStaleTemps(outputDir, key);
    return reusedReportResult(finalPath, manifestPath, key);
  }
  const leaseMs = Math.max(lockStaleMs, MINIMUM_LOCK_LEASE_MS);
  const lockWaitTimeoutMs = renderTimeoutMs + (2 * teardownTimeoutMs) + leaseMs + 1000;
  const lockWaitDeadlineAtMs = Date.now() + lockWaitTimeoutMs;
  const lockDeadline = createDeadline(signal, lockWaitTimeoutMs, 'Report lock wait');
  let lock;
  try {
    lock = await acquireReportLock({
      outputDir,
      finalPath,
      manifestPath,
      inputHash,
      key,
      signal: lockDeadline.signal,
      lockStaleMs,
      onLockContention,
      deadlineAtMs: lockWaitDeadlineAtMs,
      timeoutMs: lockWaitTimeoutMs,
    });
  } finally {
    lockDeadline.dispose();
  }
  if (!lock.acquired) return lock.result;
  const deadline = createDeadline(signal, renderTimeoutMs);
  const stopLockHeartbeat = startLockHeartbeat(
    outputDir,
    key,
    lock.ownerToken,
    lock.leaseMs,
    (error) => deadline.abort(error),
  );
  const tempPath = path.join(outputDir, `${key}.${process.pid}.${randomUUID()}.tmp.pdf`);
  let page;
  let stage = 'initialisation';
  try {
    if (await validExisting(finalPath, manifestPath, inputHash)) return reusedReportResult(finalPath, manifestPath, key);
    await cleanStaleTemps(outputDir, key);
    stage = 'browser page creation';
    page = await runAbortable(() => browser.newPage(), deadline.signal);
    stage = 'network isolation';
    await runAbortable(() => page.route(/^https?:/, (route) => route.abort('blockedbyclient')), deadline.signal);
    stage = 'HTML construction';
    const html = await runAbortable(() => buildHtml(fixture, variant), deadline.signal);
    stage = 'HTML loading';
    await runAbortable(() => page.setContent(html, { waitUntil: 'load' }), deadline.signal);
    stage = 'photo and font readiness';
    await runAbortable(() => page.waitForFunction(() => window.__reportReady === true), deadline.signal);
    stage = 'pre-render delay';
    await wait(delayMs, deadline.signal);
    stage = 'PDF printing';
    await runAbortable(
      () => page.pdf({ path: tempPath, format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true }),
      deadline.signal,
    );
    stage = 'post-render delay';
    await wait(postRenderDelayMs, deadline.signal);
    stage = 'PDF finalisation';
    const pdf = canonicalizePdfMetadata(await readFile(tempPath), fixture.generationDate);
    await writeFile(tempPath, pdf);
    const manifest = { inputHash, key, pdfSha256: hash(pdf), bytes: pdf.length, renderer: 'playwright-chromium', templateVersion: TEMPLATE_VERSION, generationDate: fixture.generationDate };
    stage = 'PDF commit';
    await commitRenderedReportWithLease({
      outputDir,
      key,
      ownerToken: lock.ownerToken,
      leaseMs: lock.leaseMs,
      tempPath,
      finalPath,
      manifestPath,
      manifest,
      signal: deadline.signal,
    });
    return { ...manifest, reused: false, path: finalPath };
  } catch (error) {
    if (deadline.signal.aborted) {
      throw new Error(`${abortReason(deadline.signal).message} during ${stage}`, { cause: error });
    }
    throw error;
  } finally {
    deadline.dispose();
    let teardownCompleted = false;
    try {
      await closePageBounded(page, browser, teardownTimeoutMs);
      teardownCompleted = true;
    } finally {
      stopLockHeartbeat();
      if (teardownCompleted) {
        await rm(tempPath, { force: true }).catch(() => {});
        try { removeOwnedLock(outputDir, key, lock.ownerToken); } catch {}
      }
    }
  }
}

export async function launchBrowser() {
  return chromium.launch({ headless: true });
}

export async function directoryBytes(directory) {
  let total = 0;
  for (const name of await readdir(directory).catch(() => [])) {
    const details = await stat(path.join(directory, name));
    if (details.isFile()) total += details.size;
  }
  return total;
}

export { ROOT, TEMPLATE_VERSION };
