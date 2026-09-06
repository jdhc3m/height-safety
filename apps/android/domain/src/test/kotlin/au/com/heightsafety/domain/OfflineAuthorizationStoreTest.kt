package au.com.heightsafety.domain

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineAuthorizationStoreTest {
    @Test
    fun restoreStartsWithoutLocalPackAndPersistsCaptureEvidence() = runTest {
        var now = 1_000L
        var elapsed = 500L
        val store = FakeOfflineAccessStateStore()
        val access = OfflineAccessSession(
            store = store,
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )

        val restored = access.restore("company-a", "inspector-a")
        assertTrue(restored.allowed)
        assertFalse(restored.state.localJobPackPresent)

        access.markLocalJobPackPresent("inspector-a")
        access.recordMutation("mutation-1", "inspector-a")
        access.recordPhoto("photo-1", "inspector-a")

        assertEquals(
            setOf("mutation-1"),
            store.state!!.evidence.pendingMutationIds,
        )
        assertEquals(setOf("photo-1"), store.state!!.evidence.pendingPhotoIds)
        assertEquals(store.state, access.currentState)

        now += 1_000L
        elapsed += 1_000L
        val restarted = OfflineAccessSession(
            store = store,
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )
        val resumed = restarted.restore("company-a", "inspector-a")

        assertTrue(resumed.state.canCapture())
        assertEquals(store.state, resumed.state)
    }

    @Test
    fun queuedSubmissionReplacesLocalDraftMutationIdentity() = runTest {
        val store = FakeOfflineAccessStateStore()
        val access = OfflineAccessSession(
            store = store,
            nowEpochMillis = { 1_000L },
            elapsedRealtimeMillis = { 500L },
        )
        access.restore("company-a", "inspector-a")
        access.markLocalJobPackPresent("inspector-a")
        access.recordMutation("draft-1", "inspector-a")
        val replaced = access.replacePendingMutation(
            mutationId = "draft-1",
            replacementMutationId = "submission-1",
            actorUserId = "inspector-a",
        )

        assertTrue(replaced.allowed)
        assertEquals(
            setOf("submission-1"),
            replaced.state.evidence.pendingMutationIds,
        )
    }

    @Test
    fun restorePersistsElapsedRuntimeLockAndKeepsEvidence() = runTest {
        var now = 1_000L
        var elapsed = 500L
        val store = FakeOfflineAccessStateStore()
        val access = OfflineAccessSession(
            store = store,
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )
        access.restore("company-a", "inspector-a")
        access.markLocalJobPackPresent("inspector-a")
        access.recordMutation("mutation-1", "inspector-a")

        now += OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS
        elapsed += OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS
        val restarted = OfflineAccessSession(
            store = store,
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )
        val resumed = restarted.restore("company-a", "inspector-a")

        assertFalse(resumed.state.canCapture())
        assertEquals(
            OfflineAccessLockReason.LEASE_EXPIRED,
            resumed.state.lockReason,
        )
        assertEquals(
            setOf("mutation-1"),
            resumed.state.evidence.pendingMutationIds,
        )
    }

    @Test
    fun recoveryStateSurvivesCoordinatorRestartAsUploadOnly() = runTest {
        var now = 1_000L
        var elapsed = 500L
        val store = FakeOfflineAccessStateStore()
        val access = OfflineAccessSession(
            store = store,
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )
        access.restore("company-a", "inspector-a")
        access.markLocalJobPackPresent("inspector-a")
        access.recordMutation("mutation-1", "inspector-a")
        access.observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
            actorUserId = "inspector-a",
        )
        access.authoriseUploadOnlyRecovery(
            administratorCompanyId = "company-a",
            administratorUserId = "admin-a",
            administratorRole = ProductRole.ADMINISTRATOR,
        )

        now += 1_000L
        elapsed += 1_000L
        val restarted = OfflineAccessSession(
            store = store,
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )
        val resumed = restarted.restore("company-a", "inspector-a")

        assertFalse(resumed.state.canCapture())
        assertTrue(resumed.state.canUpload())
        assertEquals(OfflineAccessMode.UPLOAD_ONLY, resumed.state.mode)
        assertEquals(
            setOf("mutation-1"),
            resumed.state.evidence.pendingMutationIds,
        )
    }

    private class FakeOfflineAccessStateStore : OfflineAccessStateStore {
        var state: FieldOfflineAccessState? = null

        override suspend fun loadOfflineAccessState(
            companyId: String,
            userId: String,
        ): FieldOfflineAccessState? = state?.takeIf {
            it.companyId == companyId && it.userId == userId
        }

        override suspend fun saveOfflineAccessState(state: FieldOfflineAccessState) {
            this.state = state
        }
    }
}
