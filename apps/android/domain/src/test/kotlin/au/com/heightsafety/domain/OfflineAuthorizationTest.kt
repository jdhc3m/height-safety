package au.com.heightsafety.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OfflineAuthorizationTest {
    @Test
    fun captureRecordsPendingEvidenceAndKeepsItUnacknowledged() {
        var state = state()

        state = state.recordMutation("mutation-1", "inspector-a").state
        state = state.recordPhoto("photo-1", "inspector-a").state

        assertTrue(state.canCapture())
        assertEquals(setOf("mutation-1"), state.evidence.pendingMutationIds)
        assertEquals(setOf("photo-1"), state.evidence.pendingPhotoIds)
        assertFalse(state.evidence.serverAcknowledged)
    }

    @Test
    fun leaseExpiryLocksCaptureAndPreservesEvidence() {
        var state = state(leaseDurationMillis = 100L)
        state = state.recordMutation("mutation-1").state
        state = state.recordPhoto("photo-1").state

        val expired = state.tick(nowEpochMillis = 100L, elapsedDeltaMillis = 100L)

        assertTrue(expired.allowed)
        assertEquals(OfflineAccessMode.LOCKED, expired.state.mode)
        assertEquals(OfflineAccessLockReason.LEASE_EXPIRED, expired.state.lockReason)
        assertEquals(setOf("mutation-1"), expired.state.evidence.pendingMutationIds)
        assertEquals(setOf("photo-1"), expired.state.evidence.pendingPhotoIds)
        val denied = expired.state.recordMutation("mutation-2")
        assertFalse(denied.allowed)
        assertEquals(OfflineAccessDecisionReason.LEASE_EXPIRED_DENIED, denied.reason)
    }

    @Test
    fun failedRefreshDoesNotLockStillValidLease() {
        val state = state().tick(50L, 50L).state

        val refresh = state.refreshOnline(
            reachable = false,
            serverAccountStatus = OfflineAccountStatus.ACTIVE,
        )

        assertFalse(refresh.allowed)
        assertEquals(OfflineAccessDecisionReason.NETWORK_UNAVAILABLE, refresh.reason)
        assertEquals(OfflineAccessMode.CAPTURE, refresh.state.mode)
        assertTrue(refresh.state.recordMutation("mutation-1").allowed)
    }

    @Test
    fun notifiedRevocationLocksCaptureAndBlocksUpload() {
        var state = state()
        state = state.recordMutation("mutation-1").state

        val revoked = state.observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
        )

        assertEquals(OfflineAccountStatus.REVOKED, revoked.state.serverAccountStatus)
        assertEquals(OfflineAccountStatus.REVOKED, revoked.state.deviceAccountStatus)
        assertEquals(OfflineAccessMode.LOCKED, revoked.state.mode)
        assertEquals(OfflineAccessLockReason.REVOCATION, revoked.state.lockReason)
        assertFalse(revoked.state.acknowledgePending(mutationIds = setOf("mutation-1")).allowed)
        assertEquals(
            OfflineAccessDecisionReason.RECOVERY_REQUIRED,
            revoked.state.acknowledgePending(mutationIds = setOf("mutation-1")).reason,
        )
    }

    @Test
    fun unnotifiedRevocationAllowsCaptureButNotAcknowledgement() {
        val state = state().observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = false,
        ).state

        assertEquals(OfflineAccountStatus.REVOKED, state.serverAccountStatus)
        assertEquals(OfflineAccountStatus.ACTIVE, state.deviceAccountStatus)
        assertEquals(OfflineAccessMode.CAPTURE, state.mode)
        assertTrue(state.recordMutation("mutation-1").allowed)
        assertEquals(
            OfflineAccessDecisionReason.RECOVERY_REQUIRED,
            state.recordMutation("mutation-2").state
                .acknowledgePending(mutationIds = setOf("mutation-1")).reason,
        )
    }

    @Test
    fun sameCompanyAdministratorGetsUploadOnlyRecovery() {
        var state = state()
        state = state.recordMutation("mutation-1").state
        state = state.recordPhoto("photo-1").state
        state = state.observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
        ).state

        val recovery = state.authoriseUploadOnlyRecovery(
            administratorCompanyId = "company-a",
            administratorUserId = "administrator-a",
            administratorRole = ProductRole.ADMINISTRATOR,
        )

        assertTrue(recovery.allowed)
        assertEquals(OfflineAccessMode.UPLOAD_ONLY, recovery.state.mode)
        assertEquals(OfflineAccountStatus.REVOKED, recovery.state.deviceAccountStatus)
        assertFalse(recovery.state.recordMutation("mutation-2").allowed)
        assertEquals(
            OfflineAccessDecisionReason.ACCOUNT_REVOKED,
            recovery.state.recordMutation("mutation-2").reason,
        )

        val synced = recovery.state.acknowledgePending(
            mutationIds = setOf("mutation-1"),
            photoIds = setOf("photo-1"),
        )
        assertTrue(synced.allowed)
        assertTrue(synced.state.evidence.isSettled)

        val cleaned = synced.state.cleanupLocal()
        assertTrue(cleaned.allowed)
        assertFalse(cleaned.state.localJobPackPresent)
        assertEquals(OfflineAccessMode.UPLOAD_ONLY, cleaned.state.mode)
    }

    @Test
    fun recoverySurvivesRevokedRefreshWithoutRestoringCapture() {
        var state = state()
        state = state.observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
        ).state
        state = state.authoriseUploadOnlyRecovery(
            administratorCompanyId = "company-a",
            administratorUserId = "administrator-a",
            administratorRole = ProductRole.ADMINISTRATOR,
        ).state

        val refreshed = state.refreshOnline(
            reachable = true,
            serverAccountStatus = OfflineAccountStatus.REVOKED,
        )

        assertTrue(refreshed.allowed)
        assertEquals(OfflineAccessDecisionReason.RECOVERY_STILL_LIVE, refreshed.reason)
        assertEquals(OfflineAccessMode.UPLOAD_ONLY, refreshed.state.mode)
        assertEquals(OfflineAccountStatus.REVOKED, refreshed.state.serverAccountStatus)
    }

    @Test
    fun recoveryRequiresAdministratorSameCompanyDeviceAndKeystore() {
        var state = state().observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
        ).state

        assertEquals(
            OfflineAccessDecisionReason.RECOVERY_REQUIRES_ADMINISTRATOR,
            state.authoriseUploadOnlyRecovery(
                administratorCompanyId = "company-a",
                administratorUserId = "inspector-a",
                administratorRole = ProductRole.INSPECTOR,
            ).reason,
        )
        assertEquals(
            OfflineAccessDecisionReason.CROSS_COMPANY_DENIED,
            state.authoriseUploadOnlyRecovery(
                administratorCompanyId = "company-b",
                administratorUserId = "administrator-b",
                administratorRole = ProductRole.ADMINISTRATOR,
            ).reason,
        )

        state = state.lockDevice().state
        assertEquals(
            OfflineAccessDecisionReason.DEVICE_LOCKED_DENIED,
            state.authoriseUploadOnlyRecovery(
                administratorCompanyId = "company-a",
                administratorUserId = "administrator-a",
                administratorRole = ProductRole.ADMINISTRATOR,
            ).reason,
        )

        state = state.unlockDevice(deviceAuthenticated = true).state
        state = state.loseKeystore().state
        assertEquals(
            OfflineAccessDecisionReason.KEYSTORE_LOST,
            state.authoriseUploadOnlyRecovery(
                administratorCompanyId = "company-a",
                administratorUserId = "administrator-a",
                administratorRole = ProductRole.ADMINISTRATOR,
            ).reason,
        )
    }

    @Test
    fun logoutAndCleanupRequireSettledEvidence() {
        var state = state().recordMutation("mutation-1").state

        assertEquals(
            OfflineAccessDecisionReason.PENDING_EVIDENCE,
            state.requestLogout().reason,
        )
        assertEquals(
            OfflineAccessDecisionReason.PENDING_EVIDENCE,
            state.cleanupLocal().reason,
        )

        state = state.acknowledgePending(mutationIds = setOf("mutation-1")).state
        assertTrue(state.requestLogout().allowed)
        val cleaned = state.cleanupLocal()
        assertTrue(cleaned.allowed)
        assertFalse(cleaned.state.localJobPackPresent)
        assertEquals(
            OfflineAccessDecisionReason.LOCAL_PACK_MISSING,
            cleaned.state.recordMutation("mutation-2").reason,
        )
    }

    @Test
    fun conflictBlocksLogoutUntilOnlineResolution() {
        var state = state().markConflict("conflict-1").state

        assertEquals(
            OfflineAccessDecisionReason.UNRESOLVED_CONFLICT,
            state.requestLogout().reason,
        )
        state = state.resolveConflict("conflict-1").state
        assertTrue(state.requestLogout().allowed)
    }

    @Test
    fun clockRollbackLocksUntilActiveOnlineRefresh() {
        var state = state(leaseDurationMillis = 2_000_000L)
        state = state.tick(nowEpochMillis = 1_000_000L, elapsedDeltaMillis = 1L).state

        val rollback = state.tick(nowEpochMillis = 600_000L, elapsedDeltaMillis = 1L)

        assertFalse(rollback.allowed)
        assertEquals(OfflineAccessLockReason.CLOCK_ROLLBACK, rollback.state.lockReason)
        assertEquals(OfflineAccessMode.LOCKED, rollback.state.mode)
        assertEquals(
            OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED,
            rollback.state.recordMutation("mutation-1").reason,
        )

        val refreshed = rollback.state.refreshOnline(
            reachable = true,
            serverAccountStatus = OfflineAccountStatus.ACTIVE,
        )
        assertTrue(refreshed.allowed)
        assertEquals(OfflineAccessMode.CAPTURE, refreshed.state.mode)
        assertEquals(OfflineAccessLockReason.NONE, refreshed.state.lockReason)
    }

    @Test
    fun recoveryExpiryReturnsToLockedState() {
        var state = state()
        state = state.observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
        ).state
        state = state.authoriseUploadOnlyRecovery(
            administratorCompanyId = "company-a",
            administratorUserId = "administrator-a",
            administratorRole = ProductRole.ADMINISTRATOR,
        ).state

        val expired = state.tick(
            nowEpochMillis = OFFLINE_RECOVERY_WINDOW_DURATION_MILLIS,
            elapsedDeltaMillis = OFFLINE_RECOVERY_WINDOW_DURATION_MILLIS,
        )

        assertEquals(null, expired.state.recovery)
        assertEquals(OfflineAccessMode.LOCKED, expired.state.mode)
        assertEquals(
            OfflineAccessDecisionReason.RECOVERY_REQUIRED,
            expired.state.acknowledgePending().reason,
        )
    }

    @Test
    fun failedDeviceAuthenticationDoesNotUnlockAndKeystoreLossPreservesEvidence() {
        var state = state().recordMutation("mutation-1").state
        state = state.lockDevice().state

        val failedUnlock = state.unlockDevice(deviceAuthenticated = false)
        assertFalse(failedUnlock.allowed)
        assertFalse(failedUnlock.state.deviceUnlocked)

        state = failedUnlock.state.unlockDevice(deviceAuthenticated = true).state
        state = state.loseKeystore().state
        assertEquals(OfflineAccessLockReason.KEYSTORE_LOST, state.lockReason)
        assertEquals(setOf("mutation-1"), state.evidence.pendingMutationIds)
        assertEquals(
            OfflineAccessDecisionReason.KEYSTORE_LOST,
            state.cleanupLocal().reason,
        )
        assertTrue(state.localJobPackPresent)
    }

    private fun state(
        leaseDurationMillis: Long = 1_000_000L,
    ): FieldOfflineAccessState = FieldOfflineAccessState.start(
        companyId = "company-a",
        userId = "inspector-a",
        leaseDurationMillis = leaseDurationMillis,
    )
}
