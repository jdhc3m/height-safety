import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { evaluatePdfInspection } from '../../../tools/pdf-spike/benchmark-support.mjs';
import { inspectReportPdf } from '../../../tools/pdf-spike/pdf-inspection.mjs';
import { loadFixture, ROOT } from '../../../tools/pdf-spike/render-core.mjs';

const FIXTURE_PATH = path.join(ROOT, 'fixtures/reports/representative-photo-heavy-report.json');
const BENCHMARK_PATH = path.join(ROOT, 'tools/pdf-spike/benchmark.mjs');
const RENDER_PATH = path.join(ROOT, 'tools/pdf-spike/render.mjs');
const METADATA_TOKEN_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const PROCESS_STARTED_AT = Date.now();

export function validateJob(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'request body must be an object');
  assert.deepEqual(Object.keys(value).sort(), ['enqueuedAt', 'jobId', 'mode'], 'request body accepts only enqueuedAt, jobId and mode');
  assert.match(value.jobId, /^(exercise|termination)-[a-z0-9-]{1,48}$/, 'jobId must identify a fictional spike job');
  assert(['benchmark', 'terminate-once'].includes(value.mode), 'mode must be benchmark or terminate-once');
  assert(Number.isSafeInteger(value.enqueuedAt) && value.enqueuedAt > 0, 'enqueuedAt must be an epoch millisecond');
  if (value.mode === 'benchmark') assert.match(value.jobId, /^exercise-/, 'benchmark jobs use the exercise prefix');
  if (value.mode === 'terminate-once') assert.match(value.jobId, /^termination-/, 'termination jobs use the termination prefix');
  return { jobId: value.jobId, mode: value.mode, enqueuedAt: value.enqueuedAt };
}

export function sanitizeEvidence(value) {
  const text = JSON.stringify(value);
  assert.doesNotMatch(text, /(?:authorization|access[_-]?token|private[_-]?key|client[_-]?secret|signedurl|x-goog-signature|ya29\.|\/Users\/|\/tmp\/|@[a-z0-9.-]+\.[a-z]{2,}|projects\/)/i, 'evidence contains a forbidden identifier, path or credential');
  return value;
}

function assertAllowedKeys(value, allowed, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${label} contains unexpected keys`);
}

function summariseResult(result) {
  assertAllowedKeys(result, ['bytes', 'generationDate', 'inputHash', 'key', 'path', 'pdfSha256', 'renderer', 'reused', 'templateVersion'], 'render result');
  return { bytes: result.bytes, pdfSha256: result.pdfSha256, reused: result.reused };
}

function summariseBenchmark(benchmark) {
  return {
    runtime: {
      platform: benchmark.platform,
      node: benchmark.node,
      availableCpuCount: benchmark.availableCpuCount,
      totalMemoryMiB: benchmark.totalMemoryMiB,
      cgroupCpuLimit: benchmark.cgroupCpuLimit,
      cgroupMemoryLimitMiB: benchmark.cgroupMemoryLimitMiB,
      candidateProfile: benchmark.candidateProfile,
      rendererConcurrency: benchmark.rendererConcurrency,
      playwright: benchmark.playwright,
      chromium: benchmark.chromium,
    },
    fixture: benchmark.fixture,
    limits: benchmark.limits,
    scenarios: benchmark.scenarios.map(({ name, durationMs, peakRssMiB, peakIntervalCpuPercent }) => ({ name, durationMs, peakRssMiB, peakIntervalCpuPercent })),
    acceptance: benchmark.acceptance,
    interruption: {
      temporaryPdfObserved: benchmark.interruption.temporaryPdfObserved,
      retryStartedBeforeInterruption: benchmark.interruption.retryStartedBeforeInterruption,
      interruptedExit: benchmark.interruption.interruptedExit,
      retry: summariseResult(benchmark.interruption.retry),
      reuse: summariseResult(benchmark.interruption.reuse),
    },
    deterministicRegeneration: {
      first: summariseResult(benchmark.deterministicRegeneration.first),
      second: summariseResult(benchmark.deterministicRegeneration.second),
    },
    artifactDirectoryBytes: benchmark.artifactDirectoryBytes,
  };
}

function killProcessTree(child, signal = 'SIGKILL') {
  if (!child?.pid) return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    child.kill(signal);
  }
}

function runNode(argumentsList, { environment = {}, timeoutMs = 240000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argumentsList, {
      cwd: ROOT,
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => killProcessTree(child), timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`renderer process failed (code=${code}, signal=${signal ?? 'none'}): ${stderr.slice(-1000)}`));
    });
  });
}

async function metadataAccessToken(fetchFn = fetch) {
  const response = await fetchFn(METADATA_TOKEN_URL, { headers: { 'Metadata-Flavor': 'Google' } });
  if (!response.ok) throw new Error(`metadata token request failed with ${response.status}`);
  const token = await response.json();
  assert.equal(typeof token.access_token, 'string');
  return token.access_token;
}

function objectMetadataUrl(bucket, objectName) {
  return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`;
}

export async function objectExists(bucket, objectName, fetchFn = fetch) {
  return (await objectMetadata(bucket, objectName, fetchFn)) !== null;
}

export async function objectMetadata(bucket, objectName, fetchFn = fetch) {
  const token = await metadataAccessToken(fetchFn);
  const response = await fetchFn(objectMetadataUrl(bucket, objectName), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`object metadata request failed with ${response.status}`);
  return response.json();
}

export async function createObject(bucket, objectName, contentType, bytes, _metadata = {}, fetchFn = fetch) {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const md5Hash = createHash('md5').update(bytes).digest('base64');
  const token = await metadataAccessToken(fetchFn);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(objectName)}`;
  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'Content-MD5': md5Hash,
    },
    body: bytes,
  });
  if (response.status === 412) {
    const committed = await objectMetadata(bucket, objectName, fetchFn);
    assert(committed, 'create-only conflict did not resolve to an existing object');
    assert.equal(Number(committed.size), bytes.length, 'committed object size differs from the retry bytes');
    assert.equal(committed.md5Hash, md5Hash, 'committed object hash differs from the retry bytes');
    return { created: false, generation: committed.generation, sha256 };
  }
  if (!response.ok) throw new Error(`object upload failed with ${response.status}`);
  const committed = await response.json();
  return { created: true, generation: committed.generation, sha256 };
}

async function runBenchmark() {
  const runRoot = await mkdtemp('/tmp/height-safety-benchmark-');
  try {
    const { stdout } = await runNode([BENCHMARK_PATH], {
      environment: { PDF_SPIKE_CONCURRENCY: '1', PDF_SPIKE_CANDIDATE_PROFILE: 'cloud-run-2vcpu-2g', PDF_SPIKE_RUN_ROOT: runRoot },
    });
    const summary = JSON.parse(stdout);
    const benchmark = JSON.parse(await readFile(summary.resultPath, 'utf8'));
    assert.equal(Object.values(benchmark.acceptance).includes(false), false, 'benchmark acceptance failed');
    const warm = benchmark.scenarios.find(({ name }) => name === 'warm-single');
    assert(warm?.value?.path, 'benchmark did not produce a warm report');
    return { benchmark: summariseBenchmark(benchmark), reportBytes: await readFile(warm.value.path) };
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
}

async function waitForTemporaryPdf(directory) {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    if ((await readdir(directory).catch(() => [])).some((name) => name.endsWith('.tmp.pdf'))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('termination probe did not observe a temporary PDF');
}

async function runTerminationProbe({ bucket, jobId, runId }) {
  const markerObject = `control/${runId}/${jobId}-termination-observed.json`;
  if (!await objectExists(bucket, markerObject)) {
    const outputDir = await mkdtemp('/tmp/height-safety-termination-');
    const child = spawn(process.execPath, [
      RENDER_PATH,
      `--fixture=${FIXTURE_PATH}`,
      `--output-dir=${outputDir}`,
      `--variant=${jobId}`,
      '--post-render-delay-ms=30000',
    ], { cwd: ROOT, env: process.env, stdio: 'ignore', detached: process.platform !== 'win32' });
    await waitForTemporaryPdf(outputDir);
    await createObject(bucket, markerObject, 'application/json', Buffer.from(`${JSON.stringify({ observed: true })}\n`), { runId });
    killProcessTree(child);
    process.kill(process.pid, 'SIGKILL');
    throw new Error('instance termination was not immediate');
  }

  const outputDir = await mkdtemp('/tmp/height-safety-recovery-');
  try {
    const { stdout } = await runNode([
      RENDER_PATH,
      `--fixture=${FIXTURE_PATH}`,
      `--output-dir=${outputDir}`,
      `--variant=${jobId}`,
    ]);
    const result = JSON.parse(stdout);
    const fixture = await loadFixture(FIXTURE_PATH);
    const inspection = await inspectReportPdf(result.path, fixture);
    const acceptance = evaluatePdfInspection(inspection, fixture);
    assert.equal(Object.values(acceptance).includes(false), false, 'recovered PDF inspection failed');
    return { result, inspection, acceptance, reportBytes: await readFile(result.path) };
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

export async function executeJob(job, { bucket = process.env.SPIKE_BUCKET, runId = process.env.SPIKE_RUN_ID } = {}) {
  assert.match(bucket ?? '', /^hs2d04-[a-z0-9]{8}-[0-9]{6,}-private$/, 'SPIKE_BUCKET is not a bounded spike bucket');
  assert.match(runId ?? '', /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/, 'SPIKE_RUN_ID is not a bounded immutable run identifier');
  const startedAt = Date.now();
  const reportObject = `reports/${runId}/${job.jobId}.pdf`;
  const evidenceObject = `evidence/${runId}/${job.jobId}.json`;
  const existingEvidence = await objectMetadata(bucket, evidenceObject);
  if (existingEvidence) {
    return { jobId: job.jobId, mode: job.mode, reportObject, evidenceObject, reportCreated: false, evidenceReused: true };
  }
  let evidence;
  let reportBytes;
  if (job.mode === 'benchmark') {
    const result = await runBenchmark();
    evidence = { benchmark: result.benchmark };
    reportBytes = result.reportBytes;
  } else {
    const result = await runTerminationProbe({ bucket, jobId: job.jobId, runId });
    evidence = { terminationRecovery: { result: summariseResult(result.result), acceptance: result.acceptance } };
    reportBytes = result.reportBytes;
  }

  const reportSha256 = createHash('sha256').update(reportBytes).digest('hex');
  const reportUpload = await createObject(bucket, reportObject, 'application/pdf', reportBytes, { runId });
  const completedAt = Date.now();
  const processStartedAfterEnqueue = PROCESS_STARTED_AT >= job.enqueuedAt && PROCESS_STARTED_AT <= startedAt;
  const sanitised = sanitizeEvidence({
    schemaVersion: '1.0.0',
    ticket: '2D-04',
    candidate: 'cloud-run',
    region: process.env.SPIKE_REGION,
    runId,
    jobId: job.jobId,
    mode: job.mode,
    rendererConcurrency: 1,
    timing: {
      enqueuedAt: job.enqueuedAt,
      processStartedAt: PROCESS_STARTED_AT,
      requestStartedAt: startedAt,
      completedAt,
      enqueueToProcessStartMs: Math.max(0, PROCESS_STARTED_AT - job.enqueuedAt),
      processStartToRequestMs: Math.max(0, startedAt - PROCESS_STARTED_AT),
      requestExecutionMs: completedAt - startedAt,
      endToEndMs: completedAt - job.enqueuedAt,
    },
    platformColdProbe: process.env.SPIKE_PLATFORM_COLD_TOKEN === job.jobId && processStartedAfterEnqueue,
    cpuStartupBoost: false,
    report: {
      object: reportObject,
      bytes: reportBytes.length,
      sha256: reportSha256,
      uploadSha256: reportUpload.sha256,
      created: reportUpload.created,
      generation: reportUpload.generation,
    },
    ...evidence,
  });
  await createObject(bucket, evidenceObject, 'application/json', Buffer.from(`${JSON.stringify(sanitised, null, 2)}\n`), { runId });
  return { jobId: job.jobId, mode: job.mode, reportObject, evidenceObject, reportCreated: reportUpload.created };
}
