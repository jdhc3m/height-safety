package au.com.heightsafety.domain

/** Durable boundary for the current device-side offline authorisation state. */
public interface OfflineAccessStateStore {
    public suspend fun loadOfflineAccessState(
        companyId: String,
        userId: String,
    ): FieldOfflineAccessState?

    public suspend fun saveOfflineAccessState(state: FieldOfflineAccessState)
}

/**
 * Coordinates the domain state machine with a durable adapter.
 *
 * The coordinator deliberately owns no Android, persistence or network API. A
 * caller must restore a company/user scope before using any transition.
 */
public class OfflineAccessSession(
    private val store: OfflineAccessStateStore,
    private val nowEpochMillis: () -> Long,
    private val elapsedRealtimeMillis: () -> Long,
) {
    private var state: FieldOfflineAccessState? = null

    public val currentState: FieldOfflineAccessState?
        get() = state

    public suspend fun restore(
        companyId: String,
        userId: String,
    ): OfflineAccessTransition {
        require(companyId.isNotBlank()) { "companyId is required" }
        require(userId.isNotBlank()) { "userId is required" }
        state = null
        val now = checkedNow()
        val elapsed = checkedElapsed()
        val stored = store.loadOfflineAccessState(companyId, userId)
        val transition = if (stored == null) {
            OfflineAccessTransition(
                state = FieldOfflineAccessState.start(
                    companyId = companyId,
                    userId = userId,
                    nowEpochMillis = now,
                    elapsedRealtimeMillis = elapsed,
                ).copy(localJobPackPresent = false),
                allowed = true,
                reason = OfflineAccessDecisionReason.TICK,
            )
        } else {
            require(stored.companyId == companyId) {
                "offline access state company does not match requested company"
            }
            require(stored.userId == userId) {
                "offline access state user does not match requested user"
            }
            stored.tick(
                nowEpochMillis = now,
                elapsedDeltaMillis = elapsed - stored.elapsedRealtimeMillis,
                actorUserId = userId,
            )
        }
        return persist(transition)
    }

    public suspend fun observeTime(
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(advance(actorUserId))

    public suspend fun markLocalJobPackPresent(
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.markLocalJobPackPresent(actorUserId),
    )

    public suspend fun prepareCapture(
        actorUserId: String? = null,
    ): OfflineAccessTransition {
        val advanced = advance(actorUserId)
        val decision = advanced.state.captureDecision(actorUserId)
        return persist(decision)
    }

    public suspend fun recordMutation(
        mutationId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.recordMutation(mutationId, actorUserId),
    )

    public suspend fun recordPhoto(
        photoId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.recordPhoto(photoId, actorUserId),
    )

    public suspend fun replacePendingMutation(
        mutationId: String,
        replacementMutationId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.replacePendingMutation(
            mutationId = mutationId,
            replacementMutationId = replacementMutationId,
            actorUserId = actorUserId,
        ),
    )

    public suspend fun acknowledgePending(
        mutationIds: Set<String> = emptySet(),
        photoIds: Set<String> = emptySet(),
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.acknowledgePending(
            mutationIds = mutationIds,
            photoIds = photoIds,
            actorUserId = actorUserId,
        ),
    )

    public suspend fun markConflict(
        conflictId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.markConflict(conflictId, actorUserId),
    )

    public suspend fun resolveConflict(
        conflictId: String,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.resolveConflict(conflictId, actorUserId),
    )

    public suspend fun requestLogout(
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.requestLogout(actorUserId),
    )

    public suspend fun lockDevice(
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.lockDevice(actorUserId),
    )

    public suspend fun unlockDevice(
        deviceAuthenticated: Boolean,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.unlockDevice(deviceAuthenticated, actorUserId),
    )

    public suspend fun observeServerAccountStatus(
        status: OfflineAccountStatus,
        deviceNotified: Boolean,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.observeServerAccountStatus(
            status = status,
            deviceNotified = deviceNotified,
            actorUserId = actorUserId,
        ),
    )

    public suspend fun refreshOnline(
        reachable: Boolean,
        serverAccountStatus: OfflineAccountStatus,
        actorUserId: String? = null,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.refreshOnline(
            reachable = reachable,
            serverAccountStatus = serverAccountStatus,
            actorUserId = actorUserId,
        ),
    )

    public suspend fun authoriseUploadOnlyRecovery(
        administratorCompanyId: String,
        administratorUserId: String,
        administratorRole: ProductRole,
        actorUserId: String? = administratorUserId,
    ): OfflineAccessTransition = persist(
        advance(actorUserId).state.authoriseUploadOnlyRecovery(
            administratorCompanyId = administratorCompanyId,
            administratorUserId = administratorUserId,
            administratorRole = administratorRole,
            actorUserId = actorUserId,
        ),
    )

    public fun canCapture(): Boolean = state?.canCapture() == true

    public fun canUpload(): Boolean = state?.canUpload() == true

    private suspend fun advance(actorUserId: String?): OfflineAccessTransition {
        val current = state ?: error("offline access state has not been restored")
        val elapsed = checkedElapsed()
        return current.tick(
            nowEpochMillis = checkedNow(),
            elapsedDeltaMillis = elapsed - current.elapsedRealtimeMillis,
            actorUserId = actorUserId,
        )
    }

    private suspend fun persist(transition: OfflineAccessTransition): OfflineAccessTransition {
        state = transition.state
        store.saveOfflineAccessState(transition.state)
        return transition
    }

    private fun checkedNow(): Long = nowEpochMillis().also {
        require(it >= 0) { "current epoch time must not be negative" }
    }

    private fun checkedElapsed(): Long = elapsedRealtimeMillis().also {
        require(it >= 0) { "current elapsed time must not be negative" }
    }
}
