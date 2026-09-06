package au.com.heightsafety.domain

public const val OFFLINE_RECOVERY_WINDOW_DURATION_MILLIS: Long =
    60L * 60L * 1_000L
public const val OFFLINE_CLOCK_SKEW_TOLERANCE_MILLIS: Long =
    5L * 60L * 1_000L

public enum class OfflineAccountStatus {
    ACTIVE,
    REVOKED,
}

public enum class OfflineAccessMode {
    CAPTURE,
    LOCKED,
    UPLOAD_ONLY,
}

public enum class OfflineAccessLockReason {
    NONE,
    DEVICE,
    LEASE_EXPIRED,
    CLOCK_ROLLBACK,
    REVOCATION,
    KEYSTORE_LOST,
}

public enum class OfflineKeystoreState {
    AVAILABLE,
    PERMANENTLY_LOST,
}

public enum class OfflineAccessDecisionReason {
    ALLOWED,
    TICK,
    MUTATION_SAVED,
    PHOTO_SAVED,
    CONFLICT_MARKED,
    PENDING_SYNCED,
    LEASE_RENEWED,
    RECOVERY_STILL_LIVE,
    RECOVERY_AUTHORISED,
    DEVICE_LOCKED,
    DEVICE_UNLOCKED,
    KEYSTORE_LOST,
    LOGOUT_ALLOWED,
    LOCAL_CLEANUP,
    NETWORK_UNAVAILABLE,
    DEVICE_AUTH_FAILED,
    DEVICE_LOCKED_DENIED,
    LEASE_EXPIRED_DENIED,
    CLOCK_ROLLBACK_DENIED,
    ACCOUNT_REVOKED,
    RECOVERY_REQUIRED,
    RECOVERY_EXPIRED,
    RECOVERY_REQUIRES_ADMINISTRATOR,
    CROSS_COMPANY_DENIED,
    RECOVERY_ONLY_WHEN_REVOKED,
    PENDING_EVIDENCE,
    UNRESOLVED_CONFLICT,
    SERVER_UNACKNOWLEDGED,
    LOCAL_PACK_MISSING,
    ALREADY_CLEAN,
    CLEANUP_BLOCKED,
    LOCKED_DENIED,
}

public enum class OfflineAccessAuditAction {
    SESSION_STARTED,
    CLOCK_ROLLBACK,
    RECOVERY_EXPIRED,
    MUTATION_SAVED,
    PHOTO_SAVED,
    CONFLICT_MARKED,
    CONFLICT_RESOLVED,
    DEVICE_LOCKED,
    DEVICE_UNLOCKED,
    ACCOUNT_REVOKED_SERVER,
    ACCOUNT_ACTIVE_OBSERVED,
    ACCOUNT_REVOKED_DEVICE,
    REFRESH_FAILED,
    REFRESH_CONFIRMED_REVOCATION,
    LEASE_RENEWED,
    LOGOUT_ALLOWED,
    LOCAL_CLEANUP,
    RECOVERY_AUTHORISED,
    PENDING_SYNCED,
    KEYSTORE_LOST,
    ACCESS_DENIED,
}

public data class OfflineAccessAuditEvent(
    public val atEpochMillis: Long,
    public val action: OfflineAccessAuditAction,
    public val actorUserId: String?,
) {
    init {
        require(atEpochMillis >= 0) { "audit time must not be negative" }
        require(actorUserId == null || actorUserId.isNotBlank()) {
            "audit actorUserId must not be blank"
        }
    }
}

public data class OfflineEvidenceLedger(
    public val pendingMutationIds: Set<String> = emptySet(),
    public val pendingPhotoIds: Set<String> = emptySet(),
    public val unresolvedConflictIds: Set<String> = emptySet(),
    public val serverAcknowledged: Boolean = true,
) {
    init {
        require(pendingMutationIds.all(String::isNotBlank)) {
            "pending mutation IDs must not be blank"
        }
        require(pendingPhotoIds.all(String::isNotBlank)) {
            "pending photo IDs must not be blank"
        }
        require(unresolvedConflictIds.all(String::isNotBlank)) {
            "conflict IDs must not be blank"
        }
    }

    public val hasPendingEvidence: Boolean
        get() = pendingMutationIds.isNotEmpty() || pendingPhotoIds.isNotEmpty()

    public val hasUnresolvedConflicts: Boolean
        get() = unresolvedConflictIds.isNotEmpty()

    public val isSettled: Boolean
        get() =
            !hasPendingEvidence &&
                !hasUnresolvedConflicts &&
                serverAcknowledged
}

public data class OfflineUploadRecovery(
    public val companyId: String,
    public val administratorUserId: String,
    public val grantedAtEpochMillis: Long,
    public val expiresAtEpochMillis: Long,
) {
    init {
        require(companyId.isNotBlank()) { "recovery companyId is required" }
        require(administratorUserId.isNotBlank()) {
            "recovery administratorUserId is required"
        }
        require(grantedAtEpochMillis >= 0) {
            "recovery grant time must not be negative"
        }
        require(expiresAtEpochMillis > grantedAtEpochMillis) {
            "recovery expiry must be after grant time"
        }
    }

    public fun isLive(nowEpochMillis: Long): Boolean {
        require(nowEpochMillis >= 0) { "current epoch time must not be negative" }
        return nowEpochMillis < expiresAtEpochMillis
    }
}

public data class OfflineAccessTransition(
    public val state: FieldOfflineAccessState,
    public val allowed: Boolean,
    public val reason: OfflineAccessDecisionReason,
)

/**
 * Product-domain state machine for the D-025 offline lease and recovery rules.
 * It contains no Android, persistence, network or identity-provider APIs.
 */
public data class FieldOfflineAccessState(
    public val companyId: String,
    public val userId: String,
    public val nowEpochMillis: Long,
    public val highestObservedEpochMillis: Long,
    public val elapsedRealtimeMillis: Long,
    public val lastOnlineAuthorizationEpochMillis: Long,
    public val leaseDurationMillis: Long,
    public val leaseExpiresAtEpochMillis: Long,
    public val leaseElapsedDeadlineMillis: Long,
    public val serverAccountStatus: OfflineAccountStatus,
    public val deviceAccountStatus: OfflineAccountStatus,
    public val keystoreState: OfflineKeystoreState,
    public val deviceUnlocked: Boolean,
    public val mode: OfflineAccessMode,
    public val lockReason: OfflineAccessLockReason,
    public val evidence: OfflineEvidenceLedger,
    public val localJobPackPresent: Boolean,
    public val recovery: OfflineUploadRecovery?,
    public val audit: List<OfflineAccessAuditEvent>,
) {
    init {
        require(companyId.isNotBlank()) { "offline access companyId is required" }
        require(userId.isNotBlank()) { "offline access userId is required" }
        require(nowEpochMillis >= 0) { "current epoch time must not be negative" }
        require(highestObservedEpochMillis >= nowEpochMillis) {
            "highest observed time cannot precede current time"
        }
        require(elapsedRealtimeMillis >= 0) {
            "elapsed runtime must not be negative"
        }
        require(lastOnlineAuthorizationEpochMillis >= 0) {
            "last online authorization time must not be negative"
        }
        require(leaseDurationMillis > 0) { "lease duration must be positive" }
        require(
            lastOnlineAuthorizationEpochMillis <=
                Long.MAX_VALUE - leaseDurationMillis,
        ) {
            "last online authorization time is too large"
        }
        require(leaseExpiresAtEpochMillis > lastOnlineAuthorizationEpochMillis) {
            "lease expiry must be after last online authorization"
        }
        require(leaseExpiresAtEpochMillis ==
            lastOnlineAuthorizationEpochMillis + leaseDurationMillis
        ) {
            "lease expiry must match lease duration"
        }
        require(recovery == null || recovery.companyId == companyId) {
            "recovery companyId must match offline access companyId"
        }
    }

    public fun tick(
        nowEpochMillis: Long,
        elapsedDeltaMillis: Long,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        require(nowEpochMillis >= 0) { "current epoch time must not be negative" }
        require(actorUserId == null || actorUserId.isNotBlank()) {
            "actorUserId must not be blank"
        }

        if (elapsedDeltaMillis < 0) {
            val next = copy(
                nowEpochMillis = nowEpochMillis,
                recovery = null,
            ).raiseLock(OfflineAccessLockReason.CLOCK_ROLLBACK)
                .appendAudit(
                    OfflineAccessAuditAction.CLOCK_ROLLBACK,
                    actorUserId,
                )
                .recompute()
            return next.transition(false, OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED)
        }
        require(elapsedRealtimeMillis <= Long.MAX_VALUE - elapsedDeltaMillis) {
            "elapsed runtime is too large"
        }

        val wallClockRolledBack =
            nowEpochMillis < highestObservedEpochMillis &&
                highestObservedEpochMillis - nowEpochMillis >
                OFFLINE_CLOCK_SKEW_TOLERANCE_MILLIS
        var next = copy(
            nowEpochMillis = nowEpochMillis,
            highestObservedEpochMillis = maxOf(highestObservedEpochMillis, nowEpochMillis),
            elapsedRealtimeMillis = elapsedRealtimeMillis + elapsedDeltaMillis,
        )
        if (wallClockRolledBack) {
            next = next.copy(recovery = null)
                .raiseLock(OfflineAccessLockReason.CLOCK_ROLLBACK)
                .appendAudit(
                    OfflineAccessAuditAction.CLOCK_ROLLBACK,
                    actorUserId,
                )
                .recompute()
            return next.transition(false, OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED)
        }

        if (next.recovery != null && !next.recovery.isLive(nowEpochMillis)) {
            next = next.copy(recovery = null).appendAudit(
                OfflineAccessAuditAction.RECOVERY_EXPIRED,
                actorUserId,
            )
        }
        return next.recompute().transition(true, OfflineAccessDecisionReason.TICK)
    }

    public fun recordMutation(
        mutationId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        require(mutationId.isNotBlank()) { "mutationId is required" }
        if (!canCapture()) {
            return denied(captureDenialReason(), actorUserId)
        }
        val next = copy(
            evidence = evidence.copy(
                pendingMutationIds = evidence.pendingMutationIds + mutationId,
                serverAcknowledged = false,
            ),
        ).appendAudit(OfflineAccessAuditAction.MUTATION_SAVED, actorUserId)
        return next.transition(true, OfflineAccessDecisionReason.MUTATION_SAVED)
    }

    public fun recordPhoto(
        photoId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        require(photoId.isNotBlank()) { "photoId is required" }
        if (!canCapture()) {
            return denied(captureDenialReason(), actorUserId)
        }
        val next = copy(
            evidence = evidence.copy(
                pendingPhotoIds = evidence.pendingPhotoIds + photoId,
                serverAcknowledged = false,
            ),
        ).appendAudit(OfflineAccessAuditAction.PHOTO_SAVED, actorUserId)
        return next.transition(true, OfflineAccessDecisionReason.PHOTO_SAVED)
    }

    public fun markConflict(
        conflictId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        require(conflictId.isNotBlank()) { "conflictId is required" }
        if (mode == OfflineAccessMode.LOCKED && lockReason != OfflineAccessLockReason.NONE) {
            return denied(OfflineAccessDecisionReason.LOCKED_DENIED, actorUserId)
        }
        val next = copy(
            evidence = evidence.copy(
                unresolvedConflictIds = evidence.unresolvedConflictIds + conflictId,
                serverAcknowledged = false,
            ),
        ).appendAudit(OfflineAccessAuditAction.CONFLICT_MARKED, actorUserId)
        return next.transition(true, OfflineAccessDecisionReason.CONFLICT_MARKED)
    }

    public fun resolveConflict(
        conflictId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        require(conflictId.isNotBlank()) { "conflictId is required" }
        if (!canUpload()) {
            return denied(uploadDenialReason(), actorUserId)
        }
        val next = copy(
            evidence = evidence.copy(
                unresolvedConflictIds = evidence.unresolvedConflictIds - conflictId,
                serverAcknowledged =
                    evidence.unresolvedConflictIds - conflictId == emptySet<String>() &&
                        !evidence.hasPendingEvidence,
            ),
        ).appendAudit(OfflineAccessAuditAction.CONFLICT_RESOLVED, actorUserId)
        return next.transition(true, OfflineAccessDecisionReason.PENDING_SYNCED)
    }

    public fun acknowledgePending(
        mutationIds: Set<String> = emptySet(),
        photoIds: Set<String> = emptySet(),
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        require(mutationIds.all(String::isNotBlank)) {
            "mutation IDs must not be blank"
        }
        require(photoIds.all(String::isNotBlank)) {
            "photo IDs must not be blank"
        }
        if (!canUpload()) {
            return denied(uploadDenialReason(), actorUserId)
        }
        val pendingMutations = evidence.pendingMutationIds - mutationIds
        val pendingPhotos = evidence.pendingPhotoIds - photoIds
        val serverAcknowledged =
            pendingMutations.isEmpty() &&
                pendingPhotos.isEmpty() &&
                !evidence.hasUnresolvedConflicts
        val next = copy(
            evidence = evidence.copy(
                pendingMutationIds = pendingMutations,
                pendingPhotoIds = pendingPhotos,
                serverAcknowledged = serverAcknowledged,
            ),
        ).appendAudit(OfflineAccessAuditAction.PENDING_SYNCED, actorUserId)
        return next.transition(true, OfflineAccessDecisionReason.PENDING_SYNCED)
    }

    public fun lockDevice(actorUserId: String? = null): OfflineAccessTransition {
        val next = copy(deviceUnlocked = false)
            .appendAudit(OfflineAccessAuditAction.DEVICE_LOCKED, actorUserId)
            .recompute()
        return next.transition(true, OfflineAccessDecisionReason.DEVICE_LOCKED)
    }

    public fun unlockDevice(
        deviceAuthenticated: Boolean,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        if (!deviceAuthenticated) {
            return denied(OfflineAccessDecisionReason.DEVICE_AUTH_FAILED, actorUserId)
        }
        if (keystoreState != OfflineKeystoreState.AVAILABLE) {
            return denied(OfflineAccessDecisionReason.KEYSTORE_LOST, actorUserId)
        }
        val next = copy(deviceUnlocked = true)
            .appendAudit(OfflineAccessAuditAction.DEVICE_UNLOCKED, actorUserId)
            .recompute()
        return next.transition(true, OfflineAccessDecisionReason.DEVICE_UNLOCKED)
    }

    /** Records central account state; device notification controls immediate lock. */
    public fun observeServerAccountStatus(
        status: OfflineAccountStatus,
        deviceNotified: Boolean,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        var next = copy(serverAccountStatus = status).appendAudit(
            if (status == OfflineAccountStatus.REVOKED) {
                OfflineAccessAuditAction.ACCOUNT_REVOKED_SERVER
            } else {
                OfflineAccessAuditAction.ACCOUNT_ACTIVE_OBSERVED
            },
            actorUserId,
        )
        if (status == OfflineAccountStatus.REVOKED && deviceNotified) {
            next = next.copy(deviceAccountStatus = OfflineAccountStatus.REVOKED)
                .raiseLock(OfflineAccessLockReason.REVOCATION)
                .appendAudit(
                    OfflineAccessAuditAction.ACCOUNT_REVOKED_DEVICE,
                    actorUserId,
                )
        }
        return next.recompute().transition(true, OfflineAccessDecisionReason.ALLOWED)
    }

    public fun refreshOnline(
        reachable: Boolean,
        serverAccountStatus: OfflineAccountStatus,
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        if (!reachable) {
            val next = appendAudit(OfflineAccessAuditAction.REFRESH_FAILED, actorUserId)
            return next.transition(false, OfflineAccessDecisionReason.NETWORK_UNAVAILABLE)
        }

        if (serverAccountStatus == OfflineAccountStatus.REVOKED) {
            var next = copy(
                serverAccountStatus = OfflineAccountStatus.REVOKED,
                deviceAccountStatus = OfflineAccountStatus.REVOKED,
            ).raiseLock(OfflineAccessLockReason.REVOCATION)
                .appendAudit(
                    OfflineAccessAuditAction.REFRESH_CONFIRMED_REVOCATION,
                    actorUserId,
                )
            if (next.recovery?.isLive(nowEpochMillis) == true && next.deviceUnlocked) {
                return next.recompute().transition(
                    true,
                    OfflineAccessDecisionReason.RECOVERY_STILL_LIVE,
                )
            }
            next = next.copy(recovery = null).recompute()
            return next.transition(false, OfflineAccessDecisionReason.ACCOUNT_REVOKED)
        }

        if (keystoreState != OfflineKeystoreState.AVAILABLE) {
            return denied(OfflineAccessDecisionReason.KEYSTORE_LOST, actorUserId)
        }
        require(nowEpochMillis <= Long.MAX_VALUE - leaseDurationMillis) {
            "lease issue time is too large"
        }
        require(elapsedRealtimeMillis <= Long.MAX_VALUE - leaseDurationMillis) {
            "lease elapsed issue time is too large"
        }
        val next = copy(
            serverAccountStatus = OfflineAccountStatus.ACTIVE,
            deviceAccountStatus = OfflineAccountStatus.ACTIVE,
            lastOnlineAuthorizationEpochMillis = nowEpochMillis,
            leaseExpiresAtEpochMillis =
                nowEpochMillis + leaseDurationMillis,
            leaseElapsedDeadlineMillis =
                elapsedRealtimeMillis + leaseDurationMillis,
            recovery = null,
            lockReason = OfflineAccessLockReason.NONE,
        ).appendAudit(OfflineAccessAuditAction.LEASE_RENEWED, actorUserId)
            .recompute()
        return next.transition(true, OfflineAccessDecisionReason.LEASE_RENEWED)
    }

    public fun authoriseUploadOnlyRecovery(
        administratorCompanyId: String,
        administratorUserId: String,
        administratorRole: ProductRole,
        actorUserId: String? = administratorUserId,
    ): OfflineAccessTransition {
        require(administratorCompanyId.isNotBlank()) {
            "administratorCompanyId is required"
        }
        require(administratorUserId.isNotBlank()) {
            "administratorUserId is required"
        }
        if (administratorRole != ProductRole.ADMINISTRATOR) {
            return denied(
                OfflineAccessDecisionReason.RECOVERY_REQUIRES_ADMINISTRATOR,
                actorUserId,
            )
        }
        if (administratorCompanyId != companyId) {
            return denied(OfflineAccessDecisionReason.CROSS_COMPANY_DENIED, actorUserId)
        }
        if (keystoreState != OfflineKeystoreState.AVAILABLE) {
            return denied(OfflineAccessDecisionReason.KEYSTORE_LOST, actorUserId)
        }
        if (!deviceUnlocked) {
            return denied(OfflineAccessDecisionReason.DEVICE_LOCKED_DENIED, actorUserId)
        }
        if (lockReason == OfflineAccessLockReason.CLOCK_ROLLBACK) {
            return denied(OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED, actorUserId)
        }
        if (serverAccountStatus != OfflineAccountStatus.REVOKED) {
            return denied(
                OfflineAccessDecisionReason.RECOVERY_ONLY_WHEN_REVOKED,
                actorUserId,
            )
        }
        require(nowEpochMillis <= Long.MAX_VALUE - OFFLINE_RECOVERY_WINDOW_DURATION_MILLIS) {
            "recovery grant time is too large"
        }
        val next = copy(
            deviceAccountStatus = OfflineAccountStatus.REVOKED,
            recovery = OfflineUploadRecovery(
                companyId = companyId,
                administratorUserId = administratorUserId,
                grantedAtEpochMillis = nowEpochMillis,
                expiresAtEpochMillis =
                    nowEpochMillis + OFFLINE_RECOVERY_WINDOW_DURATION_MILLIS,
            ),
        ).raiseLock(OfflineAccessLockReason.REVOCATION)
            .appendAudit(OfflineAccessAuditAction.RECOVERY_AUTHORISED, actorUserId)
            .recompute()
        return next.transition(true, OfflineAccessDecisionReason.RECOVERY_AUTHORISED)
    }

    public fun requestLogout(actorUserId: String? = null): OfflineAccessTransition {
        val reason = when {
            deviceAccountStatus == OfflineAccountStatus.REVOKED ->
                OfflineAccessDecisionReason.ACCOUNT_REVOKED
            evidence.hasPendingEvidence -> OfflineAccessDecisionReason.PENDING_EVIDENCE
            evidence.hasUnresolvedConflicts ->
                OfflineAccessDecisionReason.UNRESOLVED_CONFLICT
            !evidence.serverAcknowledged ->
                OfflineAccessDecisionReason.SERVER_UNACKNOWLEDGED
            else -> null
        }
        if (reason != null) return denied(reason, actorUserId)
        val next = appendAudit(OfflineAccessAuditAction.LOGOUT_ALLOWED, actorUserId)
        return next.transition(true, OfflineAccessDecisionReason.LOGOUT_ALLOWED)
    }

    public fun cleanupLocal(actorUserId: String? = null): OfflineAccessTransition {
        val reason = when {
            keystoreState != OfflineKeystoreState.AVAILABLE ->
                OfflineAccessDecisionReason.KEYSTORE_LOST
            evidence.hasPendingEvidence -> OfflineAccessDecisionReason.PENDING_EVIDENCE
            evidence.hasUnresolvedConflicts ->
                OfflineAccessDecisionReason.UNRESOLVED_CONFLICT
            !evidence.serverAcknowledged ->
                OfflineAccessDecisionReason.SERVER_UNACKNOWLEDGED
            !localJobPackPresent -> OfflineAccessDecisionReason.ALREADY_CLEAN
            deviceAccountStatus == OfflineAccountStatus.REVOKED &&
                lockReason != OfflineAccessLockReason.REVOCATION &&
                recovery == null -> OfflineAccessDecisionReason.CLEANUP_BLOCKED
            else -> null
        }
        if (reason != null) return denied(reason, actorUserId)
        val next = copy(
            evidence = OfflineEvidenceLedger(),
            localJobPackPresent = false,
        ).appendAudit(OfflineAccessAuditAction.LOCAL_CLEANUP, actorUserId)
            .recompute()
        return next.transition(true, OfflineAccessDecisionReason.LOCAL_CLEANUP)
    }

    public fun loseKeystore(actorUserId: String? = null): OfflineAccessTransition {
        val next = copy(
            keystoreState = OfflineKeystoreState.PERMANENTLY_LOST,
            recovery = null,
        ).raiseLock(OfflineAccessLockReason.KEYSTORE_LOST)
            .appendAudit(OfflineAccessAuditAction.KEYSTORE_LOST, actorUserId)
            .recompute()
        return next.transition(true, OfflineAccessDecisionReason.KEYSTORE_LOST)
    }

    public fun canCapture(): Boolean =
        mode == OfflineAccessMode.CAPTURE &&
            lockReason == OfflineAccessLockReason.NONE &&
            deviceAccountStatus == OfflineAccountStatus.ACTIVE &&
            keystoreState == OfflineKeystoreState.AVAILABLE &&
            deviceUnlocked &&
            localJobPackPresent &&
            !leaseExpired()

    public fun canUpload(): Boolean {
        if (
            keystoreState != OfflineKeystoreState.AVAILABLE ||
            !deviceUnlocked ||
            !localJobPackPresent
        ) {
            return false
        }
        if (recovery?.isLive(nowEpochMillis) == true) {
            return mode == OfflineAccessMode.UPLOAD_ONLY
        }
        return serverAccountStatus == OfflineAccountStatus.ACTIVE &&
            mode == OfflineAccessMode.CAPTURE
    }

    private fun leaseExpired(): Boolean =
        nowEpochMillis >= leaseExpiresAtEpochMillis ||
            elapsedRealtimeMillis >= leaseElapsedDeadlineMillis

    private fun captureDenialReason(): OfflineAccessDecisionReason = when {
        keystoreState != OfflineKeystoreState.AVAILABLE ->
            OfflineAccessDecisionReason.KEYSTORE_LOST
        lockReason == OfflineAccessLockReason.CLOCK_ROLLBACK ->
            OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED
        deviceAccountStatus == OfflineAccountStatus.REVOKED ->
            OfflineAccessDecisionReason.ACCOUNT_REVOKED
        !deviceUnlocked -> OfflineAccessDecisionReason.DEVICE_LOCKED_DENIED
        !localJobPackPresent -> OfflineAccessDecisionReason.LOCAL_PACK_MISSING
        leaseExpired() -> OfflineAccessDecisionReason.LEASE_EXPIRED_DENIED
        else -> OfflineAccessDecisionReason.LOCKED_DENIED
    }

    private fun uploadDenialReason(): OfflineAccessDecisionReason = when {
        keystoreState != OfflineKeystoreState.AVAILABLE ->
            OfflineAccessDecisionReason.KEYSTORE_LOST
        !deviceUnlocked -> OfflineAccessDecisionReason.DEVICE_LOCKED_DENIED
        !localJobPackPresent -> OfflineAccessDecisionReason.LOCAL_PACK_MISSING
        serverAccountStatus == OfflineAccountStatus.REVOKED &&
            recovery?.isLive(nowEpochMillis) != true ->
            OfflineAccessDecisionReason.RECOVERY_REQUIRED
        recovery != null && !recovery.isLive(nowEpochMillis) ->
            OfflineAccessDecisionReason.RECOVERY_EXPIRED
        leaseExpired() -> OfflineAccessDecisionReason.LEASE_EXPIRED_DENIED
        else -> OfflineAccessDecisionReason.LOCKED_DENIED
    }

    private fun denied(
        reason: OfflineAccessDecisionReason,
        actorUserId: String?,
    ): OfflineAccessTransition = appendAudit(
        OfflineAccessAuditAction.ACCESS_DENIED,
        actorUserId,
    ).transition(false, reason)

    private fun transition(
        allowed: Boolean,
        reason: OfflineAccessDecisionReason,
    ): OfflineAccessTransition = OfflineAccessTransition(
        state = this,
        allowed = allowed,
        reason = reason,
    )

    private fun appendAudit(
        action: OfflineAccessAuditAction,
        actorUserId: String?,
    ): FieldOfflineAccessState = copy(
        audit = audit + OfflineAccessAuditEvent(
            atEpochMillis = nowEpochMillis,
            action = action,
            actorUserId = actorUserId,
        ),
    )

    private fun raiseLock(reason: OfflineAccessLockReason): FieldOfflineAccessState =
        if (LOCK_RANK.getValue(reason) >= LOCK_RANK.getValue(lockReason)) {
            copy(lockReason = reason)
        } else {
            this
        }

    private fun recompute(): FieldOfflineAccessState {
        if (keystoreState != OfflineKeystoreState.AVAILABLE) {
            return copy(
                lockReason = OfflineAccessLockReason.KEYSTORE_LOST,
                mode = OfflineAccessMode.LOCKED,
            )
        }
        if (lockReason == OfflineAccessLockReason.CLOCK_ROLLBACK) {
            return copy(mode = OfflineAccessMode.LOCKED)
        }
        if (deviceAccountStatus == OfflineAccountStatus.REVOKED) {
            val recoveryLive = recovery?.isLive(nowEpochMillis) == true
            return copy(
                lockReason = raisedLockReason(OfflineAccessLockReason.REVOCATION),
                mode = if (recoveryLive && deviceUnlocked) {
                    OfflineAccessMode.UPLOAD_ONLY
                } else {
                    OfflineAccessMode.LOCKED
                },
            )
        }
        if (!deviceUnlocked) {
            return copy(
                lockReason = raisedLockReason(OfflineAccessLockReason.DEVICE),
                mode = OfflineAccessMode.LOCKED,
            )
        }
        if (leaseExpired()) {
            return copy(
                lockReason = raisedLockReason(OfflineAccessLockReason.LEASE_EXPIRED),
                mode = OfflineAccessMode.LOCKED,
            )
        }
        return copy(
            lockReason = OfflineAccessLockReason.NONE,
            mode = OfflineAccessMode.CAPTURE,
        )
    }

    private fun raisedLockReason(reason: OfflineAccessLockReason): OfflineAccessLockReason =
        if (LOCK_RANK.getValue(reason) >= LOCK_RANK.getValue(lockReason)) {
            reason
        } else {
            lockReason
        }

    public companion object {
        private val LOCK_RANK = mapOf(
            OfflineAccessLockReason.NONE to 0,
            OfflineAccessLockReason.DEVICE to 1,
            OfflineAccessLockReason.LEASE_EXPIRED to 2,
            OfflineAccessLockReason.CLOCK_ROLLBACK to 3,
            OfflineAccessLockReason.REVOCATION to 4,
            OfflineAccessLockReason.KEYSTORE_LOST to 5,
        )

        public fun start(
            companyId: String,
            userId: String,
            nowEpochMillis: Long = 0L,
            elapsedRealtimeMillis: Long = 0L,
            leaseDurationMillis: Long = OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS,
        ): FieldOfflineAccessState {
            require(companyId.isNotBlank()) { "companyId is required" }
            require(userId.isNotBlank()) { "userId is required" }
            require(nowEpochMillis >= 0) { "current epoch time must not be negative" }
            require(elapsedRealtimeMillis >= 0) {
                "elapsed runtime must not be negative"
            }
            require(leaseDurationMillis > 0) {
                "lease duration must be positive"
            }
            require(nowEpochMillis <= Long.MAX_VALUE - leaseDurationMillis) {
                "lease issue time is too large"
            }
            require(elapsedRealtimeMillis <= Long.MAX_VALUE - leaseDurationMillis) {
                "lease elapsed issue time is too large"
            }
            val state = FieldOfflineAccessState(
                companyId = companyId,
                userId = userId,
                nowEpochMillis = nowEpochMillis,
                highestObservedEpochMillis = nowEpochMillis,
                elapsedRealtimeMillis = elapsedRealtimeMillis,
                lastOnlineAuthorizationEpochMillis = nowEpochMillis,
                leaseDurationMillis = leaseDurationMillis,
                leaseExpiresAtEpochMillis = nowEpochMillis + leaseDurationMillis,
                leaseElapsedDeadlineMillis = elapsedRealtimeMillis + leaseDurationMillis,
                serverAccountStatus = OfflineAccountStatus.ACTIVE,
                deviceAccountStatus = OfflineAccountStatus.ACTIVE,
                keystoreState = OfflineKeystoreState.AVAILABLE,
                deviceUnlocked = true,
                mode = OfflineAccessMode.CAPTURE,
                lockReason = OfflineAccessLockReason.NONE,
                evidence = OfflineEvidenceLedger(),
                localJobPackPresent = true,
                recovery = null,
                audit = emptyList(),
            )
            return state.appendAudit(
                OfflineAccessAuditAction.SESSION_STARTED,
                userId,
            )
        }
    }
}
