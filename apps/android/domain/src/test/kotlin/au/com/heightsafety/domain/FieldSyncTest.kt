package au.com.heightsafety.domain

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldSyncTest {
    @Test
    fun retryReusesMutationIdentityAndLeavesFailedStateVisible() = runTest {
        val store = InMemoryMutationStore()
        val transport = QueueTransport(
            SyncMutationDelivery.RetryableFailure("offline"),
            SyncMutationDelivery.Acknowledged,
        )
        store.enqueueMutation(mutation())
        val drainer = drainer(store, transport)

        val first = drainer.drain()

        assertTrue(first.requiresRetry)
        assertEquals(1, first.attempted)
        assertEquals(
            SyncMutationState.FAILED,
            store.loadMutations("company-a").single().state,
        )
        assertEquals("offline", store.loadMutations("company-a").single().lastError)

        val second = drainer.drain()

        assertFalse(second.requiresRetry)
        assertEquals(1, second.acknowledged)
        assertEquals(
            SyncMutationState.SYNCHRONISED,
            store.loadMutations("company-a").single().state,
        )
        assertEquals(listOf("mutation-001", "mutation-001"), transport.mutationIds)
        assertEquals(listOf("mutation-001", "mutation-001"), transport.idempotencyKeys)
        assertEquals(2, store.loadMutations("company-a").single().attemptCount)
    }

    @Test
    fun interruptedSynchronisationBecomesRetryableAfterRestart() = runTest {
        val store = InMemoryMutationStore()
        val started = mutation().beginSynchronisation(2_000L)
        store.enqueueMutation(started)
        val transport = QueueTransport(SyncMutationDelivery.Acknowledged)

        val result = drainer(store, transport).drain()

        assertFalse(result.requiresRetry)
        assertEquals(1, result.attempted)
        assertEquals(
            SyncMutationState.SYNCHRONISED,
            store.loadMutations("company-a").single().state,
        )
        assertEquals(2, store.loadMutations("company-a").single().attemptCount)
        assertEquals("mutation-001", transport.mutationIds.single())
    }

    @Test
    fun duplicateEnqueueReturnsOneLogicalMutation() = runTest {
        val store = InMemoryMutationStore()
        val original = mutation()

        val first = store.enqueueMutation(original)
        val replay = store.enqueueMutation(
            original.copy(
                createdAtEpochMillis = 1_500L,
                updatedAtEpochMillis = 1_500L,
            ),
        )

        assertEquals(original, first)
        assertEquals(original, replay)
        assertEquals(1, store.loadMutations("company-a").size)
    }

    @Test
    fun conflictRemainsVisibleAndIsNotAutomaticallyRetried() = runTest {
        val store = InMemoryMutationStore()
        val transport = QueueTransport(
            SyncMutationDelivery.Conflict("server version changed"),
        )
        store.enqueueMutation(mutation())
        val drainer = drainer(store, transport)

        val first = drainer.drain()
        val second = drainer.drain()

        assertEquals(1, first.conflicts)
        assertFalse(first.requiresRetry)
        assertEquals(0, second.attempted)
        assertEquals(
            SyncMutationState.CONFLICT,
            store.loadMutations("company-a").single().state,
        )
        assertEquals(1, transport.mutationIds.size)
    }

    @Test
    fun permanentServerRejectionRemainsFailedWithoutRetryLoop() = runTest {
        val store = InMemoryMutationStore()
        val transport = QueueTransport(
            SyncMutationDelivery.PermanentFailure("session is no longer valid"),
        )
        store.enqueueMutation(mutation())

        val result = drainer(store, transport).drain()

        assertFalse(result.requiresRetry)
        assertEquals(1, result.failed)
        assertEquals(SyncMutationState.FAILED, store.loadMutations("company-a").single().state)
        assertEquals("session is no longer valid", store.loadMutations("company-a").single().lastError)
    }

    @Test
    fun scopedDrainForwardsFrozenPayloadAndLeavesOtherCompanyQueued() = runTest {
        val store = InMemoryMutationStore()
        val payload = InspectionSubmissionPayload(
            companyId = "company-a",
            jobId = "job-001",
            siteId = "site-001",
            jurisdiction = SupportedJurisdiction.NSW,
            submissionId = "submission-001",
            jobPackVersion = 1L,
            anchorInspections = emptyList(),
        )
        store.payload = payload
        store.enqueueMutation(mutation())
        store.enqueueMutation(
            mutation().copy(
                companyId = "company-b",
                mutationId = "mutation-b",
                idempotencyKey = "mutation-b",
            ),
        )
        val transport = PayloadTransport()

        val result = MutationOutboxDrainer(
            store = store,
            transport = transport,
            nowEpochMillis = { 2_000L },
            companyId = "company-a",
        ).drain()

        assertEquals(1, result.acknowledged)
        assertEquals(payload, transport.payload)
        assertEquals(SyncMutationState.PENDING, store.loadMutations("company-b").single().state)
    }

    @Test
    fun reviewGateRequiresServerAcknowledgementAndEveryPhotoUpload() {
        val blocked = SubmissionSynchronization(
            mutationState = SyncMutationState.SYNCHRONISED,
            photoStates = listOf(
                PhotoUploadQueueState.UPLOADED,
                PhotoUploadQueueState.FAILED,
                PhotoUploadQueueState.PENDING,
            ),
        )

        assertFalse(blocked.isReadyForReview)
        assertEquals(
            listOf(
                SubmissionSynchronizationBlocker.PHOTO_UPLOAD_FAILED,
                SubmissionSynchronizationBlocker.PHOTO_UPLOAD_PENDING,
            ),
            blocked.blockers,
        )

        val acknowledged = SubmissionSynchronization(
            mutationState = SyncMutationState.SYNCHRONISED,
            photoStates = listOf(PhotoUploadQueueState.UPLOADED),
        )
        assertTrue(acknowledged.isReadyForReview)
    }

    private fun drainer(
        store: InMemoryMutationStore,
        transport: QueueTransport,
    ) = MutationOutboxDrainer(
        store = store,
        transport = transport,
        nowEpochMillis = { 2_000L },
    )

    private fun mutation() = SyncMutation(
        companyId = "company-a",
        mutationId = "mutation-001",
        idempotencyKey = "mutation-001",
        operation = SyncMutationOperation.SUBMIT_INSPECTION,
        entityType = INSPECTION_SUBMISSION_ENTITY_TYPE,
        entityId = "submission-001",
        entityVersion = 1L,
        actorUserId = "inspector-a",
        sessionId = "session-001",
        createdAtEpochMillis = 1_000L,
    )

    private class QueueTransport(
        private vararg val deliveries: SyncMutationDelivery,
    ) : SyncMutationTransport {
        private var nextDelivery = 0
        val mutationIds = mutableListOf<String>()
        val idempotencyKeys = mutableListOf<String>()

        override suspend fun send(mutation: SyncMutation): SyncMutationDelivery {
            mutationIds += mutation.mutationId
            idempotencyKeys += mutation.idempotencyKey
            return deliveries.getOrElse(nextDelivery++) {
                error("test transport has no delivery")
            }
        }
    }

    private class PayloadTransport : SyncMutationTransport {
        var payload: InspectionSubmissionPayload? = null

        override suspend fun send(mutation: SyncMutation): SyncMutationDelivery =
            error("payload-aware overload expected")

        override suspend fun send(
            mutation: SyncMutation,
            payload: InspectionSubmissionPayload?,
        ): SyncMutationDelivery {
            this.payload = payload
            return SyncMutationDelivery.Acknowledged
        }
    }

    private class InMemoryMutationStore : MutationOutboxStore {
        private val mutations = linkedMapOf<String, SyncMutation>()
        var payload: InspectionSubmissionPayload? = null

        override suspend fun enqueueMutation(mutation: SyncMutation): SyncMutation {
            val key = "${mutation.companyId}:${mutation.mutationId}"
            return mutations[key] ?: mutation.also { mutations[key] = it }
        }

        override suspend fun loadNextEligibleMutation(): SyncMutation? =
            mutations.values
                .filter {
                    it.state == SyncMutationState.PENDING ||
                        it.state == SyncMutationState.FAILED
                }
                .minWithOrNull(
                    compareBy<SyncMutation>({ it.createdAtEpochMillis }, { it.mutationId }),
                )

        override suspend fun saveMutation(mutation: SyncMutation) {
            val key = "${mutation.companyId}:${mutation.mutationId}"
            val existing = mutations[key]
            if (existing != null) {
                check(existing.hasSameIdentityAs(mutation)) {
                    "mutation identity collision"
                }
            }
            mutations[key] = mutation
        }

        override suspend fun recoverInterruptedMutations(nowEpochMillis: Long) {
            mutations.replaceAll { _, mutation -> mutation.recoverInterrupted(nowEpochMillis) }
        }

        override suspend fun loadMutations(companyId: String): List<SyncMutation> =
            mutations.values.filter { it.companyId == companyId }

        override suspend fun loadSubmissionPayload(
            mutation: SyncMutation,
        ): InspectionSubmissionPayload? = payload

        private fun SyncMutation.hasSameIdentityAs(other: SyncMutation): Boolean =
            companyId == other.companyId &&
                mutationId == other.mutationId &&
                idempotencyKey == other.idempotencyKey &&
                operation == other.operation &&
                entityType == other.entityType &&
                entityId == other.entityId &&
                entityVersion == other.entityVersion &&
                actorUserId == other.actorUserId &&
                sessionId == other.sessionId
    }
}
