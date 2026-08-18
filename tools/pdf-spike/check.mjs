import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';

import {
  calculateIntervalCpuPercent,
  collectWorkerResult,
  createProcessMonitor,
  evaluatePdfInspection,
  runMeasured,
  singleRenderMemoryWithinLimit,
} from './benchmark-support.mjs';
import { buildHtml, commitRenderedReport, commitRenderedReportWithLease, loadFixture, lockPollDelayMs, readReportLock, renderReport, ROOT, validateFixture } from './render-core.mjs';

const fixturePath = path.join(ROOT, 'fixtures/reports/representative-photo-heavy-report.json');
const fixture = await loadFixture(fixturePath);
validateFixture(fixture);
assert.equal(fixture.anchorCount * fixture.photosPerAnchor, 60);
const html = await buildHtml(fixture, 'static-check');
assert.match(html, /DRAFT/);
assert.match(html, /early-stage inspection workflow prototype/);
assert.equal((html.match(/class="synthetic-photo"/g) ?? []).length, 60);
assert.doesNotMatch(html, /certified|standards-approved|engineer-approved/i);

function fakeBrowser({
  stalledPdf = false,
  stalledClose = false,
  rejectedClose = false,
  rejectedBrowserClose = false,
  stalledBrowserClose = false,
  browserCloseDelayMs = 0,
  delayedPdfWriteMs,
  onDelayedPdfWrite,
} = {}) {
  let pages = 0;
  let closedPages = 0;
  let browserCloseCalls = 0;
  let browserClosed = false;
  const pageCloseResolvers = [];
  const delayedWrites = [];
  return {
    get pages() { return pages; },
    get closedPages() { return closedPages; },
    get browserCloseCalls() { return browserCloseCalls; },
    get browserClosed() { return browserClosed; },
    async close() {
      browserCloseCalls += 1;
      if (stalledBrowserClose) return new Promise(() => {});
      await new Promise((resolve) => setTimeout(resolve, browserCloseDelayMs));
      await Promise.all(delayedWrites);
      if (rejectedBrowserClose) throw new Error('simulated browser close rejection');
      browserClosed = true;
      for (const resolve of pageCloseResolvers.splice(0)) resolve();
    },
    async newPage() {
      pages += 1;
      return {
        async route() {},
        async setContent() {},
        async waitForFunction() {},
        async pdf({ path: pdfPath }) {
          if (delayedPdfWriteMs !== undefined) {
            delayedWrites.push(new Promise((resolve, reject) => {
              setTimeout(() => {
                Promise.resolve(onDelayedPdfWrite?.(pdfPath))
                  .then(() => writeFile(pdfPath, Buffer.from("/CreationDate (D:20000101000000+00'00') /ModDate (D:20000101000000+00'00')")))
                  .then(resolve, reject);
              }, delayedPdfWriteMs);
            }));
          }
          if (stalledPdf) return new Promise(() => {});
          await writeFile(pdfPath, Buffer.from("/CreationDate (D:20000101000000+00'00') /ModDate (D:20000101000000+00'00')"));
        },
        async close() {
          closedPages += 1;
          if (rejectedClose) throw new Error('simulated page close rejection');
          if (stalledClose && !browserClosed) {
            return new Promise((resolve) => pageCloseResolvers.push(resolve));
          }
        },
      };
    },
  };
}

async function waitForTemporaryPdf(directory) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await readdir(directory).catch(() => [])).some((name) => name.endsWith('.tmp.pdf'))) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Temporary PDF was not created');
}

async function waitForLock(directory) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (reportLockCount(directory) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Report lock was not created');
}

function withLockDatabase(directory, operation) {
  const database = new DatabaseSync(path.join(directory, '.pdf-spike-locks.sqlite'));
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS report_leases (
        report_key TEXT PRIMARY KEY,
        owner_token TEXT NOT NULL,
        owner_pid INTEGER NOT NULL,
        owner_hostname TEXT NOT NULL,
        lease_expires_at_ms INTEGER NOT NULL
      )
    `);
    return operation(database);
  } finally {
    database.close();
  }
}

function reportLockCount(directory) {
  try {
    return withLockDatabase(directory, (database) => database.prepare('SELECT count(*) AS count FROM report_leases').get().count);
  } catch {
    return 0;
  }
}

function seedReportLock(directory, key, {
  token,
  pid,
  leaseExpiresAtMs = 0,
}) {
  withLockDatabase(directory, (database) => database.prepare(`
    INSERT OR REPLACE INTO report_leases (
      report_key, owner_token, owner_pid, owner_hostname, lease_expires_at_ms
    ) VALUES (?, ?, ?, ?, ?)
  `).run(key, token, pid, hostname(), leaseExpiresAtMs));
}

const testRoot = await mkdtemp(path.join(tmpdir(), 'height-safety-pdf-check-'));
try {
  const timeoutBrowser = fakeBrowser({ stalledPdf: true, stalledClose: true });
  await assert.rejects(
    renderReport({ browser: timeoutBrowser, fixture, outputDir: path.join(testRoot, 'timeout'), variant: 'timeout', renderTimeoutMs: 50, teardownTimeoutMs: 25 }),
    /Report render exceeded 50 ms/,
  );
  assert.equal(timeoutBrowser.closedPages > 0, true);
  assert.equal(timeoutBrowser.browserCloseCalls, 1);
  assert.equal(timeoutBrowser.browserClosed, true);
  assert.equal(reportLockCount(path.join(testRoot, 'timeout')), 0);
  assert.equal((await readdir(path.join(testRoot, 'timeout'))).some((name) => name.endsWith('.tmp.pdf')), false);

  const rejectedCloseBrowser = fakeBrowser({ stalledPdf: true, rejectedClose: true });
  await assert.rejects(
    renderReport({ browser: rejectedCloseBrowser, fixture, outputDir: path.join(testRoot, 'rejected-close'), variant: 'rejected-close', renderTimeoutMs: 30 }),
    /Report render exceeded 30 ms/,
  );
  assert.equal(rejectedCloseBrowser.browserCloseCalls, 1);
  assert.equal(rejectedCloseBrowser.browserClosed, true);
  assert.equal(reportLockCount(path.join(testRoot, 'rejected-close')), 0);
  assert.equal((await readdir(path.join(testRoot, 'rejected-close'))).some((name) => name.endsWith('.tmp.pdf')), false);

  const rejectedBrowserCloseDirectory = path.join(testRoot, 'rejected-browser-close');
  const rejectedBrowserClose = fakeBrowser({ stalledPdf: true, rejectedClose: true, rejectedBrowserClose: true });
  await assert.rejects(
    renderReport({ browser: rejectedBrowserClose, fixture, outputDir: rejectedBrowserCloseDirectory, variant: 'rejected-browser-close', renderTimeoutMs: 30 }),
    (error) => error.workerTerminationRequired === true && /Browser termination after page teardown failed/.test(error.message),
  );
  assert.equal(rejectedBrowserClose.browserCloseCalls, 1);
  assert.equal(reportLockCount(rejectedBrowserCloseDirectory), 1);
  const blockedRetryAbort = new AbortController();
  setTimeout(() => blockedRetryAbort.abort(new Error('blocked retry cancelled')), 30);
  const blockedRetryBrowser = fakeBrowser();
  await assert.rejects(
    renderReport({ browser: blockedRetryBrowser, fixture, outputDir: rejectedBrowserCloseDirectory, variant: 'rejected-browser-close', signal: blockedRetryAbort.signal }),
    /blocked retry cancelled/,
  );
  assert.equal(blockedRetryBrowser.pages, 0);
  const preservedOwner = readReportLock(rejectedBrowserCloseDirectory, [...withLockDatabase(
    rejectedBrowserCloseDirectory,
    (database) => database.prepare('SELECT report_key FROM report_leases').all(),
  )][0].report_key);
  withLockDatabase(rejectedBrowserCloseDirectory, (database) => database.prepare(`
    UPDATE report_leases
    SET owner_pid = ?, lease_expires_at_ms = 0
    WHERE owner_token = ?
  `).run(2147483647, preservedOwner.owner_token));
  const recoveredAfterWorkerDeath = await renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: rejectedBrowserCloseDirectory,
    variant: 'rejected-browser-close',
    lockStaleMs: 0,
  });
  assert.equal(recoveredAfterWorkerDeath.reused, false);
  assert.equal(reportLockCount(rejectedBrowserCloseDirectory), 0);
  assert.equal((await readdir(rejectedBrowserCloseDirectory)).some((name) => name.endsWith('.tmp.pdf')), false);

  const stalledBrowserCloseDirectory = path.join(testRoot, 'stalled-browser-close');
  const stalledBrowserClose = fakeBrowser({ stalledPdf: true, stalledClose: true, stalledBrowserClose: true });
  const stalledBrowserCloseStartedAt = Date.now();
  await assert.rejects(
    renderReport({
      browser: stalledBrowserClose,
      fixture,
      outputDir: stalledBrowserCloseDirectory,
      variant: 'stalled-browser-close',
      renderTimeoutMs: 30,
      teardownTimeoutMs: 25,
    }),
    (error) => error.workerTerminationRequired === true && /Browser termination after page teardown exceeded 25 ms/.test(error.message),
  );
  assert.equal(Date.now() - stalledBrowserCloseStartedAt < 500, true);
  assert.equal(stalledBrowserClose.browserCloseCalls, 1);
  assert.equal(reportLockCount(stalledBrowserCloseDirectory), 1);

  const heartbeatTakeoverDirectory = path.join(testRoot, 'heartbeat-takeover');
  const heartbeatOwner = renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: heartbeatTakeoverDirectory,
    variant: 'heartbeat-takeover',
    postRenderDelayMs: 1200,
    lockStaleMs: 1000,
  });
  await waitForTemporaryPdf(heartbeatTakeoverDirectory);
  const heartbeatOwnerRow = withLockDatabase(
    heartbeatTakeoverDirectory,
    (database) => database.prepare('SELECT report_key FROM report_leases').get(),
  );
  seedReportLock(heartbeatTakeoverDirectory, heartbeatOwnerRow.report_key, {
    token: 'replacement-owner',
    pid: 2147483647,
    leaseExpiresAtMs: Date.now() + 5000,
  });
  await assert.rejects(heartbeatOwner, /Report ownership lost.*during post-render delay/);
  assert.equal(readReportLock(heartbeatTakeoverDirectory, heartbeatOwnerRow.report_key).owner_token, 'replacement-owner');
  assert.equal((await readdir(heartbeatTakeoverDirectory)).some((name) => name.endsWith('.pdf')), false);

  const heartbeatContentionDirectory = path.join(testRoot, 'heartbeat-contention');
  const heartbeatContentionOwner = renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: heartbeatContentionDirectory,
    variant: 'heartbeat-contention',
    postRenderDelayMs: 3000,
    lockStaleMs: 1000,
  });
  await waitForTemporaryPdf(heartbeatContentionDirectory);
  const heartbeatContentionMarker = path.join(heartbeatContentionDirectory, '.contention-started');
  const heartbeatContentionChild = spawn(process.execPath, [
    path.join(import.meta.dirname, 'sqlite-lock-holder.mjs'),
    path.join(heartbeatContentionDirectory, '.pdf-spike-locks.sqlite'),
    heartbeatContentionMarker,
    '1200',
  ], { stdio: 'ignore' });
  const heartbeatContentionChildClose = new Promise((resolve) => heartbeatContentionChild.once('close', resolve));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await access(heartbeatContentionMarker).then(() => true, () => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(await access(heartbeatContentionMarker).then(() => true, () => false), true);
  await assert.rejects(heartbeatContentionOwner, /Report ownership lost.*during post-render delay/);
  assert.equal(await heartbeatContentionChildClose, 0);
  assert.equal(reportLockCount(heartbeatContentionDirectory), 0);

  const fencedCommitDirectory = path.join(testRoot, 'fenced-commit');
  await mkdir(fencedCommitDirectory);
  const fencedKey = 'fenced-report';
  const fencedTempPath = path.join(fencedCommitDirectory, `${fencedKey}.owner.tmp.pdf`);
  const fencedFinalPath = path.join(fencedCommitDirectory, `${fencedKey}.pdf`);
  const fencedManifestPath = path.join(fencedCommitDirectory, `${fencedKey}.json`);
  await writeFile(fencedTempPath, 'stale owner report');
  seedReportLock(fencedCommitDirectory, fencedKey, {
    token: 'stale-owner',
    pid: process.pid,
    leaseExpiresAtMs: Date.now() + 5000,
  });
  let manifestWriteStartedResolve;
  const manifestWriteStarted = new Promise((resolve) => { manifestWriteStartedResolve = resolve; });
  let resumeManifestWriteResolve;
  const resumeManifestWrite = new Promise((resolve) => { resumeManifestWriteResolve = resolve; });
  const fencedCommit = commitRenderedReportWithLease({
    outputDir: fencedCommitDirectory,
    key: fencedKey,
    ownerToken: 'stale-owner',
    leaseMs: 1000,
    tempPath: fencedTempPath,
    finalPath: fencedFinalPath,
    manifestPath: fencedManifestPath,
    manifest: { inputHash: 'stale-input' },
    signal: new AbortController().signal,
    fileOperations: {
      async writeFile(...argumentsList) {
        await writeFile(...argumentsList);
        manifestWriteStartedResolve();
        await resumeManifestWrite;
      },
    },
  });
  await manifestWriteStarted;
  seedReportLock(fencedCommitDirectory, fencedKey, {
    token: 'new-owner',
    pid: process.pid,
    leaseExpiresAtMs: Date.now() + 5000,
  });
  await writeFile(fencedFinalPath, 'new owner report');
  await writeFile(fencedManifestPath, 'new owner manifest');
  resumeManifestWriteResolve();
  await assert.rejects(fencedCommit, /Report ownership lost/);
  assert.equal(await readFile(fencedFinalPath, 'utf8'), 'new owner report');
  assert.equal(await readFile(fencedManifestPath, 'utf8'), 'new owner manifest');
  assert.equal(readReportLock(fencedCommitDirectory, fencedKey).owner_token, 'new-owner');

  const ownershipDirectory = path.join(testRoot, 'timeout-ownership');
  let delayedWriteObservedLock = false;
  const ownershipBrowser = fakeBrowser({
    stalledPdf: true,
    stalledClose: true,
    browserCloseDelayMs: 80,
    delayedPdfWriteMs: 50,
    onDelayedPdfWrite: async () => {
      delayedWriteObservedLock = reportLockCount(ownershipDirectory) > 0;
    },
  });
  const interruptedOwner = renderReport({
    browser: ownershipBrowser,
    fixture,
    outputDir: ownershipDirectory,
    variant: 'timeout-ownership',
    renderTimeoutMs: 30,
    teardownTimeoutMs: 10,
  });
  await waitForLock(ownershipDirectory);
  const takeoverBrowser = fakeBrowser();
  const takeover = renderReport({
    browser: takeoverBrowser,
    fixture,
    outputDir: ownershipDirectory,
    variant: 'timeout-ownership',
  });
  await assert.rejects(
    interruptedOwner,
    (error) => error.workerTerminationRequired === true && /Browser termination after page teardown exceeded 10 ms/.test(error.message),
  );
  const takeoverResult = await takeover;
  assert.equal(delayedWriteObservedLock, true);
  assert.equal(ownershipBrowser.browserClosed, true);
  assert.equal(takeoverResult.reused, false);
  assert.equal(takeoverBrowser.pages, 1);
  assert.equal(reportLockCount(ownershipDirectory), 0);
  assert.equal((await readdir(ownershipDirectory)).some((name) => name.endsWith('.tmp.pdf')), false);

  const extendedWaitDirectory = path.join(testRoot, 'extended-lock-wait');
  let extendedWaitOwnerToken;
  let delayedWriteKeptOriginalOwner = false;
  const extendedWaitOwner = renderReport({
    browser: fakeBrowser({
      stalledPdf: true,
      stalledClose: true,
      browserCloseDelayMs: 500,
      delayedPdfWriteMs: 1050,
      onDelayedPdfWrite: async () => {
        const row = withLockDatabase(
          extendedWaitDirectory,
          (database) => database.prepare('SELECT owner_token FROM report_leases').get(),
        );
        delayedWriteKeptOriginalOwner = row?.owner_token === extendedWaitOwnerToken;
      },
    }),
    fixture,
    outputDir: extendedWaitDirectory,
    variant: 'extended-lock-wait',
    renderTimeoutMs: 50,
    teardownTimeoutMs: 600,
    lockStaleMs: 1000,
  });
  await waitForLock(extendedWaitDirectory);
  extendedWaitOwnerToken = withLockDatabase(
    extendedWaitDirectory,
    (database) => database.prepare('SELECT owner_token FROM report_leases').get().owner_token,
  );
  const extendedWaitRetryBrowser = fakeBrowser();
  const extendedWaitRetry = renderReport({
    browser: extendedWaitRetryBrowser,
    fixture,
    outputDir: extendedWaitDirectory,
    variant: 'extended-lock-wait',
    renderTimeoutMs: 50,
    teardownTimeoutMs: 600,
    lockStaleMs: 1000,
  });
  await assert.rejects(
    extendedWaitOwner,
    /Report render exceeded 50 ms/,
  );
  assert.equal(delayedWriteKeptOriginalOwner, true);
  assert.equal((await extendedWaitRetry).reused, false);
  assert.equal(extendedWaitRetryBrowser.pages, 1);
  assert.equal(reportLockCount(extendedWaitDirectory), 0);

  const boundedLockWaitDirectory = path.join(testRoot, 'bounded-lock-wait');
  const boundedLockWaitInitial = await renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: boundedLockWaitDirectory,
    variant: 'bounded-lock-report',
  });
  await rm(boundedLockWaitInitial.path, { force: true });
  await rm(path.join(boundedLockWaitDirectory, `${boundedLockWaitInitial.key}.json`), { force: true });
  const boundedLockWaitKey = boundedLockWaitInitial.key;
  seedReportLock(boundedLockWaitDirectory, boundedLockWaitKey, {
    token: 'blocking-owner',
    pid: 2147483647,
    leaseExpiresAtMs: Date.now() + 10000,
  });
  const boundedLockWaitMarker = path.join(boundedLockWaitDirectory, '.contention-started');
  const boundedLockWaitChild = spawn(process.execPath, [
    path.join(import.meta.dirname, 'sqlite-lock-holder.mjs'),
    path.join(boundedLockWaitDirectory, '.pdf-spike-locks.sqlite'),
    boundedLockWaitMarker,
    '5000',
  ], { stdio: 'ignore' });
  const boundedLockWaitChildClose = new Promise((resolve) => boundedLockWaitChild.once('close', resolve));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await access(boundedLockWaitMarker).then(() => true, () => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(await access(boundedLockWaitMarker).then(() => true, () => false), true);
  const boundedLockWaitStartedAt = Date.now();
  await assert.rejects(
    renderReport({
      browser: fakeBrowser(),
      fixture,
      outputDir: boundedLockWaitDirectory,
      variant: 'bounded-lock-report',
      renderTimeoutMs: 20,
      teardownTimeoutMs: 20,
      lockStaleMs: 1000,
    }),
    /Report lock wait exceeded 2060 ms/,
  );
  const boundedLockWaitElapsedMs = Date.now() - boundedLockWaitStartedAt;
  assert.ok(boundedLockWaitElapsedMs < 3000, `Lock wait took ${boundedLockWaitElapsedMs} ms`);
  assert.equal(await boundedLockWaitChildClose, 0);
  assert.equal(lockPollDelayMs(1000, 500), 250);
  assert.equal(lockPollDelayMs(1000, 900), 100);
  assert.equal(lockPollDelayMs(1000, 1000), 0);

  const forcedExitDirectory = path.join(testRoot, 'forced-worker-exit');
  const forcedExit = spawnSync(process.execPath, [
    path.join(import.meta.dirname, 'worker-forced-exit.mjs'),
    forcedExitDirectory,
  ], { encoding: 'utf8', timeout: 2000 });
  assert.equal(forcedExit.status, 70, forcedExit.stderr);
  assert.match(forcedExit.stderr, /forcing renderer worker exit/);

  const stalledLaunchExit = spawnSync(process.execPath, [
    path.join(import.meta.dirname, 'worker-stalled-launch-exit.mjs'),
  ], { encoding: 'utf8', timeout: 2000 });
  assert.equal(stalledLaunchExit.status, 70, stalledLaunchExit.stderr);
  assert.match(stalledLaunchExit.stderr, /browser launch state is unknown; forcing renderer worker exit/);

  const timeoutResourcesBefore = process.getActiveResourcesInfo().filter((name) => name === 'Timeout').length;
  const fastCloseBrowser = fakeBrowser();
  await renderReport({ browser: fastCloseBrowser, fixture, outputDir: path.join(testRoot, 'fast-close'), variant: 'fast-close', teardownTimeoutMs: 10000 });
  await new Promise((resolve) => setImmediate(resolve));
  const timeoutResourcesAfter = process.getActiveResourcesInfo().filter((name) => name === 'Timeout').length;
  assert.equal(timeoutResourcesAfter, timeoutResourcesBefore);
  assert.equal(fastCloseBrowser.browserCloseCalls, 0);

  const lockBrowser = fakeBrowser();
  const lockDirectory = path.join(testRoot, 'lock');
  await mkdir(lockDirectory, { recursive: true });
  const owner = renderReport({ browser: lockBrowser, fixture, outputDir: lockDirectory, variant: 'same-report', postRenderDelayMs: 100 });
  await waitForTemporaryPdf(lockDirectory);
  const duplicate = renderReport({ browser: lockBrowser, fixture, outputDir: lockDirectory, variant: 'same-report' });
  const results = await Promise.all([owner, duplicate]);
  assert.deepEqual(results.map(({ reused }) => reused).sort(), [false, true]);
  assert.equal(lockBrowser.pages, 1);
  assert.equal(results[0].key, results[1].key);
  assert.equal(results[0].path, results[1].path);

  const staleDirectory = path.join(testRoot, 'stale-lock');
  const initialStaleResult = await renderReport({ browser: fakeBrowser(), fixture, outputDir: staleDirectory, variant: 'stale-lock' });
  await rm(initialStaleResult.path, { force: true });
  await rm(path.join(staleDirectory, `${initialStaleResult.key}.json`), { force: true });
  seedReportLock(staleDirectory, initialStaleResult.key, { token: 'terminated-owner', pid: 2147483647 });
  await writeFile(path.join(staleDirectory, `${initialStaleResult.key}.terminated.tmp.pdf`), 'partial');
  await writeFile(path.join(staleDirectory, `${initialStaleResult.key}.json.terminated.tmp`), 'partial manifest');
  const recoveredStaleResult = await renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: staleDirectory,
    variant: 'stale-lock',
    lockStaleMs: 5000,
  });
  assert.equal(recoveredStaleResult.reused, false);
  assert.equal(reportLockCount(staleDirectory), 0);
  assert.equal((await readdir(staleDirectory)).some((name) => name.endsWith('.tmp.pdf') || name.endsWith('.tmp')), false);

  const reusedPidDirectory = path.join(testRoot, 'reused-pid');
  const reusedPidInitial = await renderReport({ browser: fakeBrowser(), fixture, outputDir: reusedPidDirectory, variant: 'reused-pid' });
  await rm(reusedPidInitial.path, { force: true });
  await rm(path.join(reusedPidDirectory, `${reusedPidInitial.key}.json`), { force: true });
  seedReportLock(reusedPidDirectory, reusedPidInitial.key, {
    token: 'reused-pid-owner',
    pid: process.pid,
    leaseExpiresAtMs: 0,
  });
  const reusedPidRecovery = await renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: reusedPidDirectory,
    variant: 'reused-pid',
    lockStaleMs: 0,
  });
  assert.equal(reusedPidRecovery.reused, false);
  assert.equal(reportLockCount(reusedPidDirectory), 0);

  const transactionCrashDirectory = path.join(testRoot, 'transaction-crash');
  const transactionCrashInitial = await renderReport({ browser: fakeBrowser(), fixture, outputDir: transactionCrashDirectory, variant: 'transaction-crash' });
  await rm(transactionCrashInitial.path, { force: true });
  await rm(path.join(transactionCrashDirectory, `${transactionCrashInitial.key}.json`), { force: true });
  const transactionMarker = path.join(transactionCrashDirectory, '.transaction-started');
  const transactionChild = spawn(process.execPath, [
    path.join(import.meta.dirname, 'sqlite-lock-crash.mjs'),
    path.join(transactionCrashDirectory, '.pdf-spike-locks.sqlite'),
    transactionCrashInitial.key,
    transactionMarker,
  ], { stdio: 'ignore' });
  const transactionChildClose = new Promise((resolve) => transactionChild.once('close', resolve));
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (await access(transactionMarker).then(() => true, () => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(await access(transactionMarker).then(() => true, () => false), true);
  transactionChild.kill('SIGKILL');
  await transactionChildClose;
  const transactionRecovery = await renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: transactionCrashDirectory,
    variant: 'transaction-crash',
    lockStaleMs: 0,
  });
  assert.equal(transactionRecovery.reused, false);
  assert.equal(reportLockCount(transactionCrashDirectory), 0);

  const committedStaleDirectory = path.join(testRoot, 'committed-stale-lock');
  const committedResult = await renderReport({ browser: fakeBrowser(), fixture, outputDir: committedStaleDirectory, variant: 'committed-stale-lock' });
  seedReportLock(committedStaleDirectory, committedResult.key, { token: 'terminated-after-commit', pid: 2147483647 });
  await writeFile(path.join(committedStaleDirectory, `${committedResult.key}.json.terminated.tmp`), 'partial manifest');
  const reusedCommittedResult = await renderReport({
    browser: fakeBrowser(),
    fixture,
    outputDir: committedStaleDirectory,
    variant: 'committed-stale-lock',
    lockStaleMs: 5000,
  });
  assert.equal(reusedCommittedResult.reused, true);
  assert.equal(reusedCommittedResult.pdfSha256, committedResult.pdfSha256);
  assert.equal(reusedCommittedResult.bytes, committedResult.bytes);
  assert.equal(reusedCommittedResult.inputHash, committedResult.inputHash);
  assert.equal(reportLockCount(committedStaleDirectory), 0);
  assert.equal((await readdir(committedStaleDirectory)).some((name) => name.endsWith('.tmp')), false);

  for (const interruptedOperation of ['manifest-write', 'pdf-publish', 'manifest-publish']) {
    const commitDirectory = path.join(testRoot, `commit-${interruptedOperation}`);
    await mkdir(commitDirectory);
    const tempPath = path.join(commitDirectory, 'report.tmp.pdf');
    const finalPath = path.join(commitDirectory, 'report.pdf');
    const manifestPath = path.join(commitDirectory, 'report.json');
    await writeFile(tempPath, 'complete report');
    const commitAbort = new AbortController();
    let renameCount = 0;
    const interrupt = () => commitAbort.abort(new Error(`interrupted during ${interruptedOperation}`));
    await assert.rejects(commitRenderedReport({
      tempPath,
      finalPath,
      manifestPath,
      manifest: { inputHash: 'test-input' },
      signal: commitAbort.signal,
      fileOperations: {
        async writeFile(...argumentsList) {
          await writeFile(...argumentsList);
          if (interruptedOperation === 'manifest-write') interrupt();
        },
        async rename(...argumentsList) {
          await rename(...argumentsList);
          renameCount += 1;
          if (interruptedOperation === 'pdf-publish' && renameCount === 1) interrupt();
          if (interruptedOperation === 'manifest-publish' && renameCount === 2) interrupt();
        },
        rm,
      },
    }), new RegExp(`interrupted during ${interruptedOperation}`));
    assert.deepEqual(await readdir(commitDirectory), []);
  }

  assert.equal(singleRenderMemoryWithinLimit({ peakRssMiB: 1600 }, { peakRssMiB: 800 }, 1536), false);
  assert.equal(singleRenderMemoryWithinLimit({ peakRssMiB: 700 }, { peakRssMiB: 800 }, 1536), true);
  assert.equal(
    Math.round(calculateIntervalCpuPercent(new Map([[1, 1000], [2, 200]]), new Map([[1, 1250], [2, 250], [3, 50]]), 100)),
    300,
  );
  const failedProcessMonitor = createProcessMonitor({
    rootPid: 123,
    processSnapshot: () => { throw new Error('simulated ps failure'); },
    setIntervalFn: () => Symbol('timer'),
    clearIntervalFn: () => {},
  });
  assert.throws(() => failedProcessMonitor(), /Process metric sampling failed; benchmark evidence is invalid/);
  const bufferedWorker = new EventEmitter();
  bufferedWorker.stdout = new PassThrough();
  bufferedWorker.stderr = new PassThrough();
  const bufferedResultPromise = collectWorkerResult(bufferedWorker, ['--buffered-test']);
  let bufferedResultSettled = false;
  bufferedResultPromise.finally(() => { bufferedResultSettled = true; });
  bufferedWorker.stdout.write('{"buffered":');
  bufferedWorker.emit('exit', 0, null);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(bufferedResultSettled, false);
  bufferedWorker.stdout.end('true}\n');
  bufferedWorker.stderr.end();
  bufferedWorker.emit('close', 0, null);
  assert.deepEqual(await bufferedResultPromise, { code: 0, signal: null, result: { buffered: true } });

  const invalidWorker = new EventEmitter();
  invalidWorker.stdout = new PassThrough();
  invalidWorker.stderr = new PassThrough();
  const invalidResultPromise = collectWorkerResult(invalidWorker, ['--invalid-test']);
  invalidWorker.stdout.end('not json\n');
  invalidWorker.stderr.end('diagnostic');
  invalidWorker.emit('close', 0, null);
  await assert.rejects(invalidResultPromise, /worker returned invalid JSON.*diagnostic/);
  assert.deepEqual(evaluatePdfInspection({
    pageCount: 31,
    imageCount: 60,
    expectedContentPresent: true,
    notoSansEmbedded: true,
  }, fixture), {
    expectedPageCount: true,
    expectedPageContent: true,
    expectedPhotoCount: true,
    embeddedNotoSans: true,
  });
  assert.equal(evaluatePdfInspection({
    pageCount: 1,
    imageCount: 0,
    expectedContentPresent: false,
    notoSansEmbedded: false,
  }, fixture).expectedPageCount, false);
  let failedMonitorStopped = false;
  await assert.rejects(
    runMeasured('failure-cleanup', async () => { throw new Error('expected operation failure'); }, () => () => { failedMonitorStopped = true; }),
    /expected operation failure/,
  );
  assert.equal(failedMonitorStopped, true);
} finally {
  await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

for (const script of ['render-core.mjs', 'render.mjs', 'pdf-inspection.mjs', 'benchmark-support.mjs', 'benchmark.mjs', 'sqlite-lock-crash.mjs', 'sqlite-lock-holder.mjs', 'worker-forced-exit.mjs', 'worker-stalled-launch-exit.mjs']) {
  const result = spawnSync(process.execPath, ['--check', path.join(import.meta.dirname, script)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
console.log('pdf-spike check passed');
