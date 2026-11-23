import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createObject, objectExists, sanitizeEvidence, validateJob } from './worker-support.mjs';
import { assertExactKeys, validateManagedRun } from './evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.join(ROOT, 'infra/spikes/cloud-run');
const config = JSON.parse(await readFile(path.join(here, 'candidate.json'), 'utf8'));
const lifecycle = JSON.parse(await readFile(path.join(here, 'lifecycle.json'), 'utf8'));
const dockerfile = await readFile(path.join(here, 'Dockerfile'), 'utf8');
const localDockerfile = await readFile(path.join(ROOT, 'tools/pdf-spike/Dockerfile.linux'), 'utf8');
const providerScript = await readFile(path.join(ROOT, 'tools/provider-spike.sh'), 'utf8');
const worker = await readFile(path.join(here, 'worker.mjs'), 'utf8');
const dockerignore = await readFile(path.join(ROOT, '.dockerignore'), 'utf8');
const evidenceScript = await readFile(path.join(here, 'evidence.mjs'), 'utf8');

assert.equal(config.ticket, '2D-04');
assert.equal(config.candidate, 'cloud-run');
assert.equal(config.region, 'australia-southeast1');
assert.equal(config.renderer.containerConcurrency, 1);
assert.equal(config.renderer.memoryMiB, 2048);
assert.equal(config.storage.uniformBucketLevelAccess, true);
assert.equal(config.storage.publicAccessPrevention, 'enforced');
assert.equal(config.managedProviderApproved, false);
assert.equal(lifecycle.rule.every(({ condition }) => condition.age <= 7), true);
assert.match(dockerfile, /FROM mcr\.microsoft\.com\/playwright@sha256:[a-f0-9]{64}/);
assert.equal(dockerfile.match(/FROM .+/)[0], localDockerfile.match(/FROM .+/)[0]);
assert.doesNotMatch(dockerignore, /(^|\n)infra(?:\/|\n|$)/, 'Cloud Run worker must be present in the Docker build context');
assert.match(dockerfile, /COPY infra\/spikes\/cloud-run\/ infra\/spikes\/cloud-run\//);
assert.match(providerScript, /cloud commands require an attended interactive terminal/);
assert.match(providerScript, /cloud commands are forbidden in CI/);
assert.match(providerScript, /I_AUTHORIZE_2D04_NON_TTY/);
assert.match(providerScript, /HEIGHT_SAFETY_SPIKE_CONFIRM/);
assert.match(providerScript, /Paste in this Terminal window, not Cursor chat/);
assert.match(providerScript, /production-looking projects are refused/);
assert.match(providerScript, /refusing unregistered existing or deletion target/);
assert.match(providerScript, /register_intent service-account/);
assert.match(providerScript, /service_account_exists/);
assert.match(providerScript, /gcloud iam service-accounts list/);
assert.match(providerScript, /gcloud storage buckets update/);
assert.match(providerScript, /--update-labels/);
assert.doesNotMatch(providerScript, /storage buckets create[^\n]*--labels/);
assert.match(providerScript, /register_intent cloud-tasks-queue/);
assert.match(providerScript, /PREFIX-q\$\(openssl rand -hex 4\)/);
assert.match(evidenceScript, /revision health-check may start before enqueue/);
assert.doesNotMatch(providerScript, /--show-deleted/);
assert.match(providerScript, /gcloud 580 and IAM v1 ListServiceAccounts reject deleted-account inventory/);
assert.match(evidenceScript, /platformColdProbe is true when the request ran on the Cloud Run revision/);
assert.match(evidenceScript, /gcloud 580 and IAM v1 ListServiceAccounts cannot inventory those deleted accounts/);
assert.match(evidenceScript, /did not expose a finite cgroup CPU\/memory quota/);
assert.match(evidenceScript, /Rates are hardcoded Sydney list constants/);
assert.match(evidenceScript, /Per-run cpuStartupBoost is recorded as false/);
assert.match(evidenceScript, /limitationText.includes/);
assert.match(evidenceScript, /terminationRecovery\.report\.created, true/);
assert.match(providerScript, /location:\(\$queue\.name\|split\("\/"\)\[3\]\)/);
assert.match(await readFile(path.join(here, 'worker-support.mjs'), 'utf8'), /cgroupCpuLimit: benchmark\.cgroupCpuLimit \?\? null/);
assert.match(providerScript, /state=="intended" or \.state=="created"/);
assert.match(providerScript, /authoritative not-found response/);
assert.match(providerScript, /Cloud Tasks queue did not become describable after create/);
assert.match(providerScript, /\[Cc\]annot\[\[:space:\]\]find\[\[:space:\]\]service/);
assert.doesNotMatch(providerScript, /gcloud builds submit/);
assert.match(providerScript, /deployed revision digest differs from the locally built image/);
assert.match(providerScript, /status.imageDigest/);
assert.doesNotMatch(providerScript, /--allow-unauthenticated/);
assert.match(providerScript, /--no-cpu-boost/);
assert.match(providerScript, /cold-token revision env does not match the exercise job/);
assert.match(providerScript, /cold-token revision .+ is ready before enqueue/);
assert.match(providerScript, /timed out waiting for sanitised evidence object/);
assert.match(await readFile(path.join(ROOT, 'tools/pdf-spike/render-core.mjs'), 'utf8'), /reusedReportResult/);
assert.match(await readFile(path.join(here, 'worker-support.mjs'), 'utf8'), /platformColdProbe: process\.env\.SPIKE_PLATFORM_COLD_TOKEN === job\.jobId/);
assert.doesNotMatch(await readFile(path.join(here, 'worker-support.mjs'), 'utf8'), /platformColdProbe: process\.env\.SPIKE_PLATFORM_COLD_TOKEN === job\.jobId && processStartedAfterEnqueue/);
assert.match(evidenceScript, /belongs to another managed spike run/);
assert.match(worker, /response\.end\(`\$\{JSON\.stringify\(result\)\}/);
assert.doesNotMatch(worker, /console\.(?:log|error)\([^\n]*request/);

assert.deepEqual(validateJob({ jobId: 'exercise-1', mode: 'benchmark', enqueuedAt: 1 }), { jobId: 'exercise-1', mode: 'benchmark', enqueuedAt: 1 });
assert.deepEqual(validateJob({ jobId: 'termination-recovery', mode: 'terminate-once', enqueuedAt: 1 }), { jobId: 'termination-recovery', mode: 'terminate-once', enqueuedAt: 1 });
assert.throws(() => validateJob({ jobId: 'real-customer', mode: 'benchmark', enqueuedAt: 1 }));
assert.throws(() => validateJob({ jobId: 'exercise-1', mode: 'benchmark', enqueuedAt: 1, payload: 'not allowed' }));
assert.deepEqual(sanitizeEvidence({ nested: { value: 'ok' } }), { nested: { value: 'ok' } });
for (const unsafe of [
  { path: '/tmp/private/report.pdf' },
  { token: 'ya29.secret' },
  { header: 'Authorization: Bearer secret' },
  { credential: 'private_key=secret' },
  { account: 'operator@example.com' },
]) assert.throws(() => sanitizeEvidence(unsafe));
assert.doesNotThrow(() => assertExactKeys({ expected: true }, ['expected'], 'test evidence'));
assert.throws(() => assertExactKeys({ expected: true, projectId: 'unexpected-project' }, ['expected'], 'test evidence'));
assert.throws(() => validateManagedRun({ mode: 'benchmark', projectId: 'unexpected-project' }));

function fakeResponse(status, value = {}) {
  return { ok: status >= 200 && status < 300, status, async json() { return value; } };
}

function fakeFetch(finalResponse, calls) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('http://metadata.google.internal/')) return fakeResponse(200, { access_token: 'test-token' });
    return finalResponse;
  };
}

function fakeFetchSequence(responses, calls = []) {
  let index = 0;
  return async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('http://metadata.google.internal/')) return fakeResponse(200, { access_token: 'test-token' });
    const response = responses[index];
    index += 1;
    return response;
  };
}

const createCalls = [];
assert.deepEqual(
  await createObject('test-bucket', 'reports/exercise-1.pdf', 'application/pdf', Buffer.from('fictional'), { runId: 'hs2d04-12345678-20260814010101-abcdef' }, fakeFetch(fakeResponse(200, { generation: '1' }), createCalls)),
  { created: true, generation: '1', sha256: createHash('sha256').update('fictional').digest('hex') },
);
assert.match(createCalls[1].url, /ifGenerationMatch=0/);
assert.match(createCalls[1].url, /reports%2Fexercise-1\.pdf/);
assert.equal(createCalls[1].options.headers.Authorization, 'Bearer test-token');
assert.equal(createCalls[1].options.headers['Content-MD5'], createHash('md5').update('fictional').digest('base64'));
const fictionalSha = createHash('sha256').update('fictional').digest('hex');
const fictionalMd5 = createHash('md5').update('fictional').digest('base64');
assert.deepEqual(
  await createObject(
    'test-bucket',
    'reports/exercise-1.pdf',
    'application/pdf',
    Buffer.from('fictional'),
    { runId: 'hs2d04-12345678-20260814010101-abcdef' },
    fakeFetchSequence([
      fakeResponse(412),
      fakeResponse(200, { generation: '7', size: '9', md5Hash: fictionalMd5 }),
    ]),
  ),
  { created: false, generation: '7', sha256: fictionalSha },
);
await assert.rejects(() => createObject(
  'test-bucket',
  'reports/exercise-1.pdf',
  'application/pdf',
  Buffer.from('fictional'),
  {},
  fakeFetchSequence([fakeResponse(412), fakeResponse(200, { generation: '8', size: '9', md5Hash: 'wrong' })]),
));
assert.equal(await objectExists('test-bucket', 'missing', fakeFetch(fakeResponse(404), [])), false);
assert.equal(await objectExists('test-bucket', 'present', fakeFetch(fakeResponse(200), [])), true);

console.log('cloud-run provider spike static checks passed');
