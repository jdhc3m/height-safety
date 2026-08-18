export const WORKING_LEASE_DURATION_MS = 24 * 60 * 60 * 1000;
export const WORKING_RECOVERY_DURATION_MS = 60 * 60 * 1000;
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

export const ACCOUNT = Object.freeze({
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
});

export const MODE = Object.freeze({
  CAPTURE: 'CAPTURE',
  LOCKED: 'LOCKED',
  UPLOAD_ONLY: 'UPLOAD_ONLY',
});

export const LOCK_REASON = Object.freeze({
  NONE: 'NONE',
  DEVICE: 'DEVICE',
  LEASE_EXPIRED: 'LEASE_EXPIRED',
  REVOCATION: 'REVOCATION',
  KEYSTORE_LOST: 'KEYSTORE_LOST',
  CLOCK_ROLLBACK: 'CLOCK_ROLLBACK',
});

const LOCK_RANK = Object.freeze({
  [LOCK_REASON.NONE]: 0,
  [LOCK_REASON.DEVICE]: 1,
  [LOCK_REASON.LEASE_EXPIRED]: 2,
  [LOCK_REASON.CLOCK_ROLLBACK]: 3,
  [LOCK_REASON.REVOCATION]: 4,
  [LOCK_REASON.KEYSTORE_LOST]: 5,
});

export function createSession({
  nowMs = 0,
  companyId = 'company-a',
  inspectorId = 'inspector-1',
  deviceId = 'device-1',
  actorId = 'inspector-1',
  leaseDurationMs = WORKING_LEASE_DURATION_MS,
  recoveryDurationMs = WORKING_RECOVERY_DURATION_MS,
} = {}) {
  return {
    companyId,
    inspectorId,
    deviceId,
    leaseDurationMs,
    recoveryDurationMs,
    nowMs,
    highestObservedNowMs: nowMs,
    elapsedMs: 0,
    lastOnlineAuthAtMs: nowMs,
    leaseExpiresAtMs: nowMs + leaseDurationMs,
    leaseElapsedDeadlineMs: leaseDurationMs,
    serverAccountStatus: ACCOUNT.ACTIVE,
    deviceAccountStatus: ACCOUNT.ACTIVE,
    keystore: 'AVAILABLE',
    deviceUnlocked: true,
    lockReason: LOCK_REASON.NONE,
    mode: MODE.CAPTURE,
    localJobPackPresent: true,
    pendingMutations: [],
    pendingPhotos: [],
    conflict: false,
    serverAcknowledged: true,
    recovery: null,
    audit: [auditEvent(nowMs, 'SESSION_STARTED', actorId)],
  };
}

export function evidenceSnapshot(session) {
  return {
    localJobPackPresent: session.localJobPackPresent,
    mutations: session.pendingMutations.map((item) => ({
      id: item.id,
      fingerprint: item.fingerprint,
    })),
    photos: session.pendingPhotos.map((item) => ({
      id: item.id,
      checksum: item.checksum,
    })),
  };
}

export function apply(session, event) {
  const next = structuredClone(session);
  const result = dispatch(next, event);
  recompute(next);
  return { session: next, ...result };
}

function dispatch(session, event) {
  switch (event.type) {
    case 'tick':
      return tick(session, event);
    case 'saveMutation':
      return saveMutation(session, event);
    case 'savePhoto':
      return savePhoto(session, event);
    case 'markConflict':
      return markConflict(session, event);
    case 'lockDevice':
      return lockDevice(session, event);
    case 'unlockDevice':
      return unlockDevice(session, event);
    case 'revokeAccount':
      return revokeAccount(session, event);
    case 'refreshOnline':
      return refreshOnline(session, event);
    case 'logout':
      return logout(session, event);
    case 'cleanupLocal':
      return cleanupLocal(session, event);
    case 'authoriseRecovery':
      return authoriseRecovery(session, event);
    case 'syncPending':
      return syncPending(session, event);
    case 'loseKeystore':
      return loseKeystore(session, event);
    default:
      return deny(session, 'UNKNOWN_EVENT', event.actorId);
  }
}

function tick(session, event) {
  const wallNowMs = event.wallNowMs;
  const elapsedDeltaMs = event.elapsedDeltaMs ?? 0;
  if (elapsedDeltaMs < 0) {
    raiseLock(session, LOCK_REASON.CLOCK_ROLLBACK);
    session.recovery = null;
    audit(session, wallNowMs, 'CLOCK_ROLLBACK', event.actorId);
    return deny(session, 'CLOCK_ROLLBACK', event.actorId);
  }
  if (wallNowMs + CLOCK_SKEW_TOLERANCE_MS < session.highestObservedNowMs) {
    raiseLock(session, LOCK_REASON.CLOCK_ROLLBACK);
    session.recovery = null;
    session.nowMs = wallNowMs;
    audit(session, wallNowMs, 'CLOCK_ROLLBACK', event.actorId);
    return deny(session, 'CLOCK_ROLLBACK', event.actorId);
  }
  session.nowMs = wallNowMs;
  session.highestObservedNowMs = Math.max(session.highestObservedNowMs, wallNowMs);
  session.elapsedMs += elapsedDeltaMs;
  if (session.recovery && wallNowMs > session.recovery.expiresAtMs) {
    session.recovery = null;
    audit(session, wallNowMs, 'RECOVERY_EXPIRED', event.actorId);
  }
  return allow(session, 'TICK');
}

function saveMutation(session, event) {
  if (!canCapture(session)) return deny(session, captureDenial(session), event.actorId);
  session.pendingMutations.push({
    id: event.id,
    fingerprint: event.fingerprint,
  });
  session.serverAcknowledged = false;
  audit(session, session.nowMs, 'MUTATION_SAVED', event.actorId, { id: event.id });
  return allow(session, 'MUTATION_SAVED');
}

function savePhoto(session, event) {
  if (!canCapture(session)) return deny(session, captureDenial(session), event.actorId);
  session.pendingPhotos.push({
    id: event.id,
    checksum: event.checksum,
  });
  session.serverAcknowledged = false;
  audit(session, session.nowMs, 'PHOTO_SAVED', event.actorId, { id: event.id });
  return allow(session, 'PHOTO_SAVED');
}

function markConflict(session, event) {
  if (session.mode === MODE.LOCKED && session.lockReason !== LOCK_REASON.NONE) {
    return deny(session, 'LOCKED', event.actorId);
  }
  session.conflict = true;
  session.serverAcknowledged = false;
  audit(session, session.nowMs, 'CONFLICT_MARKED', event.actorId);
  return allow(session, 'CONFLICT_MARKED');
}

function lockDevice(session, event) {
  session.deviceUnlocked = false;
  audit(session, session.nowMs, 'DEVICE_LOCKED', event.actorId);
  return allow(session, 'DEVICE_LOCKED');
}

function unlockDevice(session, event) {
  if (event.deviceAuth !== true) return deny(session, 'DEVICE_AUTH_FAILED', event.actorId);
  session.deviceUnlocked = true;
  audit(session, session.nowMs, 'DEVICE_UNLOCKED', event.actorId);
  return allow(session, 'DEVICE_UNLOCKED');
}

function revokeAccount(session, event) {
  session.serverAccountStatus = ACCOUNT.REVOKED;
  audit(session, session.nowMs, 'ACCOUNT_REVOKED_SERVER', event.actorId);
  if (event.notifyDevice === true) {
    session.deviceAccountStatus = ACCOUNT.REVOKED;
    raiseLock(session, LOCK_REASON.REVOCATION);
    audit(session, session.nowMs, 'ACCOUNT_REVOKED_DEVICE', event.actorId);
  }
  return allow(session, 'ACCOUNT_REVOKED');
}

function refreshOnline(session, event) {
  if (event.reachable !== true) return deny(session, 'NETWORK_UNAVAILABLE', event.actorId);
  session.deviceAccountStatus = session.serverAccountStatus;
  if (session.serverAccountStatus === ACCOUNT.REVOKED) {
    raiseLock(session, LOCK_REASON.REVOCATION);
    audit(session, session.nowMs, 'REFRESH_CONFIRMED_REVOCATION', event.actorId);
    if (recoveryLive(session)) {
      return allow(session, 'RECOVERY_STILL_LIVE');
    }
    session.recovery = null;
    return deny(session, 'ACCOUNT_REVOKED', event.actorId);
  }
  if (session.keystore !== 'AVAILABLE') {
    return deny(session, 'KEYSTORE_LOST', event.actorId);
  }
  if (session.lockReason === LOCK_REASON.CLOCK_ROLLBACK) {
    session.lockReason = LOCK_REASON.NONE;
  }
  session.lastOnlineAuthAtMs = session.nowMs;
  session.leaseExpiresAtMs = session.nowMs + session.leaseDurationMs;
  session.leaseElapsedDeadlineMs = session.elapsedMs + session.leaseDurationMs;
  audit(session, session.nowMs, 'LEASE_RENEWED', event.actorId);
  return allow(session, 'LEASE_RENEWED');
}

function logout(session, event) {
  if (!canLogout(session)) return deny(session, logoutDenial(session), event.actorId);
  audit(session, session.nowMs, 'LOGOUT_ALLOWED', event.actorId);
  return allow(session, 'LOGOUT_ALLOWED');
}

function cleanupLocal(session, event) {
  if (!canCleanup(session)) return deny(session, cleanupDenial(session), event.actorId);
  session.localJobPackPresent = false;
  session.pendingMutations = [];
  session.pendingPhotos = [];
  session.conflict = false;
  session.serverAcknowledged = true;
  audit(session, session.nowMs, 'LOCAL_CLEANUP', event.actorId);
  return allow(session, 'LOCAL_CLEANUP');
}

function authoriseRecovery(session, event) {
  if (event.actorRole !== 'Administrator') {
    return deny(session, 'RECOVERY_REQUIRES_ADMINISTRATOR', event.actorId);
  }
  if (event.companyId !== session.companyId) {
    return deny(session, 'CROSS_COMPANY_DENIED', event.actorId);
  }
  if (session.keystore !== 'AVAILABLE') {
    return deny(session, 'KEYSTORE_LOST', event.actorId);
  }
  if (!session.deviceUnlocked) {
    return deny(session, 'DEVICE_LOCKED', event.actorId);
  }
  if (session.serverAccountStatus !== ACCOUNT.REVOKED) {
    return deny(session, 'RECOVERY_ONLY_WHEN_REVOKED', event.actorId);
  }
  session.deviceAccountStatus = ACCOUNT.REVOKED;
  session.recovery = {
    actorId: event.actorId,
    kind: 'UPLOAD_ONLY',
    grantedAtMs: session.nowMs,
    expiresAtMs: session.nowMs + session.recoveryDurationMs,
  };
  audit(session, session.nowMs, 'RECOVERY_AUTHORISED', event.actorId, { kind: 'UPLOAD_ONLY' });
  return allow(session, 'RECOVERY_AUTHORISED');
}

function syncPending(session, event) {
  if (!canUpload(session)) return deny(session, uploadDenial(session), event.actorId);
  const mutationIds = new Set(event.acknowledgedMutationIds ?? []);
  const photoIds = new Set(event.acknowledgedPhotoIds ?? []);
  session.pendingMutations = session.pendingMutations.filter((item) => !mutationIds.has(item.id));
  session.pendingPhotos = session.pendingPhotos.filter((item) => !photoIds.has(item.id));
  if (!hasPendingEvidence(session) && !session.conflict) {
    session.serverAcknowledged = true;
  }
  audit(session, session.nowMs, 'PENDING_SYNCED', event.actorId);
  return allow(session, 'PENDING_SYNCED');
}

function loseKeystore(session, event) {
  session.keystore = 'PERMANENTLY_LOST';
  session.recovery = null;
  raiseLock(session, LOCK_REASON.KEYSTORE_LOST);
  audit(session, session.nowMs, 'KEYSTORE_LOST', event.actorId);
  return allow(session, 'KEYSTORE_LOST');
}

function recompute(session) {
  if (session.keystore !== 'AVAILABLE') {
    session.lockReason = LOCK_REASON.KEYSTORE_LOST;
    session.mode = MODE.LOCKED;
    return;
  }
  if (session.lockReason === LOCK_REASON.CLOCK_ROLLBACK) {
    session.mode = MODE.LOCKED;
    return;
  }
  if (session.deviceAccountStatus === ACCOUNT.REVOKED) {
    raiseLock(session, LOCK_REASON.REVOCATION);
    if (recoveryLive(session) && session.deviceUnlocked) {
      session.mode = MODE.UPLOAD_ONLY;
      return;
    }
    session.mode = MODE.LOCKED;
    return;
  }
  if (!session.deviceUnlocked) {
    raiseLock(session, LOCK_REASON.DEVICE);
    session.mode = MODE.LOCKED;
    return;
  }
  if (leaseExpired(session)) {
    raiseLock(session, LOCK_REASON.LEASE_EXPIRED);
    session.mode = MODE.LOCKED;
    return;
  }
  session.lockReason = LOCK_REASON.NONE;
  session.mode = MODE.CAPTURE;
}

function leaseExpired(session) {
  return session.nowMs > session.leaseExpiresAtMs
    || session.elapsedMs > session.leaseElapsedDeadlineMs;
}

function recoveryLive(session) {
  return Boolean(session.recovery)
    && session.nowMs <= session.recovery.expiresAtMs;
}

function hasPendingEvidence(session) {
  return session.pendingMutations.length > 0 || session.pendingPhotos.length > 0;
}

function canCapture(session) {
  return session.mode === MODE.CAPTURE
    && session.lockReason === LOCK_REASON.NONE
    && session.deviceAccountStatus === ACCOUNT.ACTIVE
    && session.keystore === 'AVAILABLE'
    && session.deviceUnlocked
    && !leaseExpired(session);
}

function canUpload(session) {
  if (session.keystore !== 'AVAILABLE' || !session.deviceUnlocked) return false;
  if (recoveryLive(session)) return session.mode === MODE.UPLOAD_ONLY;
  if (session.serverAccountStatus !== ACCOUNT.ACTIVE) return false;
  return session.mode === MODE.CAPTURE;
}

function canLogout(session) {
  return !hasPendingEvidence(session)
    && !session.conflict
    && session.serverAcknowledged
    && session.deviceAccountStatus === ACCOUNT.ACTIVE;
}

function canCleanup(session) {
  return !hasPendingEvidence(session)
    && !session.conflict
    && session.serverAcknowledged
    && session.localJobPackPresent
    && (session.deviceAccountStatus === ACCOUNT.ACTIVE || recoveryLive(session) || session.lockReason === LOCK_REASON.REVOCATION);
}

function captureDenial(session) {
  if (session.keystore !== 'AVAILABLE') return 'KEYSTORE_LOST';
  if (session.lockReason === LOCK_REASON.CLOCK_ROLLBACK) return 'CLOCK_ROLLBACK';
  if (session.deviceAccountStatus === ACCOUNT.REVOKED) return 'ACCOUNT_REVOKED';
  if (!session.deviceUnlocked) return 'DEVICE_LOCKED';
  if (leaseExpired(session)) return 'LEASE_EXPIRED';
  return 'LOCKED';
}

function uploadDenial(session) {
  if (session.keystore !== 'AVAILABLE') return 'KEYSTORE_LOST';
  if (!session.deviceUnlocked) return 'DEVICE_LOCKED';
  if (session.serverAccountStatus === ACCOUNT.REVOKED && !recoveryLive(session)) {
    return 'RECOVERY_REQUIRED';
  }
  return 'LOCKED';
}

function logoutDenial(session) {
  if (session.deviceAccountStatus === ACCOUNT.REVOKED) return 'ACCOUNT_REVOKED';
  if (hasPendingEvidence(session)) return 'PENDING_EVIDENCE';
  if (session.conflict) return 'UNRESOLVED_CONFLICT';
  if (!session.serverAcknowledged) return 'SERVER_UNACKNOWLEDGED';
  return 'LOGOUT_BLOCKED';
}

function cleanupDenial(session) {
  if (hasPendingEvidence(session)) return 'PENDING_EVIDENCE';
  if (session.conflict) return 'UNRESOLVED_CONFLICT';
  if (!session.serverAcknowledged) return 'SERVER_UNACKNOWLEDGED';
  if (!session.localJobPackPresent) return 'ALREADY_CLEAN';
  return 'CLEANUP_BLOCKED';
}

function raiseLock(session, reason) {
  if (LOCK_RANK[reason] >= LOCK_RANK[session.lockReason]) {
    session.lockReason = reason;
  }
}

function audit(session, atMs, action, actorId, detail) {
  session.audit.push(auditEvent(atMs, action, actorId, detail));
}

function auditEvent(atMs, action, actorId, detail) {
  return {
    atMs,
    action,
    actorId: actorId ?? null,
    ...(detail ? { detail } : {}),
  };
}

function allow(session, reason) {
  return {
    ok: true,
    reason,
    serverAccessAllowed: session.serverAccountStatus === ACCOUNT.ACTIVE,
    evidence: evidenceSnapshot(session),
  };
}

function deny(session, reason, actorId) {
  audit(session, session.nowMs, `DENIED_${reason}`, actorId);
  return {
    ok: false,
    reason,
    serverAccessAllowed: session.serverAccountStatus === ACCOUNT.ACTIVE,
    evidence: evidenceSnapshot(session),
  };
}
