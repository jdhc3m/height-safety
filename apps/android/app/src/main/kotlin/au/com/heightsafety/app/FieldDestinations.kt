package au.com.heightsafety.app

import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.PhotoUploadState

/**
 * Destinations of the field navigation shell. The field state machine
 * (FieldViewModel) stays the single source of truth for where a signed-in
 * flow is; the shell maps each FieldUiState onto exactly one destination.
 * Sync and Account have no state mapping: they are user-selected tabs that
 * are only reachable while a signed-in root state is active.
 */
internal sealed class FieldDestination(val route: String, val depth: Int) {
    data object SignIn : FieldDestination("signin", AUTH_DEPTH)
    data object Locked : FieldDestination("locked", AUTH_DEPTH)
    data object Revoked : FieldDestination("revoked", AUTH_DEPTH)

    data object Jobs : FieldDestination("jobs", ROOT_DEPTH)
    data object Sync : FieldDestination("sync", ROOT_DEPTH)
    data object Account : FieldDestination("account", ROOT_DEPTH)

    data object JobPack : FieldDestination("job_pack", JOB_PACK_DEPTH)
    data object SubmissionReview : FieldDestination("submission_review", PUSHED_DEPTH)
    data object Capture : FieldDestination("capture", PUSHED_DEPTH)

    companion object {
        const val AUTH_DEPTH = 0
        const val ROOT_DEPTH = 1
        const val JOB_PACK_DEPTH = 2
        const val PUSHED_DEPTH = 3

        const val JOBS_GRAPH = "jobs_graph"
        const val SYNC_GRAPH = "sync_graph"
        const val ACCOUNT_GRAPH = "account_graph"

        // Lazily evaluated: the companion must not touch the destination
        // objects while the class is still initialising.
        private val all: List<FieldDestination> by lazy {
            listOf(SignIn, Locked, Revoked, Jobs, Sync, Account, JobPack, SubmissionReview, Capture)
        }

        /** Routes that host the bottom navigation bar. */
        val navigationBarRoutes: Set<String> by lazy {
            setOf(Jobs.route, Sync.route, Account.route, JobPack.route)
        }

        private val depthByRoute: Map<String, Int> by lazy {
            all.associate { destination -> destination.route to destination.depth }
        }

        fun depthForRoute(route: String): Int? = depthByRoute[route]
    }
}

/** Destination implied by a field state. */
internal fun fieldDestinationFor(state: FieldUiState): FieldDestination = when (state) {
    is FieldUiState.SignedOut -> FieldDestination.SignIn
    is FieldUiState.SigningIn -> FieldDestination.SignIn
    is FieldUiState.RestoringSession -> FieldDestination.SignIn
    is FieldUiState.SessionExpired -> FieldDestination.SignIn
    is FieldUiState.Error -> if (state.account == null) {
        FieldDestination.SignIn
    } else {
        FieldDestination.Jobs
    }
    is FieldUiState.AppLocked -> FieldDestination.Locked
    is FieldUiState.AccountRevoked -> FieldDestination.Revoked
    is FieldUiState.LoadingJobs,
    is FieldUiState.JobsLoaded,
    is FieldUiState.EmptyJobs,
    is FieldUiState.OpeningJobPack,
    is FieldUiState.JobPackError,
    -> FieldDestination.Jobs
    is FieldUiState.JobPackOpened -> FieldDestination.JobPack
    is FieldUiState.OpeningSubmissionReview -> FieldDestination.SubmissionReview
    is FieldUiState.SubmissionReview -> FieldDestination.SubmissionReview
    is FieldUiState.AnchorCapture -> FieldDestination.Capture
}

/** Locally queued work counts that are visible in one field state. */
internal data class FieldSyncCounts(
    val queuedRecords: Int,
    val pendingPhotos: Int,
    val failedPhotos: Int,
) {
    val total: Int get() = queuedRecords + pendingPhotos + failedPhotos
}

/**
 * Derives the sync badge counts from a field state. Returns null when the
 * state carries no queue data (plain job-list states), because the badge must
 * never show a stale or invented count. The live outbox subscription arrives
 * with the Sync tab ticket; until then the badge is state-derived.
 */
internal fun fieldSyncCounts(state: FieldUiState): FieldSyncCounts? {
    val evidence = when (state) {
        is FieldUiState.JobPackOpened -> state.evidence
        is FieldUiState.AnchorCapture -> state.evidence
        is FieldUiState.SubmissionReview -> state.review.evidence
        else -> return null
    }
    val intent = when (state) {
        is FieldUiState.JobPackOpened -> state.submissionIntent
        is FieldUiState.SubmissionReview -> state.review.intent
        else -> null
    }
    // A queued submission is one durable mutation; before it is queued every
    // locally saved record counts separately.
    val queuedRecords = if (intent != null) {
        if (intent.syncState == EvidenceSyncState.SYNCHRONISED) 0 else 1
    } else {
        evidence.count { draft -> draft.syncState != EvidenceSyncState.SYNCHRONISED }
    }
    val photos = evidence.flatMap { draft -> draft.photos }
    return FieldSyncCounts(
        queuedRecords = queuedRecords,
        pendingPhotos = photos.count { it.uploadState == PhotoUploadState.PENDING_UPLOAD },
        failedPhotos = photos.count { it.uploadState == PhotoUploadState.FAILED },
    )
}

internal fun fieldSyncBadgeCount(state: FieldUiState): Int? =
    fieldSyncCounts(state)?.total

/**
 * True when leaving the capture screen would discard local edits: the draft
 * differs from the last saved copy, or a save is still running and closing
 * would cancel it.
 */
internal fun captureHasUnsavedEdits(state: FieldUiState.AnchorCapture): Boolean {
    if (state.saveState == EvidenceSaveState.SAVING) return true
    val saved = state.evidence.firstOrNull { draft ->
        draft.inspectionId == state.draft.inspectionId
    }
    return saved != state.draft
}
