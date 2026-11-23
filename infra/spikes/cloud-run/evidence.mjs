import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const STATE = path.join(ROOT, '.tools/provider-spike');
const CONTEXT = path.join(STATE, 'context.json');
const OUTPUT = path.join(ROOT, 'docs/roadmap/STAGE_2D_04_MANAGED_EVIDENCE.json');

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function forbidden(value) {
  const text = JSON.stringify(value);
  return /(?:ya29\.|signedurl|x-goog-signature|authorization.*bearer|private[_-]?key|client[_-]?secret|access[_-]?token|@[a-z0-9.-]+\.[a-z]{2,}|projects\/[a-z0-9_-]+|\/Users\/|\/tmp\/)/i.test(text);
}

export function assertExactKeys(value, allowed, label = 'object') {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${label} contains unexpected keys`);
}

function assertBooleanMap(value, allowed, label) {
  assertExactKeys(value, allowed, label);
  assert.equal(Object.values(value).every((item) => typeof item === 'boolean'), true, `${label} values must be boolean`);
}

function validateReport(report, runId, jobId) {
  assertExactKeys(report, ['object', 'bytes', 'sha256', 'uploadSha256', 'created', 'generation'], 'report');
  assert.equal(report.object, `reports/${runId}/${jobId}.pdf`);
  assert(Number.isSafeInteger(report.bytes) && report.bytes > 0);
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
  assert.equal(report.sha256, report.uploadSha256);
  assert.equal(typeof report.created, 'boolean');
  assert.match(report.generation, /^[0-9]+$/);
}

function validateTiming(timing, expectCold) {
  assertExactKeys(timing, ['enqueuedAt', 'processStartedAt', 'requestStartedAt', 'completedAt', 'enqueueToProcessStartMs', 'processStartToRequestMs', 'requestExecutionMs', 'endToEndMs'], 'timing');
  assert.equal(Object.values(timing).every((value) => Number.isSafeInteger(value) && value >= 0), true);
  if (expectCold && timing.processStartedAt < timing.enqueuedAt) {
    assert.equal(timing.enqueueToProcessStartMs, 0, 'revision health-check may start before enqueue; queued delay must then be zero');
  }
  assert(timing.processStartedAt <= timing.requestStartedAt);
  assert(timing.requestStartedAt <= timing.completedAt);
  assert.equal(timing.completedAt - timing.enqueuedAt, timing.endToEndMs);
}

function validateRenderSummary(value, label) {
  assertExactKeys(value, ['bytes', 'pdfSha256', 'reused'], label);
  assert(Number.isSafeInteger(value.bytes) && value.bytes > 0);
  assert.match(value.pdfSha256, /^[a-f0-9]{64}$/);
  assert.equal(typeof value.reused, 'boolean');
}

function validateBenchmarkRuntime(runtime) {
  const optional = new Set(['cgroupCpuLimit', 'cgroupMemoryLimitMiB']);
  const required = ['platform', 'node', 'availableCpuCount', 'totalMemoryMiB', 'candidateProfile', 'rendererConcurrency', 'playwright', 'chromium'];
  assert(runtime && typeof runtime === 'object' && !Array.isArray(runtime), 'benchmark runtime must be an object');
  const extra = Object.keys(runtime).filter((key) => !required.includes(key) && !optional.has(key));
  assert.deepEqual(extra, [], 'benchmark runtime contains unexpected keys');
  for (const key of required) assert(key in runtime, `benchmark runtime missing ${key}`);
  for (const key of optional) {
    if (key in runtime) assert(runtime[key] === null || Number.isFinite(runtime[key]), `benchmark runtime ${key} must be null or a finite number`);
  }
}

function validateBenchmark(value) {
  assertExactKeys(value, ['runtime', 'fixture', 'limits', 'scenarios', 'acceptance', 'interruption', 'deterministicRegeneration', 'artifactDirectoryBytes'], 'benchmark');
  validateBenchmarkRuntime(value.runtime);
  assertExactKeys(value.fixture, ['anchorCount', 'jurisdiction', 'photoCount', 'photoDimensions'], 'benchmark fixture');
  assertExactKeys(value.limits, ['concurrencyPeakRssMiB', 'outputBytes', 'singlePeakRssMiB', 'warmDurationMs'], 'benchmark limits');
  assert(Array.isArray(value.scenarios));
  for (const scenario of value.scenarios) assertExactKeys(scenario, ['name', 'durationMs', 'peakRssMiB', 'peakIntervalCpuPercent'], 'benchmark scenario');
  assertBooleanMap(value.acceptance, ['completedRetryReused', 'concurrencyMemory', 'embeddedNotoSans', 'expectedPageContent', 'expectedPageCount', 'expectedPhotoCount', 'freshRegenerationByteStable', 'interruptedExitExpected', 'interruptedRecoveryClean', 'outputSize', 'retryCompleted', 'singleMemory', 'warmDuration'], 'benchmark acceptance');
  assertExactKeys(value.interruption, ['temporaryPdfObserved', 'retryStartedBeforeInterruption', 'interruptedExit', 'retry', 'reuse'], 'benchmark interruption');
  assertExactKeys(value.interruption.interruptedExit, ['code', 'signal'], 'benchmark interrupted exit');
  validateRenderSummary(value.interruption.retry, 'benchmark retry');
  validateRenderSummary(value.interruption.reuse, 'benchmark reuse');
  assertExactKeys(value.deterministicRegeneration, ['first', 'second'], 'benchmark deterministic regeneration');
  validateRenderSummary(value.deterministicRegeneration.first, 'benchmark deterministic first');
  validateRenderSummary(value.deterministicRegeneration.second, 'benchmark deterministic second');
}

export function validateManagedRun(value) {
  const common = ['schemaVersion', 'ticket', 'candidate', 'region', 'runId', 'jobId', 'mode', 'rendererConcurrency', 'timing', 'platformColdProbe', 'cpuStartupBoost', 'report'];
  assertExactKeys(value, [...common, value?.mode === 'benchmark' ? 'benchmark' : 'terminationRecovery'], 'managed run');
  assert.equal(value.schemaVersion, '1.0.0');
  assert.equal(value.ticket, '2D-04');
  assert.equal(value.candidate, 'cloud-run');
  assert.equal(value.region, 'australia-southeast1');
  assert.match(value.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  assert(['benchmark', 'terminate-once'].includes(value.mode));
  assert.equal(value.rendererConcurrency, 1);
  assert.equal(value.platformColdProbe, value.mode === 'benchmark');
  assert.equal(value.cpuStartupBoost, false);
  validateTiming(value.timing, value.mode === 'benchmark');
  validateReport(value.report, value.runId, value.jobId);
  if (value.mode === 'benchmark') validateBenchmark(value.benchmark);
  else {
    assertExactKeys(value.terminationRecovery, ['result', 'acceptance'], 'termination recovery');
    validateRenderSummary(value.terminationRecovery.result, 'termination recovery result');
    assertBooleanMap(value.terminationRecovery.acceptance, ['expectedPageCount', 'expectedPageContent', 'expectedPhotoCount', 'embeddedNotoSans'], 'termination recovery acceptance');
  }
  assert.equal(forbidden(value), false, 'managed run contains forbidden data');
  return value;
}

function validateTaskProof(value) {
  assertExactKeys(value, ['schemaVersion', 'runId', 'jobId', 'methodPost', 'privateServiceUrl', 'oidcServiceAccountVerified', 'oidcAudienceVerified'], 'task proof');
  assert.equal(value.schemaVersion, '1.0.0');
  assert.match(value.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  assert.match(value.jobId, /^(exercise|termination)-[a-z0-9-]{1,48}$/);
  assert.equal(['methodPost', 'privateServiceUrl', 'oidcServiceAccountVerified', 'oidcAudienceVerified'].every((key) => value[key] === true), true);
  return value;
}

function validateDeployment(value) {
  assertExactKeys(value, ['schemaVersion', 'runId', 'capturedAt', 'region', 'ownership', 'identities', 'renderer', 'queue', 'storage', 'artifactRepository', 'build'], 'deployment');
  assertExactKeys(value.ownership, ['runLabelsVerified', 'bucketLabelsVerified', 'repositoryLabelsVerified', 'unlabelledResourcesRegistryVerified'], 'deployment ownership');
  assertExactKeys(value.identities, ['workerServiceAccountVerified', 'taskInvokerBindingVerified', 'bucketWorkerBindingsVerified', 'unexpectedDirectBucketServiceAccountsAbsent', 'publicMembersAbsent'], 'deployment identities');
  assertExactKeys(value.renderer, ['imageDigest', 'cpu', 'memory', 'concurrency', 'timeoutSeconds', 'minimumInstances', 'maximumInstances', 'private', 'cpuStartupBoost'], 'deployment renderer');
  assertExactKeys(value.queue, ['location', 'maximumConcurrentDispatches', 'maximumAttempts', 'maximumRetryDurationSeconds', 'minimumBackoffSeconds', 'maximumBackoffSeconds'], 'deployment queue');
  assertExactKeys(value.storage, ['location', 'uniformBucketLevelAccess', 'publicAccessPrevention', 'lifecycleDays'], 'deployment storage');
  assertExactKeys(value.artifactRepository, ['location', 'format', 'labelsVerified'], 'deployment artifact repository');
  assertExactKeys(value.build, ['method', 'implicitCloudBuildStorage'], 'deployment build');
  assert.equal(value.schemaVersion, '1.0.0');
  assert.match(value.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  assert.equal(value.region, 'australia-southeast1');
  assert.equal(Object.values(value.ownership).every(Boolean), true);
  assert.equal(Object.values(value.identities).every(Boolean), true);
  assert.match(value.renderer.imageDigest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual({
    cpu: value.renderer.cpu,
    memory: value.renderer.memory,
    concurrency: value.renderer.concurrency,
    timeoutSeconds: value.renderer.timeoutSeconds,
    minimumInstances: value.renderer.minimumInstances,
    maximumInstances: value.renderer.maximumInstances,
    private: value.renderer.private,
    cpuStartupBoost: value.renderer.cpuStartupBoost,
  }, { cpu: '2', memory: '2Gi', concurrency: 1, timeoutSeconds: 300, minimumInstances: 0, maximumInstances: 1, private: true, cpuStartupBoost: false });
  assert.deepEqual(value.queue, { location: 'australia-southeast1', maximumConcurrentDispatches: 1, maximumAttempts: 5, maximumRetryDurationSeconds: 1800, minimumBackoffSeconds: 5, maximumBackoffSeconds: 60 });
  assert.deepEqual(value.storage, { location: 'australia-southeast1', uniformBucketLevelAccess: true, publicAccessPrevention: 'enforced', lifecycleDays: 7 });
  assert.deepEqual(value.artifactRepository, { location: 'australia-southeast1', format: 'DOCKER', labelsVerified: true });
  assert.deepEqual(value.build, { method: 'local-docker-build-and-direct-artifact-registry-push', implicitCloudBuildStorage: false });
  assert.equal(forbidden(value), false, 'deployment contains forbidden data');
  return value;
}

function validateCost(value) {
  assertExactKeys(value, ['schemaVersion', 'runId', 'method', 'measuredAverageRequestExecutionSeconds', 'measuredAverageEnqueueToProcessStartSeconds', 'measuredAverageProcessStartToRequestSeconds', 'measuredAverageWarmSingleRenderSeconds', 'measuredAverageReportBytes', 'rates', 'estimatedProofHarnessRunUsd', 'estimatedWarmSingleRenderUsd', 'actualInvoiceAttributionAvailable', 'limitation'], 'cost');
  assertExactKeys(value.rates, ['currency', 'cpuPerVcpuSecond', 'memoryPerGibSecond', 'queuePerOperationAfterFreeTier', 'cloudRunRequestPerOperationAfterFreeTier', 'storagePerGibMonth', 'sourceCheckedAt', 'source'], 'cost rates');
  assert.match(value.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  assert.equal(value.rates.currency, 'USD');
  assert.equal(value.rates.source, 'https://cloud.google.com/run/pricing');
  for (const key of ['measuredAverageRequestExecutionSeconds', 'measuredAverageEnqueueToProcessStartSeconds', 'measuredAverageProcessStartToRequestSeconds', 'measuredAverageWarmSingleRenderSeconds', 'measuredAverageReportBytes', 'estimatedProofHarnessRunUsd', 'estimatedWarmSingleRenderUsd']) assert(Number.isFinite(value[key]) && value[key] >= 0);
  assert.equal(value.actualInvoiceAttributionAvailable, false);
  assert.equal(forbidden(value), false, 'cost contains forbidden data');
  return value;
}

function validateDestruction(value) {
  assertExactKeys(value, ['schemaVersion', 'ticket', 'runId', 'prefix', 'verifiedAt', 'remaining', 'passed'], 'destruction');
  assert(Array.isArray(value.remaining));
  assert.equal(value.schemaVersion, '1.0.0');
  assert.equal(value.ticket, '2D-04');
  assert.match(value.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  assert.equal(value.runId.startsWith(`${value.prefix}-`), true);
  assert.equal(forbidden(value), false, 'destruction contains forbidden data');
  return value;
}

async function runContext() {
  const context = await json(CONTEXT);
  assert.match(context.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  const runDir = path.join(STATE, 'runs', context.runId);
  return {
    context,
    runDir,
    resultsDir: path.join(runDir, 'results'),
    deploymentFile: path.join(runDir, 'deployment.json'),
    costFile: path.join(runDir, 'cost.json'),
    destroyedFile: path.join(runDir, 'destroyed.json'),
  };
}

function assertRunBound(value, runId, label) {
  assert.equal(value?.runId, runId, `${label} belongs to another managed spike run`);
}

async function aggregate() {
  const { context, runDir, resultsDir, deploymentFile, costFile, destroyedFile } = await runContext();
  const files = await readdir(resultsDir).catch(() => []);
  const results = await Promise.all(files.filter((name) => name.endsWith('.json')).sort().map((name) => json(path.join(resultsDir, name))));
  for (const result of results) {
    validateManagedRun(result);
    assertRunBound(result, context.runId, 'job evidence');
  }
  const taskProofDir = path.join(runDir, 'task-proofs');
  const taskProofFiles = await readdir(taskProofDir).catch(() => []);
  const taskDeliveryProofs = await Promise.all(taskProofFiles.filter((name) => name.endsWith('.json')).sort().map((name) => json(path.join(taskProofDir, name))));
  for (const proof of taskDeliveryProofs) {
    validateTaskProof(proof);
    assertRunBound(proof, context.runId, 'task proof');
  }
  const exercises = results.filter(({ mode }) => mode === 'benchmark');
  const termination = results.find(({ mode }) => mode === 'terminate-once') ?? null;
  const deployment = await json(deploymentFile).catch(() => null);
  const cost = await json(costFile).catch(() => null);
  const destruction = await json(destroyedFile).catch(() => null);
  for (const [label, value] of [['deployment state', deployment], ['cost record', cost], ['destruction record', destruction]]) {
    if (value) assertRunBound(value, context.runId, label);
  }
  if (deployment) validateDeployment(deployment);
  if (cost) validateCost(cost);
  if (destruction) validateDestruction(destruction);
  const uniqueExercises = new Set(exercises.map(({ jobId }) => jobId)).size === 3;
  const taskProofJobIds = new Set(taskDeliveryProofs.map(({ jobId }) => jobId));
  const deliveryProved = results.length === 4 && results.every(({ jobId }) => taskProofJobIds.has(jobId));
  const complete = exercises.length === 3 && uniqueExercises && termination && deployment && cost && destruction?.passed && deliveryProved;
  const evidence = {
    schemaVersion: '1.0.0',
    ticket: '2D-04',
    runId: context.runId,
    status: complete ? 'candidate-exercised-and-destroyed' : 'managed-proof-incomplete',
    candidate: 'cloud-run',
    region: 'australia-southeast1',
    location: 'Sydney, Australia',
    capturedAt: new Date().toISOString(),
    managedProviderApproved: false,
    configuration: deployment,
    taskDeliveryProofs,
    exerciseRuns: exercises,
    terminationRecovery: termination,
    cost,
    destruction,
    limitations: [
      'This is fictional spike evidence, not production approval or sizing.',
      'platformColdProbe is true when the request ran on the Cloud Run revision whose SPIKE_PLATFORM_COLD_TOKEN matched the job. Cloud Run may health-check that revision before enqueue, so processStartedAt can precede enqueuedAt and enqueueToProcessStartMs can be 0. Browser cold/warm timings remain the in-request scenarios.',
      'Cloud Run did not expose a finite cgroup CPU/memory quota in the captured runs; in-container availableCpuCount and totalMemoryMiB exceeded the 2 vCPU / 2 GiB service spec. Service capture still records cpu 2 and memory 2Gi.',
      'Deleted IAM service accounts remain restorable for about 30 days. gcloud 580 and IAM v1 ListServiceAccounts cannot inventory those deleted accounts, so verify-destroyed proves no active prefix accounts remain.',
      'Cost distinguishes the multi-render proof harness from an estimated warm single-render execution and is not an invoice line item. Rates are hardcoded Sydney list constants; sourceCheckedAt is the collect-cost clock, not a live price fetch.',
      'Authentication provider selection remains an owner decision.',
      'Per-run cpuStartupBoost is recorded as false because the worker emits the deploy-time --no-cpu-boost contract; it is not read from the running instance.',
      'Database, backup, export and production scaling remain outside this managed renderer proof.',
    ],
  };
  assert.equal(forbidden(evidence), false, 'evidence contains a secret, account identifier or local path');
  await writeFile(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return { runDir, complete };
}

async function cost(region) {
  assert.equal(region, 'australia-southeast1');
  const { context, resultsDir, costFile } = await runContext();
  const files = (await readdir(resultsDir)).filter((name) => name.startsWith('exercise-') && name.endsWith('.json'));
  assert.equal(files.length, 3, 'three exercise results are required before cost collection');
  const results = await Promise.all(files.map((name) => json(path.join(resultsDir, name))));
  for (const result of results) {
    validateManagedRun(result);
    assertRunBound(result, context.runId, 'cost input');
  }
  const averageRequestExecutionSeconds = results.reduce((sum, result) => sum + result.timing.requestExecutionMs / 1000, 0) / results.length;
  const averageEnqueueToProcessStartSeconds = results.reduce((sum, result) => sum + result.timing.enqueueToProcessStartMs / 1000, 0) / results.length;
  const averageProcessStartToRequestSeconds = results.reduce((sum, result) => sum + result.timing.processStartToRequestMs / 1000, 0) / results.length;
  const averageWarmRenderSeconds = results.reduce((sum, result) => {
    const warm = result.benchmark.scenarios.find(({ name }) => name === 'warm-single');
    assert(warm, 'warm-single timing is missing');
    return sum + warm.durationMs / 1000;
  }, 0) / results.length;
  const rates = {
    currency: 'USD',
    cpuPerVcpuSecond: 0.0000336,
    memoryPerGibSecond: 0.0000035,
    queuePerOperationAfterFreeTier: 0.0000004,
    cloudRunRequestPerOperationAfterFreeTier: 0.0000004,
    storagePerGibMonth: 0.022,
    sourceCheckedAt: new Date().toISOString().slice(0, 10),
    source: 'https://cloud.google.com/run/pricing',
  };
  const averageBytes = results.reduce((sum, result) => sum + result.report.bytes, 0) / results.length;
  const computeRate = (2 * rates.cpuPerVcpuSecond) + (2 * rates.memoryPerGibSecond);
  const queue = rates.queuePerOperationAfterFreeTier;
  const cloudRunRequest = rates.cloudRunRequestPerOperationAfterFreeTier;
  const storageOneMonth = averageBytes / (1024 ** 3) * rates.storagePerGibMonth;
  const record = {
    schemaVersion: '1.0.0',
    runId: context.runId,
    method: 'Measured request execution and warm-render durations multiplied by hardcoded Sydney list rate constants, plus Cloud Run request, Cloud Tasks operation and storage estimates; excludes free-tier discounts and CPU startup boost is disabled.',
    measuredAverageRequestExecutionSeconds: averageRequestExecutionSeconds,
    measuredAverageEnqueueToProcessStartSeconds: averageEnqueueToProcessStartSeconds,
    measuredAverageProcessStartToRequestSeconds: averageProcessStartToRequestSeconds,
    measuredAverageWarmSingleRenderSeconds: averageWarmRenderSeconds,
    measuredAverageReportBytes: averageBytes,
    rates,
    estimatedProofHarnessRunUsd: (averageRequestExecutionSeconds * computeRate) + cloudRunRequest + queue + storageOneMonth,
    estimatedWarmSingleRenderUsd: (averageWarmRenderSeconds * computeRate) + cloudRunRequest + queue + storageOneMonth,
    actualInvoiceAttributionAvailable: false,
    limitation: 'Queue latency is reported separately and never priced as Cloud Run compute. Container startup billing and billing-export SKU attribution are unavailable to this bounded harness, so these are duration-derived estimates rather than actual invoice cost.',
  };
  assert.equal(forbidden(record), false);
  await writeFile(costFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

async function verify(file) {
  const evidence = await json(file);
  assertExactKeys(evidence, ['schemaVersion', 'ticket', 'runId', 'status', 'candidate', 'region', 'location', 'capturedAt', 'managedProviderApproved', 'configuration', 'taskDeliveryProofs', 'exerciseRuns', 'terminationRecovery', 'cost', 'destruction', 'limitations'], 'managed evidence');
  assert.equal(forbidden(evidence), false, 'evidence contains forbidden identifiers or credentials');
  assert.match(evidence.runId, /^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$/);
  assert.equal(evidence.managedProviderApproved, false);
  assert.equal(evidence.status, 'candidate-exercised-and-destroyed');
  assert.equal(evidence.region, 'australia-southeast1');
  assert.equal(evidence.configuration.runId, evidence.runId);
  validateDeployment(evidence.configuration);
  assert.equal(evidence.configuration.renderer.concurrency, 1);
  assert.equal(evidence.configuration.renderer.cpuStartupBoost, false);
  assert.equal(evidence.configuration.storage.publicAccessPrevention, 'enforced');
  assert.equal(evidence.exerciseRuns.length, 3);
  assert.equal(new Set(evidence.exerciseRuns.map(({ jobId }) => jobId)).size, 3);
  for (const run of evidence.exerciseRuns) {
    validateManagedRun(run);
    assert.equal(run.runId, evidence.runId);
    assert.equal(run.platformColdProbe, true);
    assert.equal(Object.values(run.benchmark.acceptance).includes(false), false);
    assert(run.benchmark.scenarios.some(({ name }) => name === 'cold-single'));
    assert(run.benchmark.scenarios.some(({ name }) => name === 'warm-single'));
    assert.equal(run.benchmark.deterministicRegeneration.first.pdfSha256, run.benchmark.deterministicRegeneration.second.pdfSha256);
    assert.match(run.report.generation, /^[0-9]+$/);
    assert.equal(run.report.sha256, run.report.uploadSha256);
  }
  assert(evidence.terminationRecovery);
  validateManagedRun(evidence.terminationRecovery);
  assert.equal(evidence.terminationRecovery.runId, evidence.runId);
  assert.equal(evidence.terminationRecovery.report.created, true);
  assert.equal(Object.values(evidence.terminationRecovery.terminationRecovery.acceptance).includes(false), false);
  const limitationText = evidence.limitations.join('\n');
  for (const required of [
    'platformColdProbe is true when the request ran on the Cloud Run revision',
    'did not expose a finite cgroup CPU/memory quota',
    'gcloud 580 and IAM v1 ListServiceAccounts cannot inventory those deleted accounts',
    'Rates are hardcoded Sydney list constants',
    'Authentication provider selection remains an owner decision',
    'Per-run cpuStartupBoost is recorded as false',
  ]) {
    assert(limitationText.includes(required), `managed evidence missing limitation: ${required}`);
  }
  assert.equal(evidence.cost.runId, evidence.runId);
  validateCost(evidence.cost);
  assert.equal(evidence.cost.estimatedProofHarnessRunUsd > 0, true);
  assert.equal(evidence.cost.estimatedWarmSingleRenderUsd > 0, true);
  assert.equal(evidence.destruction.runId, evidence.runId);
  validateDestruction(evidence.destruction);
  assert.equal(evidence.destruction.passed, true);
  assert.deepEqual(evidence.destruction.remaining, []);
  assert.equal(evidence.taskDeliveryProofs.length, 4);
  for (const proof of evidence.taskDeliveryProofs) {
    validateTaskProof(proof);
    assert.equal(proof.runId, evidence.runId);
  }
  const provedJobs = new Set(evidence.taskDeliveryProofs.map(({ jobId }) => jobId));
  assert.equal([...evidence.exerciseRuns, evidence.terminationRecovery].every(({ jobId }) => provedJobs.has(jobId)), true);
  console.log('provider-spike managed evidence passed');
}

const [action, argument] = process.argv.slice(2);
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (action === '--aggregate') await aggregate();
  else if (action === '--cost') await cost(argument);
  else if (action === '--verify') await verify(argument);
  else throw new Error('Usage: evidence.mjs --aggregate | --cost REGION | --verify FILE');
}
