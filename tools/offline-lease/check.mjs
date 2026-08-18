import assert from 'node:assert/strict';

import {
  ACCOUNT,
  LOCK_REASON,
  MODE,
  WORKING_LEASE_DURATION_MS,
  WORKING_RECOVERY_DURATION_MS,
  apply,
  createSession,
  evidenceSnapshot,
} from './machine.mjs';

const HOUR = 60 * 60 * 1000;
const actor = 'inspector-1';
const admin = 'admin-1';

function run(events, init) {
  let session = createSession(init);
  const results = [];
  for (const event of events) {
    const applied = apply(session, event);
    results.push(applied);
    session = applied.session;
  }
  return { session, results };
}

function last(results) {
  return results[results.length - 1];
}

function pendingEvidence() {
  return [
    { type: 'saveMutation', id: 'mut-1', fingerprint: 'fp-1', actorId: actor },
    { type: 'savePhoto', id: 'photo-1', checksum: 'sum-1', actorId: actor },
  ];
}

{
  const { session, results } = run([
    { type: 'saveMutation', id: 'mut-1', fingerprint: 'fp-1', actorId: actor },
  ]);
  assert.equal(session.mode, MODE.CAPTURE);
  assert.equal(session.lockReason, LOCK_REASON.NONE);
  assert.equal(last(results).ok, true);
  assert.equal(session.pendingMutations.length, 1);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'tick', wallNowMs: WORKING_LEASE_DURATION_MS + 1, elapsedDeltaMs: WORKING_LEASE_DURATION_MS + 1, actorId: actor },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
  ]);
  const denied = last(results);
  assert.equal(session.mode, MODE.LOCKED);
  assert.equal(session.lockReason, LOCK_REASON.LEASE_EXPIRED);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'LEASE_EXPIRED');
  assert.deepEqual(denied.evidence, evidenceSnapshot(session));
  assert.equal(session.pendingMutations.length, 1);
  assert.equal(session.pendingPhotos.length, 1);
  assert.equal(session.localJobPackPresent, true);
}

{
  const { session, results } = run([
    { type: 'tick', wallNowMs: HOUR, elapsedDeltaMs: HOUR, actorId: actor },
    { type: 'refreshOnline', reachable: true, actorId: actor },
    { type: 'tick', wallNowMs: HOUR + WORKING_LEASE_DURATION_MS - 1, elapsedDeltaMs: WORKING_LEASE_DURATION_MS - 2, actorId: actor },
  ]);
  assert.equal(last(results).ok, true);
  assert.equal(session.mode, MODE.CAPTURE);
  assert.equal(session.lockReason, LOCK_REASON.NONE);
}

{
  const before = run(pendingEvidence()).session;
  const snapshot = evidenceSnapshot(before);
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: false, actorId: admin },
    { type: 'refreshOnline', reachable: true, actorId: actor },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
    { type: 'cleanupLocal', actorId: admin },
  ]);
  assert.equal(session.serverAccountStatus, ACCOUNT.REVOKED);
  assert.equal(session.deviceAccountStatus, ACCOUNT.REVOKED);
  assert.equal(session.mode, MODE.LOCKED);
  assert.equal(session.lockReason, LOCK_REASON.REVOCATION);
  assert.equal(results[results.length - 3].ok, false);
  assert.equal(results[results.length - 3].reason, 'ACCOUNT_REVOKED');
  assert.equal(results[results.length - 3].serverAccessAllowed, false);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'PENDING_EVIDENCE');
  assert.deepEqual(evidenceSnapshot(session), snapshot);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: false, actorId: admin },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
  ]);
  assert.equal(session.serverAccountStatus, ACCOUNT.REVOKED);
  assert.equal(session.deviceAccountStatus, ACCOUNT.ACTIVE);
  assert.equal(session.mode, MODE.CAPTURE);
  assert.equal(last(results).ok, true);
  assert.equal(last(results).serverAccessAllowed, false);
  assert.equal(session.pendingMutations.length, 2);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
  ]);
  assert.equal(session.deviceAccountStatus, ACCOUNT.REVOKED);
  assert.equal(session.lockReason, LOCK_REASON.REVOCATION);
  assert.equal(last(results).ok, false);
  assert.equal(session.pendingMutations.length, 1);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'logout', actorId: actor },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'PENDING_EVIDENCE');
  assert.equal(session.localJobPackPresent, true);
  assert.equal(session.pendingMutations.length, 1);
  assert.equal(session.pendingPhotos.length, 1);
}

{
  const { session, results } = run([
    { type: 'savePhoto', id: 'photo-1', checksum: 'sum-1', actorId: actor },
    { type: 'logout', actorId: actor },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'PENDING_EVIDENCE');
  assert.equal(session.pendingPhotos.length, 1);
}

{
  const { session, results } = run([
    { type: 'markConflict', actorId: actor },
    { type: 'logout', actorId: actor },
  ]);
  assert.equal(session.conflict, true);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'UNRESOLVED_CONFLICT');
}

{
  const { session, results } = run([
    { type: 'saveMutation', id: 'mut-1', fingerprint: 'fp-1', actorId: actor },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], actorId: actor },
    { type: 'logout', actorId: actor },
  ]);
  assert.equal(session.pendingMutations.length, 0);
  assert.equal(session.serverAcknowledged, true);
  assert.equal(last(results).ok, true);
}

{
  const { session, results } = run([
    { type: 'logout', actorId: actor },
    { type: 'cleanupLocal', actorId: actor },
  ]);
  assert.equal(results[0].ok, true);
  assert.equal(last(results).ok, true);
  assert.equal(session.localJobPackPresent, false);
}

{
  const snapshot = evidenceSnapshot(run(pendingEvidence()).session);
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], acknowledgedPhotoIds: ['photo-1'], actorId: actor },
  ]);
  assert.equal(results[results.length - 3].ok, true);
  assert.equal(session.mode, MODE.UPLOAD_ONLY);
  assert.equal(session.deviceAccountStatus, ACCOUNT.REVOKED);
  assert.equal(results[results.length - 2].ok, false);
  assert.equal(results[results.length - 2].reason, 'ACCOUNT_REVOKED');
  assert.deepEqual(results[results.length - 2].evidence, snapshot);
  assert.equal(last(results).ok, true);
  assert.equal(session.pendingMutations.length, 0);
  assert.equal(session.pendingPhotos.length, 0);
  assert.equal(session.serverAcknowledged, true);
  assert.equal(session.mode, MODE.UPLOAD_ONLY);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], acknowledgedPhotoIds: ['photo-1'], actorId: actor },
    { type: 'cleanupLocal', actorId: admin },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
  ]);
  assert.equal(session.localJobPackPresent, false);
  assert.equal(session.deviceAccountStatus, ACCOUNT.REVOKED);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'ACCOUNT_REVOKED');
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'authoriseRecovery', actorRole: 'Inspector', actorId: actor, companyId: 'company-a' },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'RECOVERY_REQUIRES_ADMINISTRATOR');
  assert.equal(session.recovery, null);
  assert.equal(session.pendingMutations.length, 1);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-b' },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'CROSS_COMPANY_DENIED');
  assert.equal(session.recovery, null);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'loseKeystore', actorId: actor },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
    { type: 'cleanupLocal', actorId: admin },
  ]);
  assert.equal(session.lockReason, LOCK_REASON.KEYSTORE_LOST);
  assert.equal(session.mode, MODE.LOCKED);
  assert.equal(results[results.length - 2].ok, false);
  assert.equal(results[results.length - 2].reason, 'KEYSTORE_LOST');
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'PENDING_EVIDENCE');
  assert.equal(session.localJobPackPresent, true);
  assert.equal(session.pendingMutations.length, 1);
  assert.equal(session.pendingPhotos.length, 1);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'lockDevice', actorId: actor },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
  ]);
  assert.equal(session.lockReason, LOCK_REASON.DEVICE);
  assert.equal(last(results).ok, false);
  assert.equal(session.pendingMutations.length, 1);
  assert.equal(session.localJobPackPresent, true);
}

{
  const { session, results } = run([
    { type: 'tick', wallNowMs: WORKING_LEASE_DURATION_MS + 1, elapsedDeltaMs: WORKING_LEASE_DURATION_MS + 1, actorId: actor },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'saveMutation', id: 'mut-1', fingerprint: 'fp-1', actorId: actor },
  ]);
  assert.equal(session.lockReason, LOCK_REASON.LEASE_EXPIRED);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'LEASE_EXPIRED');
}

{
  const { session, results } = run([
    { type: 'tick', wallNowMs: HOUR, elapsedDeltaMs: HOUR, actorId: actor },
    { type: 'tick', wallNowMs: 0, elapsedDeltaMs: 0, actorId: actor },
    { type: 'saveMutation', id: 'mut-1', fingerprint: 'fp-1', actorId: actor },
  ]);
  assert.equal(session.lockReason, LOCK_REASON.CLOCK_ROLLBACK);
  assert.equal(results[1].ok, false);
  assert.equal(results[1].reason, 'CLOCK_ROLLBACK');
  assert.equal(last(results).ok, false);
  assert.equal(session.pendingMutations.length, 0);
}

{
  const { session } = run([
    { type: 'tick', wallNowMs: 10, elapsedDeltaMs: WORKING_LEASE_DURATION_MS + 1, actorId: actor },
  ]);
  assert.equal(session.mode, MODE.LOCKED);
  assert.equal(session.lockReason, LOCK_REASON.LEASE_EXPIRED);
}

{
  const { session, results } = run([
    { type: 'tick', wallNowMs: WORKING_LEASE_DURATION_MS - 1, elapsedDeltaMs: 0, actorId: actor },
    { type: 'refreshOnline', reachable: false, actorId: actor },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'NETWORK_UNAVAILABLE');
  assert.equal(session.mode, MODE.CAPTURE);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'lockDevice', actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'DEVICE_LOCKED');
  assert.equal(session.recovery, null);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
    { type: 'tick', wallNowMs: WORKING_RECOVERY_DURATION_MS + 1, elapsedDeltaMs: WORKING_RECOVERY_DURATION_MS + 1, actorId: actor },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], acknowledgedPhotoIds: ['photo-1'], actorId: actor },
  ]);
  assert.equal(session.recovery, null);
  assert.equal(session.mode, MODE.LOCKED);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'RECOVERY_REQUIRED');
  assert.equal(session.pendingMutations.length, 1);
}

{
  const { session, results } = run([
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'RECOVERY_ONLY_WHEN_REVOKED');
  assert.equal(session.mode, MODE.CAPTURE);
}

{
  const { session, results } = run([
    { type: 'unlockDevice', deviceAuth: false, actorId: actor },
  ]);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'DEVICE_AUTH_FAILED');
  assert.equal(session.deviceUnlocked, true);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: false, actorId: admin },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
    { type: 'saveMutation', id: 'mut-2', fingerprint: 'fp-2', actorId: actor },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], acknowledgedPhotoIds: ['photo-1'], actorId: actor },
  ]);
  assert.equal(session.deviceAccountStatus, ACCOUNT.REVOKED);
  assert.equal(session.mode, MODE.UPLOAD_ONLY);
  assert.equal(results[results.length - 2].ok, false);
  assert.equal(last(results).ok, true);
  assert.equal(session.pendingMutations.length, 0);
  assert.equal(session.pendingPhotos.length, 0);
}

assert.equal(WORKING_LEASE_DURATION_MS, 24 * HOUR);
assert.equal(WORKING_RECOVERY_DURATION_MS, HOUR);

{
  const snapshot = evidenceSnapshot(run(pendingEvidence()).session);
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: false, actorId: admin },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], acknowledgedPhotoIds: ['photo-1'], actorId: actor },
    { type: 'logout', actorId: actor },
    { type: 'cleanupLocal', actorId: admin },
  ]);
  assert.equal(session.serverAccountStatus, ACCOUNT.REVOKED);
  assert.equal(session.deviceAccountStatus, ACCOUNT.ACTIVE);
  assert.equal(session.mode, MODE.CAPTURE);
  assert.equal(results[results.length - 3].ok, false);
  assert.equal(results[results.length - 3].reason, 'RECOVERY_REQUIRED');
  assert.equal(results[results.length - 2].ok, false);
  assert.equal(last(results).ok, false);
  assert.equal(last(results).reason, 'PENDING_EVIDENCE');
  assert.deepEqual(evidenceSnapshot(session), snapshot);
}

{
  const { session, results } = run([
    ...pendingEvidence(),
    { type: 'revokeAccount', notifyDevice: true, actorId: admin },
    { type: 'unlockDevice', deviceAuth: true, actorId: actor },
    { type: 'authoriseRecovery', actorRole: 'Administrator', actorId: admin, companyId: 'company-a' },
    { type: 'refreshOnline', reachable: true, actorId: actor },
    { type: 'syncPending', acknowledgedMutationIds: ['mut-1'], acknowledgedPhotoIds: ['photo-1'], actorId: actor },
  ]);
  assert.equal(results[results.length - 2].ok, true);
  assert.equal(results[results.length - 2].reason, 'RECOVERY_STILL_LIVE');
  assert.equal(last(results).ok, true);
  assert.equal(session.mode, MODE.UPLOAD_ONLY);
  assert.equal(session.pendingMutations.length, 0);
  assert.equal(session.pendingPhotos.length, 0);
  assert.equal(session.deviceAccountStatus, ACCOUNT.REVOKED);
}

{
  const { session, results } = run([
    { type: 'tick', wallNowMs: HOUR, elapsedDeltaMs: HOUR, actorId: actor },
    { type: 'tick', wallNowMs: 0, elapsedDeltaMs: 0, actorId: actor },
    { type: 'tick', wallNowMs: HOUR, elapsedDeltaMs: 0, actorId: actor },
    { type: 'refreshOnline', reachable: true, actorId: actor },
  ]);
  assert.equal(session.lockReason, LOCK_REASON.NONE);
  assert.equal(session.mode, MODE.CAPTURE);
  assert.equal(last(results).ok, true);
  assert.equal(last(results).reason, 'LEASE_RENEWED');
}

console.log('offline-lease checks passed');
