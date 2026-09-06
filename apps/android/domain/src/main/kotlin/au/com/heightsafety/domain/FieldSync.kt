package au.com.heightsafety.domain

public enum class SyncMutationState(public val value: String) {
    PENDING("pending"),
    SYNCHRONISING("synchronising"),
    SYNCHRONISED("synchronised"),
    FAILED("failed"),
    CONFLICT("conflict"),
}

public enum class SyncMutationOperation(public val value: String) {
    SUBMIT_INSPECTION("submit_inspection"),
}

public const val INSPECTION_SUBMISSION_ENTITY_TYPE: String = "inspection_submission"

public data class SyncMutation(
    public val companyId: String,
    public val mutationId: String,
    public val idempotencyKey: String,
    public val operation: SyncMutationOperation,
    public val entityType: String,
    public val entityId: String,
    public val entityVersion: Long,
    public val actorUserId: String,
    public val sessionId: String,
    public val createdAtEpochMillis: Long,
    public val updatedAtEpochMillis: Long = createdAtEpochMillis,
    public val state: SyncMutationState = SyncMutationState.PENDING,
    public val attemptCount: Int = 0,
    public val lastError: String? = null,
) {
    init {
        require(companyId.isNotBlank()) { "mutation companyId is required" }
        require(mutationId.isNotBlank()) { "mutation mutationId is required" }
        require(idempotencyKey.isNotBlank()) {
            "mutation idempotencyKey is required"
        }
        require(idempotencyKey == mutationId) {
            "mutation idempotencyKey must match mutationId"
        }
        require(entityType.isNotBlank()) { "mutation entityType is required" }
        require(entityId.isNotBlank()) { "mutation entityId is required" }
        require(entityVersion > 0) { "mutation entityVersion must be positive" }
        require(actorUserId.isNotBlank()) { "mutation actorUserId is required" }
        require(sessionId.isNotBlank()) { "mutation sessionId is required" }
        require(createdAtEpochMillis >= 0) {
            "mutation createdAtEpochMillis must not be negative"
        }
        require(updatedAtEpochMillis >= createdAtEpochMillis) {
            "mutation updatedAtEpochMillis must not precede creation"
        }
        require(attemptCount >= 0) { "mutation attemptCount must not be negative" }
        if (state == SyncMutationState.FAILED || state == SyncMutationState.CONFLICT) {
            require(!lastError.isNullOrBlank()) {
                "failed or conflicting mutation must record an error"
            }
        }
        if (state == SyncMutationState.SYNCHRONISED) {
            require(lastError == null) {
                "synchronised mutation must not retain an error"
            }
        }
    }

    public fun beginSynchronisation(nowEpochMillis: Long): SyncMutation {
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "mutation synchronisation time must not precede update time"
        }
        require(
            state == SyncMutationState.PENDING || state == SyncMutationState.FAILED,
        ) {
            "only pending or failed mutations can synchronise"
        }
        require(attemptCount < Int.MAX_VALUE) {
            "mutation attempt count exhausted"
        }
        return copy(
            state = SyncMutationState.SYNCHRONISING,
            attemptCount = attemptCount + 1,
            updatedAtEpochMillis = nowEpochMillis,
            lastError = null,
        )
    }

    public fun acknowledge(nowEpochMillis: Long): SyncMutation {
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "mutation acknowledgement time must not precede update time"
        }
        require(state == SyncMutationState.SYNCHRONISING) {
            "only synchronising mutations can be acknowledged"
        }
        return copy(
            state = SyncMutationState.SYNCHRONISED,
            updatedAtEpochMillis = nowEpochMillis,
            lastError = null,
        )
    }

    public fun fail(
        nowEpochMillis: Long,
        error: String,
    ): SyncMutation {
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "mutation failure time must not precede update time"
        }
        require(state == SyncMutationState.SYNCHRONISING) {
            "only synchronising mutations can fail"
        }
        return copy(
            state = SyncMutationState.FAILED,
            updatedAtEpochMillis = nowEpochMillis,
            lastError = requireError(error),
        )
    }

    public fun markConflict(
        nowEpochMillis: Long,
        error: String,
    ): SyncMutation {
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "mutation conflict time must not precede update time"
        }
        require(state == SyncMutationState.SYNCHRONISING) {
            "only synchronising mutations can become conflicts"
        }
        return copy(
            state = SyncMutationState.CONFLICT,
            updatedAtEpochMillis = nowEpochMillis,
            lastError = requireError(error),
        )
    }

    public fun recoverInterrupted(nowEpochMillis: Long): SyncMutation {
        if (state != SyncMutationState.SYNCHRONISING) return this
        return fail(
            nowEpochMillis = nowEpochMillis,
            error = "Synchronisation interrupted before server acknowledgement.",
        )
    }

    private fun requireError(error: String): String = error.trim().also {
        require(it.isNotEmpty()) { "mutation error is required" }
    }
}

public sealed interface SyncMutationDelivery {
    public data object Acknowledged : SyncMutationDelivery

    public data class RetryableFailure(
        public val error: String,
    ) : SyncMutationDelivery {
        init {
            require(error.isNotBlank()) { "retryable mutation error is required" }
        }
    }

    /** The server rejected the mutation without a safe retry path. */
    public data class PermanentFailure(
        public val error: String,
    ) : SyncMutationDelivery {
        init {
            require(error.isNotBlank()) { "permanent mutation error is required" }
        }
    }

    public data class Conflict(
        public val error: String,
    ) : SyncMutationDelivery {
        init {
            require(error.isNotBlank()) { "mutation conflict error is required" }
        }
    }
}

public interface SyncMutationTransport {
    /** Sends one immutable mutation using [mutation.idempotencyKey] for replay identity. */
    public suspend fun send(mutation: SyncMutation): SyncMutationDelivery

    /** Sends the mutation with its frozen inspection evidence when available. */
    public suspend fun send(
        mutation: SyncMutation,
        payload: InspectionSubmissionPayload?,
    ): SyncMutationDelivery = send(mutation)
}

public interface MutationOutboxStore {
    /** Inserts once by company and mutation identity; replay returns stored value. */
    public suspend fun enqueueMutation(mutation: SyncMutation): SyncMutation

    /** Returns oldest pending or failed mutation. Conflict and completed work stay visible. */
    public suspend fun loadNextEligibleMutation(): SyncMutation?

    /** Replaces one mutation and its adapter-owned visible sync state. */
    public suspend fun saveMutation(mutation: SyncMutation)

    /** Converts interrupted in-flight work into visible, retryable failure. */
    public suspend fun recoverInterruptedMutations(nowEpochMillis: Long)

    /** Recovers only one company when a worker has an authenticated scope. */
    public suspend fun recoverInterruptedMutationsForCompany(
        companyId: String,
        nowEpochMillis: Long,
    ) {
        recoverInterruptedMutations(nowEpochMillis)
    }

    public suspend fun loadMutations(companyId: String): List<SyncMutation>

    /** Loads the frozen payload associated with a submission mutation. */
    public suspend fun loadSubmissionPayload(
        mutation: SyncMutation,
    ): InspectionSubmissionPayload? = null
}

public data class SyncDrainResult(
    public val attempted: Int,
    public val acknowledged: Int,
    public val conflicts: Int,
    public val requiresRetry: Boolean,
    public val failed: Int = 0,
)

public class MutationOutboxDrainer(
    private val store: MutationOutboxStore,
    private val transport: SyncMutationTransport,
    private val nowEpochMillis: () -> Long,
    private val companyId: String? = null,
) {
    public suspend fun drain(): SyncDrainResult {
        val recoveryTime = checkedNow()
        if (companyId == null) {
            store.recoverInterruptedMutations(recoveryTime)
        } else {
            store.recoverInterruptedMutationsForCompany(companyId, recoveryTime)
        }

        var attempted = 0
        var acknowledged = 0
        var conflicts = 0
        var failed = 0
        while (true) {
            val queued = nextEligibleMutation() ?: break
            val started = queued.beginSynchronisation(checkedNow())
            store.saveMutation(started)
            attempted += 1
            when (val delivery = transport.send(
                started,
                store.loadSubmissionPayload(started),
            )) {
                SyncMutationDelivery.Acknowledged -> {
                    store.saveMutation(started.acknowledge(checkedNow()))
                    acknowledged += 1
                }
                is SyncMutationDelivery.RetryableFailure -> {
                    store.saveMutation(started.fail(checkedNow(), delivery.error))
                    return SyncDrainResult(
                        attempted = attempted,
                        acknowledged = acknowledged,
                        conflicts = conflicts,
                        requiresRetry = true,
                        failed = failed + 1,
                    )
                }
                is SyncMutationDelivery.PermanentFailure -> {
                    store.saveMutation(started.fail(checkedNow(), delivery.error))
                    failed += 1
                    return SyncDrainResult(
                        attempted = attempted,
                        acknowledged = acknowledged,
                        conflicts = conflicts,
                        requiresRetry = false,
                        failed = failed,
                    )
                }
                is SyncMutationDelivery.Conflict -> {
                    store.saveMutation(started.markConflict(checkedNow(), delivery.error))
                    conflicts += 1
                }
            }
        }
        return SyncDrainResult(
            attempted = attempted,
            acknowledged = acknowledged,
            conflicts = conflicts,
            requiresRetry = false,
            failed = failed,
        )
    }

    private fun checkedNow(): Long = nowEpochMillis().also {
        require(it >= 0) { "current epoch time must not be negative" }
    }

    private suspend fun nextEligibleMutation(): SyncMutation? {
        if (companyId == null) return store.loadNextEligibleMutation()
        return store.loadMutations(companyId).firstOrNull { mutation ->
            mutation.state == SyncMutationState.PENDING ||
                mutation.state == SyncMutationState.FAILED
        }
    }
}
