import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { availableParallelism, cpus, totalmem } from 'node:os';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';
import {
  collectWorkerResult,
  createProcessMonitor,
  evaluatePdfInspection,
  runMeasured,
  singleRenderMemoryWithinLimit,
} from './benchmark-support.mjs';
import { inspectReportPdf } from './pdf-inspection.mjs';
import { closeBrowserBounded, directoryBytes, launchBrowser, loadFixture, readReportLock, renderReport, ROOT } from './render-core.mjs';

const fixturePath = path.join(ROOT, 'fixtures/reports/representative-photo-heavy-report.json');
const runRoot = process.env.PDF_SPIKE_RUN_ROOT
  ? path.resolve(process.env.PDF_SPIKE_RUN_ROOT)
  : path.join(ROOT, '.tools/pdf-spike');
await mkdir(runRoot, { recursive: true });
const outputDir = await mkdtemp(path.join(runRoot, 'run-'));
const fixture = await loadFixture(fixturePath);
const concurrency = Number(process.env.PDF_SPIKE_CONCURRENCY ?? '2');
if (![1, 2].includes(concurrency)) {
  throw new Error('PDF_SPIKE_CONCURRENCY must be 1 or 2');
}
const candidateProfile = process.env.PDF_SPIKE_CANDIDATE_PROFILE || undefined;

function readCgroupLimit(filePath) {
  try {
    const value = readFileSync(filePath, 'utf8').trim();
    if (value === 'max') return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  } catch {
    return undefined;
  }
}

function cgroupCpuLimit() {
  try {
    const [quota, period] = readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(/\s+/);
    if (quota === 'max') return undefined;
    const limit = Number(quota) / Number(period);
    return Number.isFinite(limit) ? limit : undefined;
  } catch {
    return undefined;
  }
}

const linuxClockTicks = process.platform === 'linux'
  ? Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim())
  : undefined;

function parsePsCpuTime(value) {
  const [dayPart, clockPart = dayPart] = value.includes('-') ? value.split('-', 2) : [undefined, value];
  const parts = clockPart.split(':').map(Number);
  const seconds = parts.pop() ?? 0;
  const minutes = parts.pop() ?? 0;
  const hours = parts.pop() ?? 0;
  return (((Number(dayPart ?? 0) * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

function linuxCpuTimeMs(pid, fallback) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return ((Number(fields[11]) + Number(fields[12])) / linuxClockTicks) * 1000;
  } catch {
    return fallback;
  }
}

function processSnapshot(rootPid) {
  const output = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,time='], { encoding: 'utf8' });
  if (!output.trim()) throw new Error('ps returned no process metrics');
  const rows = output.trim().split('\n').map((line) => {
    const [pid, ppid, rssKiB, cpuTime] = line.trim().split(/\s+/);
    const fallbackCpuTimeMs = parsePsCpuTime(cpuTime);
    const row = {
      pid: Number(pid),
      ppid: Number(ppid),
      rssKiB: Number(rssKiB),
      cpuTimeMs: process.platform === 'linux' ? linuxCpuTimeMs(pid, fallbackCpuTimeMs) : fallbackCpuTimeMs,
    };
    if (Object.values(row).some((value) => !Number.isFinite(value))) {
      throw new Error(`Unable to parse process metrics: ${line.trim()}`);
    }
    return row;
  });
  const descendants = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { pid, ppid } of rows) if (descendants.has(ppid) && !descendants.has(pid)) { descendants.add(pid); changed = true; }
  }
  return rows.filter(({ pid }) => descendants.has(pid));
}

function monitor(rootPid = process.pid) {
  return createProcessMonitor({ rootPid, processSnapshot });
}

const activeChildren = new Set();

function trackChild(child) {
  activeChildren.add(child);
  child.once('exit', () => activeChildren.delete(child));
  return child;
}

async function terminateActiveChildren() {
  const children = [...activeChildren];
  for (const child of children) child.kill('SIGTERM');
  await Promise.all(children.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const forceTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => {
      clearTimeout(forceTimer);
      resolve();
    });
  })));
}

function runWorker(argumentsList) {
  const child = trackChild(spawn(process.execPath, [path.join(import.meta.dirname, 'render.mjs'), ...argumentsList], { stdio: ['ignore', 'pipe', 'pipe'] }));
  return collectWorkerResult(child, argumentsList);
}

async function runBenchmark() {
  const scenarios = [];
  let sharedBrowser;
  let deterministicRegeneration;
  try {
    const coldStop = monitor();
    const coldStarted = performance.now();
    let coldValue;
    let coldMeasurements;
    try {
      sharedBrowser = await launchBrowser();
      coldValue = await renderReport({ browser: sharedBrowser, fixture, outputDir, variant: 'cold-single' });
    } finally {
      coldMeasurements = coldStop();
    }
    scenarios.push({ name: 'cold-single', durationMs: Math.round(performance.now() - coldStarted), ...coldMeasurements, value: coldValue });
    scenarios.push(await runMeasured('warm-single', () => renderReport({ browser: sharedBrowser, fixture, outputDir, variant: 'warm-single' }), monitor));
    const deterministicDirectories = [path.join(outputDir, 'determinism-a'), path.join(outputDir, 'determinism-b')];
    deterministicRegeneration = await Promise.all(deterministicDirectories.map((directory) => renderReport({ browser: sharedBrowser, fixture, outputDir: directory, variant: 'fresh-regeneration' })));
    scenarios.push(await runMeasured(
      `shared-browser-concurrency-${concurrency}`,
      () => Promise.all(Array.from({ length: concurrency }, (_, index) => index + 1).map((number) => renderReport({
        browser: sharedBrowser,
        fixture,
        outputDir,
        variant: `shared-${number}`,
      }))),
      monitor,
    ));
  } finally {
    await closeBrowserBounded(sharedBrowser, 5000, 'Shared benchmark browser termination');
  }
  scenarios.push(await runMeasured(`isolated-worker-concurrency-${concurrency}`, () => Promise.all(Array.from({ length: concurrency }, (_, index) => index + 1).map((number) => runWorker([`--fixture=${fixturePath}`, `--output-dir=${outputDir}`, `--variant=worker-${number}`]))), monitor));

  const interruptedVariant = 'interrupted-retry';
  const interrupted = trackChild(spawn(process.execPath, [path.join(import.meta.dirname, 'render.mjs'), `--fixture=${fixturePath}`, `--output-dir=${outputDir}`, `--variant=${interruptedVariant}`, '--post-render-delay-ms=30000'], { stdio: 'ignore' }));
  const interruptedExitPromise = new Promise((resolve) => interrupted.on('exit', (code, signal) => resolve({ code, signal })));
  let temporaryPdfObserved = false;
  for (let attempt = 0; attempt < 600; attempt++) {
    temporaryPdfObserved = (await readdir(outputDir)).some((name) => name.endsWith('.tmp.pdf'));
    if (temporaryPdfObserved) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!temporaryPdfObserved) throw new Error('Interrupted-render fixture never produced a temporary PDF');
  const contentionMarker = path.join(outputDir, '.retry-lock-contention');
  const retryPromise = runWorker([`--fixture=${fixturePath}`, `--output-dir=${outputDir}`, `--variant=${interruptedVariant}`, `--contention-marker=${contentionMarker}`]);
  let contentionObserved = false;
  for (let attempt = 0; attempt < 450; attempt++) {
    contentionObserved = await access(contentionMarker).then(() => true, () => false);
    if (contentionObserved) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!contentionObserved) throw new Error('Retry worker did not reach lock contention before interruption');
  interrupted.kill('SIGTERM');
  const interruptedExit = await interruptedExitPromise;
  const retry = await retryPromise;
  await rm(contentionMarker, { force: true });
  const reuse = await runWorker([`--fixture=${fixturePath}`, `--output-dir=${outputDir}`, `--variant=${interruptedVariant}`]);
  const names = await readdir(outputDir);

  const cgroupMemoryLimitBytes = readCgroupLimit('/sys/fs/cgroup/memory.max');
  const cgroupMemoryLimitMiB = cgroupMemoryLimitBytes === undefined
    ? undefined
    : Math.floor(cgroupMemoryLimitBytes / 1024 / 1024);
  const limits = {
    warmDurationMs: 60000,
    singlePeakRssMiB: 1536,
    concurrencyPeakRssMiB: Math.min(3072, cgroupMemoryLimitMiB ?? 3072),
    outputBytes: 25 * 1024 * 1024,
  };
  const cold = scenarios.find(({ name }) => name === 'cold-single');
  const warm = scenarios.find(({ name }) => name === 'warm-single');
  const shared = scenarios.find(({ name }) => name === `shared-browser-concurrency-${concurrency}`);
  const outputBytes = warm.value.bytes;
  const pdfInspection = await inspectReportPdf(warm.value.path, fixture);
  const acceptance = {
    warmDuration: warm.durationMs <= limits.warmDurationMs,
    singleMemory: singleRenderMemoryWithinLimit(cold, warm, limits.singlePeakRssMiB),
    concurrencyMemory: shared.peakRssMiB <= limits.concurrencyPeakRssMiB,
    outputSize: outputBytes <= limits.outputBytes,
    ...evaluatePdfInspection(pdfInspection, fixture),
    interruptedExitExpected: interruptedExit.signal === 'SIGTERM' || interruptedExit.code === 143,
    interruptedRecoveryClean: !readReportLock(outputDir, retry.result.key)
      && !names.some((name) => name.endsWith('.tmp.pdf') || /\.json\..+\.tmp$/.test(name) || name.endsWith('.lock')),
    retryCompleted: retry.result.reused === false,
    completedRetryReused: reuse.result.reused === true,
    freshRegenerationByteStable: deterministicRegeneration[0].pdfSha256 === deterministicRegeneration[1].pdfSha256,
  };
  let versionBrowser;
  let chromiumVersion;
  try {
    versionBrowser = await chromium.launch();
    chromiumVersion = await versionBrowser.version();
  } finally {
    await closeBrowserBounded(versionBrowser, 5000, 'Version-probe browser termination');
  }
  const results = {
    generatedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version,
    cpuCount: cpus().length, availableCpuCount: availableParallelism(), totalMemoryMiB: Math.round(totalmem() / 1024 / 1024),
    cgroupCpuLimit: cgroupCpuLimit(), cgroupMemoryLimitMiB, candidateProfile, rendererConcurrency: concurrency,
    playwright: '1.62.1', chromium: chromiumVersion,
    fixture: { anchorCount: fixture.anchorCount, photoCount: fixture.anchorCount * fixture.photosPerAnchor, photoDimensions: `${fixture.photoWidth}x${fixture.photoHeight}`, jurisdiction: fixture.jurisdiction },
    limits, scenarios, pdfInspection, interruption: { temporaryPdfObserved, retryStartedBeforeInterruption: contentionObserved, interruptedExit, retry: retry.result, reuse: reuse.result },
    deterministicRegeneration: { first: deterministicRegeneration[0], second: deterministicRegeneration[1] },
    artifactDirectoryBytes: await directoryBytes(outputDir), acceptance,
  };
  const resultPath = path.join(outputDir, 'benchmark-results.json');
  await writeFile(resultPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ resultPath, acceptance, scenarios: scenarios.map(({ name, durationMs, peakRssMiB, peakIntervalCpuPercent }) => ({ name, durationMs, peakRssMiB, peakIntervalCpuPercent })) }, null, 2));
  if (Object.values(acceptance).includes(false)) process.exitCode = 1;
}

try {
  await runBenchmark();
} finally {
  await terminateActiveChildren();
}
