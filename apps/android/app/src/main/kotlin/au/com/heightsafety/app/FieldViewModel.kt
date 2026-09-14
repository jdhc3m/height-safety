package au.com.heightsafety.app

import au.com.heightsafety.domain.FieldAuthorizationException
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.FieldSessionExpiredException
import au.com.heightsafety.domain.FieldSessionStore
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorSubmissionService
import au.com.heightsafety.domain.CaptureValidationIssue
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackAccessException
import au.com.heightsafety.domain.JobPackAccessFailure
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.OfflineAccessDecisionReason
import au.com.heightsafety.domain.OfflineAccessSession
import au.com.heightsafety.domain.OfflineAccountStatus
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.ProviderAccessTokenException
import au.com.heightsafety.domain.ProviderAccessTokenSource
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.SubmissionNotReadyException
import au.com.heightsafety.domain.SubmissionReviewResult
import au.com.heightsafety.domain.requireInspectorSession
import au.com.heightsafety.domain.visibleJobsForInspector
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

private const val SESSION_RENEWAL_WINDOW_MILLIS = 5 * 60 * 1000L

enum class SyncState {
    SYNCHRONISING,
    SYNCHRONISED,
    FAILED,
}

enum class EvidenceSaveState {
    EDITING,
    SAVING,
    SAVED_LOCALLY,
    FAILED,
}

data class AccountSummary(
    val companyId: String,
    val userId: String,
    val email: String,
    val role: ProductRole,
)

sealed interface FieldUiState {
    data object SignedOut : FieldUiState

    data class SigningIn(val companyId: String) : FieldUiState

    data class RestoringSession(val companyId: String? = null) : FieldUiState

    data class LoadingJobs(
        val account: AccountSummary,
        val syncState: SyncState = SyncState.SYNCHRONISING,
    ) : FieldUiState

    data class JobsLoaded(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val syncState: SyncState = SyncState.SYNCHRONISED,
    ) : FieldUiState

    data class EmptyJobs(
        val account: AccountSummary,
        val syncState: SyncState = SyncState.SYNCHRONISED,
    ) : FieldUiState

    data class OpeningJobPack(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val job: InspectorJob,
        val syncState: SyncState = SyncState.SYNCHRONISING,
    ) : FieldUiState

    data class JobPackOpened(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val job: InspectorJob,
        val opened: OpenedJobPack,
        val evidence: List<AnchorInspectionDraft> = emptyList(),
        val submissionIntent: InspectionSubmissionIntent? = null,
    ) : FieldUiState

    data class OpeningSubmissionReview(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val job: InspectorJob,
        val opened: OpenedJobPack,
    ) : FieldUiState

    data class SubmissionReview(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val job: InspectorJob,
        val opened: OpenedJobPack,
        val review: SubmissionReviewResult,
        val isQueueing: Boolean = false,
        val queueError: String? = null,
    ) : FieldUiState

    data class AnchorCapture(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val job: InspectorJob,
        val opened: OpenedJobPack,
        val anchor: JobPackAnchor?,
        val draft: AnchorInspectionDraft,
        val evidence: List<AnchorInspectionDraft>,
        val saveState: EvidenceSaveState = EvidenceSaveState.EDITING,
        val validationIssues: List<CaptureValidationIssue> = emptyList(),
        val saveError: String? = null,
    ) : FieldUiState

    data class JobPackError(
        val account: AccountSummary,
        val jobs: List<InspectorJob>,
        val job: InspectorJob,
        val message: String,
        val canRetry: Boolean,
        val syncState: SyncState = SyncState.FAILED,
    ) : FieldUiState

    data class Error(
        val message: String,
        val canRetry: Boolean,
        val account: AccountSummary? = null,
        val syncState: SyncState = SyncState.FAILED,
    ) : FieldUiState

    data class SessionExpired(
        val message: String = "Session expired. Sign in again.",
    ) : FieldUiState

    data class AppLocked(
        val account: AccountSummary,
        val message: String = "Unlock this device to continue.",
    ) : FieldUiState

    data class AccountRevoked(
        val account: AccountSummary,
        val message: String =
            "Server reported that this session is no longer authorised. Local evidence remains preserved.",
        val isRecovering: Boolean = false,
        val recoveryMessage: String? = null,
    ) : FieldUiState
}

class FieldViewModel(
    private val gateway: FieldGateway,
    private val providerAccessTokenSource: ProviderAccessTokenSource,
    private val scope: CoroutineScope,
    private val jobPackService: JobPackService? = null,
    private val anchorEvidenceService: AnchorEvidenceService? = null,
    private val submissionService: AnchorSubmissionService? = null,
    private val offlineAccessSession: OfflineAccessSession? = null,
    private val sessionStore: FieldSessionStore? = null,
    private val administratorRecoveryAuthenticator: AdministratorRecoveryAuthenticator =
        UnconfiguredAdministratorRecoveryAuthenticator(),
    private val scheduleMutationSync: () -> Unit = {},
    private val schedulePhotoUpload: () -> Unit = {},
    private val scheduleAuthenticatedMutationSync: (FieldSession) -> Unit = {},
    private val clearAuthenticatedMutationSync: () -> Unit = {},
    private val scheduleAuthenticatedPhotoUpload: (FieldSession) -> Unit = {},
    private val nowEpochMillis: () -> Long = { System.currentTimeMillis() },
    private val deviceAuthenticationGate: DeviceAuthenticationGate,
    private val inspectionIdGenerator: () -> String = { UUID.randomUUID().toString() },
    private val provisionalAnchorIdGenerator: () -> String = {
        "provisional-${UUID.randomUUID()}"
    },
) {
    private val _uiState = MutableStateFlow<FieldUiState>(FieldUiState.SignedOut)
    val uiState: StateFlow<FieldUiState> = _uiState.asStateFlow()

    private var session: FieldSession? = null
    private var lastCompanyId: String = ""
    private var lastJobs: List<InspectorJob> = emptyList()
    private var activeRequest: Job? = null
    private var lifecycleRequest: Job? = null
    private var sessionRestoreStarted = false
    private var lockedUiState: FieldUiState? = null

    fun signIn(companyId: String) {
        val normalizedCompanyId = companyId.trim()
        if (normalizedCompanyId.isEmpty()) {
            _uiState.value = FieldUiState.Error(
                message = "Enter company ID.",
                canRetry = false,
            )
            return
        }

        lastCompanyId = normalizedCompanyId
        activeRequest?.cancel()
        session = null
        clearAuthenticatedMutationSync()
        gateway.clearSession()
        _uiState.value = FieldUiState.SigningIn(normalizedCompanyId)
        activeRequest = scope.launch {
            try {
                val providerAccessToken = providerAccessTokenSource.requestAccessToken()
                if (providerAccessToken.isBlank()) {
                    throw ProviderAccessTokenException()
                }

                val createdSession = gateway.createSession(
                    companyId = normalizedCompanyId,
                    providerAccessToken = providerAccessToken,
                )
                if (createdSession.companyId != normalizedCompanyId) {
                    throw FieldGatewayException(
                        GatewayFailureReason.TENANT_MISMATCH,
                        "session company does not match requested company",
                    )
                }
                requireInspectorSession(createdSession)
                if (createdSession.isExpired(nowEpochMillis())) {
                    throw FieldSessionExpiredException()
                }

                sessionStore?.saveSession(createdSession)
                session = createdSession
                offlineAccessSession?.restore(
                    companyId = createdSession.companyId,
                    userId = createdSession.userId,
                )
                val accessState = offlineAccessSession?.currentState
                if (accessState?.localJobPackPresent == true && !accessState.deviceUnlocked) {
                    _uiState.value = FieldUiState.AppLocked(createdSession.toAccountSummary())
                } else {
                    loadJobs(createdSession)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                session = null
                clearAuthenticatedMutationSync()
                gateway.clearSession()
                _uiState.value = signInError(error)
            }
        }
    }

    /** Restore a saved application session, then revalidate it with the server. */
    fun restorePersistedSession() {
        val store = sessionStore ?: return
        if (sessionRestoreStarted) return
        sessionRestoreStarted = true
        activeRequest?.cancel()
        _uiState.value = FieldUiState.RestoringSession()
        activeRequest = scope.launch {
            var storedSession: FieldSession? = null
            var sessionWasLoaded = false
            try {
                storedSession = store.loadSession()
                sessionWasLoaded = true
                if (storedSession == null) {
                    _uiState.value = FieldUiState.SignedOut
                    return@launch
                }
                val saved = storedSession ?: error("saved session disappeared")
                lastCompanyId = saved.companyId
                if (saved.isExpired(nowEpochMillis())) {
                    store.clearSession()
                    gateway.clearSession()
                    _uiState.value = FieldUiState.SessionExpired(
                        "Saved session expired. Sign in again.",
                    )
                    return@launch
                }

                offlineAccessSession?.restore(saved.companyId, saved.userId)
                val restored = gateway.restoreSession(saved)
                requireInspectorSession(restored)
                if (restored.isExpired(nowEpochMillis())) {
                    store.clearSession()
                    gateway.clearSession()
                    _uiState.value = FieldUiState.SessionExpired(
                        "Saved session expired. Sign in again.",
                    )
                    return@launch
                }
                store.saveSession(restored)
                session = restored
                val accessState = offlineAccessSession?.currentState
                if (accessState?.localJobPackPresent == true && !accessState.deviceUnlocked) {
                    _uiState.value = FieldUiState.AppLocked(restored.toAccountSummary())
                } else {
                    loadJobs(restored)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                val saved = storedSession
                when {
                    saved != null && error.isServerAuthorizationFailure() -> {
                        notifyServerRevocation(saved)
                    }
                    saved != null && error.isRetryableNetworkFailure() -> {
                        session = saved
                        _uiState.value = FieldUiState.Error(
                            message = "Unable to verify saved session. Check connection and try again.",
                            canRetry = true,
                            account = saved.toAccountSummary(),
                        )
                    }
                    else -> {
                        session = null
                        clearAuthenticatedMutationSync()
                        gateway.clearSession()
                        if (sessionWasLoaded) {
                            store.clearSession()
                        }
                        _uiState.value = if (error is FieldSessionExpiredException) {
                            FieldUiState.SessionExpired("Saved session expired. Sign in again.")
                        } else {
                            signInError(error)
                        }
                    }
                }
            }
        }
    }

    fun retry() {
        if (_uiState.value is FieldUiState.AppLocked) {
            onApplicationForegrounded()
            return
        }

        val packError = _uiState.value as? FieldUiState.JobPackError
        if (packError != null) {
            openJobPack(packError.job)
            return
        }

        val currentSession = session
        if (currentSession != null && _uiState.value is FieldUiState.Error) {
            activeRequest?.cancel()
            activeRequest = scope.launch { loadJobs(currentSession) }
            return
        }

        if (lastCompanyId.isNotEmpty()) {
            signIn(lastCompanyId)
        }
    }

    fun refreshJobs() {
        val currentSession = session
        if (currentSession == null) {
            _uiState.value = FieldUiState.SignedOut
            return
        }

        activeRequest?.cancel()
        activeRequest = scope.launch { loadJobs(currentSession) }
    }

    /** Lock downloaded evidence when the application leaves the foreground. */
    fun onApplicationBackgrounded() {
        val currentSession = session ?: return
        val access = offlineAccessSession ?: return
        val currentState = access.currentState ?: return
        if (!currentState.localJobPackPresent || _uiState.value is FieldUiState.AppLocked) {
            return
        }

        lockedUiState = _uiState.value
        activeRequest?.cancel()
        _uiState.value = FieldUiState.AppLocked(currentSession.toAccountSummary())
        lifecycleRequest?.cancel()
        lifecycleRequest = scope.launch {
            access.lockDevice(currentSession.userId)
        }
    }

    /** Require device authentication again before returning to downloaded data. */
    fun onApplicationForegrounded() {
        if (_uiState.value !is FieldUiState.AppLocked) return
        unlockApplication()
    }

    /** Start same-company Administrator upload-only recovery after server denial. */
    fun startAdministratorRecovery() {
        val revoked = _uiState.value as? FieldUiState.AccountRevoked ?: return
        if (revoked.isRecovering) return
        val access = offlineAccessSession
        if (access == null) {
            _uiState.value = revoked.copy(
                recoveryMessage = "Offline recovery is not configured for this build.",
            )
            return
        }

        _uiState.value = revoked.copy(isRecovering = true, recoveryMessage = null)
        activeRequest?.cancel()
        activeRequest = scope.launch {
            try {
                if (!deviceAuthenticationGate.authenticate()) {
                    _uiState.value = revoked.copy(
                        recoveryMessage = "Unlock this device before Administrator recovery.",
                    )
                    return@launch
                }
                val unlocked = access.unlockDevice(
                    deviceAuthenticated = true,
                    actorUserId = revoked.account.userId,
                )
                if (!unlocked.allowed) {
                    _uiState.value = revoked.copy(
                        recoveryMessage = offlineAccessMessage(unlocked.reason),
                    )
                    return@launch
                }

                val administrator = administratorRecoveryAuthenticator.authenticate(
                    revoked.account.companyId,
                )
                if (administrator == null) {
                    _uiState.value = revoked.copy(
                        recoveryMessage =
                            "Administrator authentication is not configured for this build.",
                    )
                    return@launch
                }
                val recovery = access.authoriseUploadOnlyRecovery(
                    administratorCompanyId = administrator.companyId,
                    administratorUserId = administrator.userId,
                    administratorRole = administrator.role,
                )
                if (!recovery.allowed) {
                    _uiState.value = revoked.copy(
                        recoveryMessage = offlineAccessMessage(recovery.reason),
                    )
                    return@launch
                }
                _uiState.value = revoked.copy(
                    recoveryMessage =
                        "Upload-only recovery authorised for one hour. Capture remains locked; upload transport is still a separate configuration step.",
                )
            } catch (error: CancellationException) {
                throw error
            } catch (_: Throwable) {
                _uiState.value = revoked.copy(
                    recoveryMessage = "Administrator recovery could not be authorised. Try again.",
                )
            }
        }
    }

    private fun unlockApplication() {
        val locked = _uiState.value as? FieldUiState.AppLocked ?: return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val access = offlineAccessSession
        val previousLifecycleRequest = lifecycleRequest
        lifecycleRequest = scope.launch {
            previousLifecycleRequest?.join()
            try {
                if (!deviceAuthenticationGate.authenticate()) {
                    _uiState.value = locked
                    return@launch
                }
                val transition = access?.unlockDevice(
                    deviceAuthenticated = true,
                    actorUserId = currentSession.userId,
                )
                if (transition != null && !transition.allowed) {
                    lockedUiState = null
                    _uiState.value = FieldUiState.Error(
                        message = offlineAccessMessage(transition.reason),
                        canRetry = true,
                        account = currentSession.toAccountSummary(),
                    )
                    return@launch
                }
                val resume = lockedUiState
                lockedUiState = null
                if (
                    resume == null ||
                    resume is FieldUiState.AppLocked ||
                    sessionNeedsRenewal(currentSession)
                ) {
                    loadJobs(currentSession)
                } else {
                    _uiState.value = resume
                }
            } catch (error: CancellationException) {
                throw error
            } catch (_: Throwable) {
                _uiState.value = locked
            }
        }
    }

    fun openJobPack(job: InspectorJob) {
        val currentSession = session
        if (currentSession == null) {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val account = currentSession.toAccountSummary()
        val service = jobPackService
        if (service == null) {
            _uiState.value = FieldUiState.JobPackError(
                account = account,
                jobs = lastJobs,
                job = job,
                message = "Job-pack storage is not configured for this build.",
                canRetry = false,
            )
            return
        }

        val selectedJob = lastJobs.firstOrNull { it.jobId == job.jobId } ?: job
        activeRequest?.cancel()
        _uiState.value = FieldUiState.OpeningJobPack(account, lastJobs, selectedJob)
        activeRequest = scope.launch {
            var authorisedJob = selectedJob
            try {
                if (!deviceAuthenticationGate.authenticate()) {
                    offlineAccessSession?.lockDevice(currentSession.userId)
                    throw DeviceAuthenticationRequiredException()
                }
                offlineAccessSession?.unlockDevice(
                    deviceAuthenticated = true,
                    actorUserId = currentSession.userId,
                )?.takeUnless { it.allowed }?.let { transition ->
                    throw OfflineAccessDeniedException(transition.reason)
                }
                if (
                    selectedJob.workflowStatus == "released" &&
                    selectedJob.assignment == null
                ) {
                    authorisedJob = claimJob(currentSession, selectedJob)
                }
                val opened = service.openOrDownload(currentSession, authorisedJob)
                offlineAccessSession?.markLocalJobPackPresent(currentSession.userId)
                val submissionReview = submissionService?.review(currentSession, opened)
                val evidence = submissionReview?.evidence
                    ?: anchorEvidenceService?.loadDrafts(currentSession, opened).orEmpty()
                _uiState.value = FieldUiState.JobPackOpened(
                    account = account,
                    jobs = lastJobs,
                    job = authorisedJob,
                    opened = opened,
                    evidence = evidence,
                    submissionIntent = submissionReview?.intent,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                if (error.isServerAuthorizationFailure()) {
                    notifyServerRevocation(currentSession)
                } else if (error.isSessionExpired()) {
                    expireSession()
                } else if (error is OfflineAccessDeniedException) {
                    _uiState.value = FieldUiState.JobPackError(
                        account = account,
                        jobs = lastJobs,
                        job = authorisedJob,
                        message = offlineAccessMessage(error.reason),
                        canRetry = error.reason != OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED,
                    )
                } else {
                    _uiState.value = FieldUiState.JobPackError(
                        account = account,
                        jobs = lastJobs,
                        job = authorisedJob,
                        message = jobPackMessage(error),
                        canRetry = canRetryJobPack(error),
                    )
                }
            }
        }
    }

    fun openAnchor(anchor: JobPackAnchor) {
        val current = _uiState.value as? FieldUiState.JobPackOpened ?: return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val service = anchorEvidenceService
        if (service == null) {
            _uiState.value = FieldUiState.JobPackError(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                message = "Evidence storage is not configured for this build.",
                canRetry = false,
            )
            return
        }

        try {
            val savedEvidence = current.evidence.firstOrNull {
                it.expectedAnchorId == anchor.anchorId
            }
            if (current.submissionIntent != null || savedEvidence?.submissionId != null) {
                openSubmissionReview()
                return
            }
            val canonicalAnchor = current.opened.stored.pack.anchors.singleOrNull {
                it.anchorId == anchor.anchorId
            } ?: throw IllegalArgumentException(
                "anchor is not in the opened job-pack snapshot",
            )
            val draft = current.evidence.firstOrNull {
                it.expectedAnchorId == canonicalAnchor.anchorId
            } ?: service.newExpectedDraft(
                session = currentSession,
                opened = current.opened,
                anchor = canonicalAnchor,
                inspectionId = inspectionIdGenerator(),
            )
            val validationIssues = service.validateForCompletion(
                session = currentSession,
                opened = current.opened,
                draft = draft,
            )
            _uiState.value = FieldUiState.AnchorCapture(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                opened = current.opened,
                anchor = canonicalAnchor,
                draft = draft,
                evidence = current.evidence,
                validationIssues = validationIssues,
            )
        } catch (error: Throwable) {
            if (error.isSessionExpired()) {
                expireSession()
            } else if (error is JobPackAccessException) {
                _uiState.value = FieldUiState.JobPackError(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    message = jobPackMessage(error),
                    canRetry = canRetryJobPack(error),
                )
            } else {
                _uiState.value = FieldUiState.JobPackError(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    message = "Unable to open anchor evidence. Try again.",
                    canRetry = true,
                )
            }
        }
    }

    fun openNewlyDiscoveredAnchor() {
        val current = _uiState.value as? FieldUiState.JobPackOpened ?: return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val service = anchorEvidenceService
        if (service == null) {
            _uiState.value = FieldUiState.JobPackError(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                message = "Evidence storage is not configured for this build.",
                canRetry = false,
            )
            return
        }
        if (current.submissionIntent != null) {
            openSubmissionReview()
            return
        }

        try {
            val draft = service.newProvisionalDraft(
                session = currentSession,
                opened = current.opened,
                inspectionId = inspectionIdGenerator(),
                provisionalAnchorId = provisionalAnchorIdGenerator(),
            )
            _uiState.value = FieldUiState.AnchorCapture(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                opened = current.opened,
                anchor = null,
                draft = draft,
                evidence = current.evidence,
            )
        } catch (error: Throwable) {
            if (error.isSessionExpired()) {
                expireSession()
            } else if (error is JobPackAccessException) {
                _uiState.value = FieldUiState.JobPackError(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    message = jobPackMessage(error),
                    canRetry = canRetryJobPack(error),
                )
            } else {
                _uiState.value = FieldUiState.JobPackError(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    message = "Unable to start newly discovered anchor evidence. Try again.",
                    canRetry = true,
                )
            }
        }
    }

    fun openEvidence(draft: AnchorInspectionDraft) {
        val current = _uiState.value as? FieldUiState.JobPackOpened ?: return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val service = anchorEvidenceService
        if (service == null) {
            _uiState.value = FieldUiState.JobPackError(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                message = "Evidence storage is not configured for this build.",
                canRetry = false,
            )
            return
        }
        if (current.submissionIntent != null || draft.submissionId != null) {
            openSubmissionReview()
            return
        }

        try {
            val storedDraft = current.evidence.singleOrNull {
                it.inspectionId == draft.inspectionId
            } ?: throw IllegalArgumentException("evidence is not in the opened job pack")
            val pack = current.opened.stored.pack
            if (!storedDraft.isScopedTo(pack)) {
                throw IllegalArgumentException("evidence does not match the opened job pack")
            }
            val canonicalAnchor = storedDraft.expectedAnchorId?.let { expectedAnchorId ->
                pack.anchors.singleOrNull { it.anchorId == expectedAnchorId }
                    ?: throw IllegalArgumentException(
                        "evidence expected anchor is not in the opened job-pack snapshot",
                    )
            }
            if (
                canonicalAnchor == null &&
                    storedDraft.reconciliationProposal != ReconciliationProposal.NEWLY_DISCOVERED
            ) {
                throw IllegalArgumentException("provisional evidence is not a newly discovered proposal")
            }
            val validationIssues = service.validateForCompletion(
                session = currentSession,
                opened = current.opened,
                draft = storedDraft,
            )
            _uiState.value = FieldUiState.AnchorCapture(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                opened = current.opened,
                anchor = canonicalAnchor,
                draft = storedDraft,
                evidence = current.evidence,
                validationIssues = validationIssues,
            )
        } catch (error: Throwable) {
            if (error.isSessionExpired()) {
                expireSession()
            } else if (error is JobPackAccessException) {
                _uiState.value = FieldUiState.JobPackError(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    message = jobPackMessage(error),
                    canRetry = canRetryJobPack(error),
                )
            } else {
                _uiState.value = FieldUiState.JobPackError(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    message = "Unable to open anchor evidence. Try again.",
                    canRetry = true,
                )
            }
        }
    }

    fun openSubmissionReview() {
        val current = _uiState.value as? FieldUiState.JobPackOpened ?: return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val service = submissionService
        if (service == null) {
            _uiState.value = FieldUiState.JobPackError(
                account = current.account,
                jobs = current.jobs,
                job = current.job,
                message = "Submission storage is not configured for this build.",
                canRetry = false,
            )
            return
        }

        activeRequest?.cancel()
        _uiState.value = FieldUiState.OpeningSubmissionReview(
            account = current.account,
            jobs = current.jobs,
            job = current.job,
            opened = current.opened,
        )
        activeRequest = scope.launch {
            try {
                val review = service.review(currentSession, current.opened)
                _uiState.value = FieldUiState.SubmissionReview(
                    account = current.account,
                    jobs = current.jobs,
                    job = current.job,
                    opened = current.opened,
                    review = review,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                if (error.isSessionExpired()) {
                    expireSession()
                } else if (error is JobPackAccessException) {
                    _uiState.value = FieldUiState.JobPackError(
                        account = current.account,
                        jobs = current.jobs,
                        job = current.job,
                        message = jobPackMessage(error),
                        canRetry = canRetryJobPack(error),
                    )
                } else {
                    _uiState.value = FieldUiState.JobPackError(
                        account = current.account,
                        jobs = current.jobs,
                        job = current.job,
                        message = "Unable to prepare submission review. Try again.",
                        canRetry = true,
                    )
                }
            }
        }
    }

    fun queueSubmission() {
        val current = _uiState.value as? FieldUiState.SubmissionReview ?: return
        if (current.review.intent != null || current.isQueueing) return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val service = submissionService ?: run {
            _uiState.value = current.copy(
                queueError = "Submission storage is not configured for this build.",
            )
            return
        }

        activeRequest?.cancel()
        _uiState.value = current.copy(isQueueing = true, queueError = null)
        activeRequest = scope.launch {
            try {
                requireOfflineCaptureAccess(currentSession.userId)
                val intent = service.queue(currentSession, current.opened)
                val draftIds = current.review.evidence.map(AnchorInspectionDraft::inspectionId)
                if (draftIds.isEmpty()) {
                    offlineAccessSession?.recordMutation(
                        mutationId = intent.mutationId,
                        actorUserId = currentSession.userId,
                    )?.takeUnless { it.allowed }?.let { transition ->
                        throw OfflineAccessDeniedException(transition.reason)
                    }
                } else {
                    draftIds.forEach { draftId ->
                        offlineAccessSession?.replacePendingMutation(
                            mutationId = draftId,
                            replacementMutationId = intent.mutationId,
                            actorUserId = currentSession.userId,
                        )?.takeUnless { it.allowed }?.let { transition ->
                            throw OfflineAccessDeniedException(transition.reason)
                        }
                    }
                }
                current.review.evidence.flatMap { it.photos }.forEach { photo ->
                    offlineAccessSession?.recordPhoto(
                        photoId = photo.localId,
                        actorUserId = currentSession.userId,
                    )?.takeUnless { it.allowed }?.let { transition ->
                        throw OfflineAccessDeniedException(transition.reason)
                    }
                }
                if (current.review.evidence.any { it.photos.isNotEmpty() }) {
                    try {
                        schedulePhotoUpload()
                        scheduleAuthenticatedPhotoUpload(currentSession)
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Exception) {
                        // The local photo queue is durable; a later app event can reschedule it.
                    }
                }
                try {
                    scheduleMutationSync()
                } catch (error: CancellationException) {
                    throw error
                } catch (_: Exception) {
                    // The local queue is durable; a later app event can reschedule the drain.
                }
                try {
                    scheduleAuthenticatedMutationSync(currentSession)
                } catch (error: CancellationException) {
                    throw error
                } catch (_: Exception) {
                    // The local queue is durable; a later app event can reschedule the drain.
                }
                val review = service.review(currentSession, current.opened)
                _uiState.value = current.copy(
                    review = review,
                    isQueueing = false,
                    queueError = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: SubmissionNotReadyException) {
                _uiState.value = current.copy(
                    review = current.review.copy(readiness = error.readiness),
                    isQueueing = false,
                    queueError = null,
                )
            } catch (error: Throwable) {
                if (error.isSessionExpired()) {
                    expireSession()
                } else if (error is OfflineAccessDeniedException) {
                    _uiState.value = current.copy(
                        isQueueing = false,
                        queueError = offlineAccessMessage(error.reason),
                    )
                } else if (error is JobPackAccessException) {
                    _uiState.value = FieldUiState.JobPackError(
                        account = current.account,
                        jobs = current.jobs,
                        job = current.job,
                        message = jobPackMessage(error),
                        canRetry = canRetryJobPack(error),
                    )
                } else {
                    _uiState.value = current.copy(
                        isQueueing = false,
                        queueError = "Unable to queue submission locally. Try again.",
                    )
                }
            }
        }
    }

    fun closeSubmissionReview() {
        val current = _uiState.value as? FieldUiState.SubmissionReview ?: return
        if (current.isQueueing) return
        activeRequest?.cancel()
        _uiState.value = FieldUiState.JobPackOpened(
            account = current.account,
            jobs = current.jobs,
            job = current.job,
            opened = current.opened,
            evidence = current.review.evidence,
            submissionIntent = current.review.intent,
        )
    }

    fun updateAnchorDraft(draft: AnchorInspectionDraft) {
        val current = _uiState.value as? FieldUiState.AnchorCapture ?: return
        if (current.draft.submissionId != null || draft.submissionId != null) {
            _uiState.value = current.copy(
                saveState = EvidenceSaveState.FAILED,
                saveError = "Submitted local evidence is immutable.",
            )
            return
        }
        if (!draft.isBoundTo(current)) {
            _uiState.value = current.copy(
                saveState = EvidenceSaveState.FAILED,
                saveError = "Evidence must remain associated with the opened anchor.",
            )
            return
        }
        _uiState.value = current.copy(
            draft = draft,
            saveState = EvidenceSaveState.EDITING,
            validationIssues = emptyList(),
            saveError = null,
        )
    }

    fun saveAnchorDraft() {
        val current = _uiState.value as? FieldUiState.AnchorCapture ?: return
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        val service = anchorEvidenceService ?: run {
            _uiState.value = current.copy(
                saveState = EvidenceSaveState.FAILED,
                saveError = "Evidence storage is not configured for this build.",
            )
            return
        }

        activeRequest?.cancel()
        _uiState.value = current.copy(
            saveState = EvidenceSaveState.SAVING,
            saveError = null,
        )
        activeRequest = scope.launch {
            try {
                requireOfflineCaptureAccess(currentSession.userId)
                val saved = service.saveDraft(
                    session = currentSession,
                    opened = current.opened,
                    draft = current.draft,
                )
                offlineAccessSession?.recordMutation(
                    mutationId = saved.inspectionId,
                    actorUserId = currentSession.userId,
                )?.takeUnless { it.allowed }?.let { transition ->
                    throw OfflineAccessDeniedException(transition.reason)
                }
                saved.photos.forEach { photo ->
                    offlineAccessSession?.recordPhoto(
                        photoId = photo.localId,
                        actorUserId = currentSession.userId,
                    )?.takeUnless { it.allowed }?.let { transition ->
                        throw OfflineAccessDeniedException(transition.reason)
                    }
                }
                val evidence = current.evidence.replaceDraft(saved)
                if (saved.photos.isNotEmpty()) {
                    try {
                        schedulePhotoUpload()
                        scheduleAuthenticatedPhotoUpload(currentSession)
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Exception) {
                        // The local photo queue is durable; a later app event can reschedule it.
                    }
                }
                _uiState.value = current.copy(
                    draft = saved,
                    evidence = evidence,
                    saveState = EvidenceSaveState.SAVED_LOCALLY,
                    validationIssues = service.validateForCompletion(
                        session = currentSession,
                        opened = current.opened,
                        draft = saved,
                    ),
                    saveError = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                if (error.isSessionExpired()) {
                    expireSession()
                } else if (error is OfflineAccessDeniedException) {
                    _uiState.value = current.copy(
                        saveState = EvidenceSaveState.FAILED,
                        saveError = offlineAccessMessage(error.reason),
                    )
                } else if (error is JobPackAccessException) {
                    _uiState.value = FieldUiState.JobPackError(
                        account = current.account,
                        jobs = current.jobs,
                        job = current.job,
                        message = jobPackMessage(error),
                        canRetry = canRetryJobPack(error),
                    )
                } else {
                    _uiState.value = current.copy(
                        saveState = EvidenceSaveState.FAILED,
                        saveError = "Unable to save evidence locally. Try again.",
                    )
                }
            }
        }
    }

    fun attachCapturedPhoto(photo: CapturedAnchorPhoto) {
        val current = _uiState.value as? FieldUiState.AnchorCapture ?: return
        val draft = current.draft
        if (
            photo.companyId != draft.companyId ||
            photo.jobId != draft.jobId ||
            photo.inspectionId != draft.inspectionId
        ) {
            _uiState.value = current.copy(
                saveState = EvidenceSaveState.FAILED,
                saveError = "Photo could not be associated with this anchor evidence.",
            )
            return
        }
        if (draft.photos.any { it.localId == photo.localId }) return
        updateAnchorDraft(
            draft.copy(
                photos = draft.photos + AnchorEvidencePhoto(
                    companyId = photo.companyId,
                    jobId = photo.jobId,
                    anchorInspectionId = photo.inspectionId,
                    localId = photo.localId,
                    storageReference = photo.storageReference,
                    capturedAtEpochMillis = photo.capturedAtEpochMillis,
                    checksum = photo.checksum,
                    contentType = photo.contentType,
                    byteSize = photo.byteSize,
                ),
            ),
        )
        saveAnchorDraft()
    }

    fun closeAnchor() {
        val current = _uiState.value as? FieldUiState.AnchorCapture ?: return
        activeRequest?.cancel()
        _uiState.value = FieldUiState.JobPackOpened(
            account = current.account,
            jobs = current.jobs,
            job = current.job,
            opened = current.opened,
            evidence = current.evidence,
        )
    }

    fun closeJobPack() {
        val currentSession = session ?: run {
            _uiState.value = FieldUiState.SignedOut
            return
        }
        activeRequest?.cancel()
        val account = currentSession.toAccountSummary()
        _uiState.value = if (lastJobs.isEmpty()) {
            FieldUiState.EmptyJobs(account)
        } else {
            FieldUiState.JobsLoaded(account, lastJobs)
        }
    }

    fun signOut() {
        activeRequest?.cancel()
        val currentSession = session
        if (currentSession == null || offlineAccessSession == null) {
            completeSignOut(currentSession)
            return
        }

        scope.launch {
            try {
                val logout = offlineAccessSession.requestLogout(currentSession.userId)
                if (!logout.allowed) {
                    _uiState.value = FieldUiState.Error(
                        message = logoutMessage(logout.reason),
                        canRetry = false,
                        account = currentSession.toAccountSummary(),
                    )
                    return@launch
                }
                completeSignOut(currentSession)
            } catch (error: CancellationException) {
                throw error
            } catch (_: Throwable) {
                _uiState.value = FieldUiState.Error(
                    message = "Unable to verify local evidence before signing out.",
                    canRetry = true,
                    account = currentSession.toAccountSummary(),
                )
            }
        }
    }

    private suspend fun loadJobs(currentSession: FieldSession) {
        if (currentSession.isExpired(nowEpochMillis())) {
            expireSession()
            return
        }

        var activeSession = currentSession
        var account = currentSession.toAccountSummary()
        _uiState.value = FieldUiState.LoadingJobs(account)
        try {
            activeSession = renewIfNeeded(currentSession)
            account = activeSession.toAccountSummary()
            _uiState.value = FieldUiState.LoadingJobs(account)
            val jobs = visibleJobsForInspector(
                activeSession,
                gateway.listAuthorizedJobs(activeSession),
            )
            lastJobs = jobs
            offlineAccessSession?.refreshOnline(
                reachable = true,
                serverAccountStatus = OfflineAccountStatus.ACTIVE,
                actorUserId = activeSession.userId,
            )
            _uiState.value = if (jobs.isEmpty()) {
                FieldUiState.EmptyJobs(account)
            } else {
                FieldUiState.JobsLoaded(account, jobs)
            }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Throwable) {
            if (error.isServerAuthorizationFailure()) {
                notifyServerRevocation(activeSession)
            } else if (error.isSessionExpired()) {
                expireSession()
            } else {
                _uiState.value = FieldUiState.Error(
                    message = jobLoadMessage(error),
                    canRetry = true,
                    account = account,
                )
            }
        }
    }

    private suspend fun renewIfNeeded(currentSession: FieldSession): FieldSession {
        if (!sessionNeedsRenewal(currentSession)) return currentSession

        val renewed = gateway.renewSession(currentSession)
        if (
            renewed.companyId != currentSession.companyId ||
            renewed.sessionId != currentSession.sessionId ||
            renewed.userId != currentSession.userId ||
            renewed.email != currentSession.email
        ) {
            throw FieldGatewayException(
                GatewayFailureReason.TENANT_MISMATCH,
                "renewed session does not match the signed-in account",
            )
        }
        requireInspectorSession(renewed)
        if (renewed.isExpired(nowEpochMillis())) {
            throw FieldSessionExpiredException()
        }
        session = renewed
        sessionStore?.saveSession(renewed)
        return renewed
    }

    private fun sessionNeedsRenewal(currentSession: FieldSession): Boolean =
        currentSession.expiresAtEpochMillis - nowEpochMillis() <=
            SESSION_RENEWAL_WINDOW_MILLIS

    private fun expireSession() {
        session = null
        clearAuthenticatedMutationSync()
        gateway.clearSession()
        sessionStore?.let { store ->
            scope.launch { store.clearSession() }
        }
        _uiState.value = FieldUiState.SessionExpired()
    }

    private suspend fun notifyServerRevocation(currentSession: FieldSession) {
        offlineAccessSession?.observeServerAccountStatus(
            status = OfflineAccountStatus.REVOKED,
            deviceNotified = true,
            actorUserId = currentSession.userId,
        )
        sessionStore?.clearSession()
        session = null
        clearAuthenticatedMutationSync()
        gateway.clearSession()
        _uiState.value = FieldUiState.AccountRevoked(currentSession.toAccountSummary())
    }

    private suspend fun requireOfflineCaptureAccess(actorUserId: String) {
        val transition = offlineAccessSession?.prepareCapture(actorUserId) ?: return
        if (!transition.allowed) {
            throw OfflineAccessDeniedException(transition.reason)
        }
    }

    private fun completeSignOut(currentSession: FieldSession?) {
        session = null
        clearAuthenticatedMutationSync()
        _uiState.value = FieldUiState.SignedOut
        gateway.clearSession()

        sessionStore?.let { store ->
            scope.launch { store.clearSession() }
        }

        if (currentSession != null) {
            scope.launch {
                try {
                    gateway.revokeSession(currentSession)
                } catch (error: CancellationException) {
                    throw error
                } catch (_: Throwable) {
                    // Server revocation remains best effort when connectivity is unavailable.
                }
            }
        }
    }

    private fun logoutMessage(reason: OfflineAccessDecisionReason): String = when (reason) {
        OfflineAccessDecisionReason.PENDING_EVIDENCE,
        OfflineAccessDecisionReason.UNRESOLVED_CONFLICT,
        OfflineAccessDecisionReason.SERVER_UNACKNOWLEDGED,
        -> "Finish synchronising local evidence before signing out."
        OfflineAccessDecisionReason.ACCOUNT_REVOKED,
        OfflineAccessDecisionReason.RECOVERY_REQUIRED,
        -> "Account access is revoked; local evidence remains preserved."
        else -> "Local evidence must be settled before signing out."
    }

    private fun offlineAccessMessage(reason: OfflineAccessDecisionReason): String = when (reason) {
        OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED ->
            "Offline access is locked after a clock change. Reconnect to refresh access."
        OfflineAccessDecisionReason.LEASE_EXPIRED_DENIED ->
            "Offline access has expired. Reconnect to refresh access."
        OfflineAccessDecisionReason.ACCOUNT_REVOKED,
        OfflineAccessDecisionReason.RECOVERY_REQUIRED,
        OfflineAccessDecisionReason.RECOVERY_EXPIRED,
        -> "Offline capture is locked; local evidence remains preserved."
        OfflineAccessDecisionReason.DEVICE_LOCKED_DENIED,
        OfflineAccessDecisionReason.DEVICE_AUTH_FAILED,
        -> "Unlock this device before capturing evidence."
        OfflineAccessDecisionReason.KEYSTORE_LOST ->
            "Encrypted local access is unavailable; local evidence remains preserved."
        OfflineAccessDecisionReason.LOCAL_PACK_MISSING ->
            "Open an authorised job pack before capturing evidence."
        else -> "Offline capture is locked; local evidence remains preserved."
    }

    private suspend fun claimJob(
        currentSession: FieldSession,
        job: InspectorJob,
    ): InspectorJob {
        val claimed = gateway.claimJob(currentSession, job.jobId)
        if (
            claimed.companyId != currentSession.companyId ||
            claimed.jobId != job.jobId ||
            claimed.siteId != job.siteId ||
            claimed.jurisdiction != job.jurisdiction ||
            claimed.reference != job.reference ||
            claimed.jobPackVersion != job.jobPackVersion ||
            claimed.assignment?.inspectorUserId != currentSession.userId
        ) {
            throw FieldGatewayException(
                GatewayFailureReason.INVALID_RESPONSE,
                "claimed job does not match the selected job",
            )
        }
        lastJobs = lastJobs.map { existing ->
            if (existing.jobId == claimed.jobId) claimed else existing
        }
        return claimed
    }

    private fun signInError(error: Throwable): FieldUiState.Error = FieldUiState.Error(
        message = when (error) {
            is ProviderAccessTokenException ->
                "Identity provider sign-in is not configured for this build."
            is FieldAuthorizationException -> "Inspector access is required."
            is FieldGatewayException -> when (error.reason) {
                GatewayFailureReason.UNAUTHENTICATED -> "Sign-in was not accepted."
                GatewayFailureReason.FORBIDDEN -> "Inspector access is required."
                GatewayFailureReason.NETWORK,
                GatewayFailureReason.UNAVAILABLE,
                -> "Unable to sign in. Check connection and try again."
                GatewayFailureReason.TENANT_MISMATCH -> "Company could not be verified."
                GatewayFailureReason.INVALID_RESPONSE,
                GatewayFailureReason.UNKNOWN,
                -> "Unable to sign in. Try again."
            }
            else -> "Unable to sign in. Try again."
        },
        canRetry = error is FieldGatewayException &&
            error.reason in setOf(
                GatewayFailureReason.NETWORK,
                GatewayFailureReason.UNAVAILABLE,
            ),
    )

    private fun jobLoadMessage(error: Throwable): String = when (error) {
        is FieldAuthorizationException -> "Inspector access is required."
        is FieldGatewayException -> when (error.reason) {
            GatewayFailureReason.UNAUTHENTICATED -> "Session expired. Sign in again."
            GatewayFailureReason.FORBIDDEN -> "Current account cannot view these jobs."
            GatewayFailureReason.NETWORK,
            GatewayFailureReason.UNAVAILABLE,
            -> "Unable to sync jobs. Check connection and try again."
            else -> "Unable to sync jobs. Try again."
        }
        else -> "Unable to sync jobs. Try again."
    }

    private fun jobPackMessage(error: Throwable): String = when (error) {
        is DeviceAuthenticationRequiredException ->
            "Unlock this device to open the job pack."
        is OfflineAccessDeniedException -> offlineAccessMessage(error.reason)
        is FieldAuthorizationException -> "Current account cannot open this job pack."
        is JobPackAccessException -> when (error.reason) {
            JobPackAccessFailure.NOT_FOUND -> "Job pack is not available on this device. Try again."
            JobPackAccessFailure.JOB_NOT_CLAIMED ->
                "Claim the job before opening its pack."
            JobPackAccessFailure.LOCAL_PACK_IDENTITY_MISMATCH,
            JobPackAccessFailure.INVALID_REMOTE_PACK,
            -> "Job pack could not be verified. Try again."
            JobPackAccessFailure.PACK_VERSION_CONFLICT ->
                "A newer job pack is required. Refresh jobs and try again."
            JobPackAccessFailure.LEASE_EXPIRED,
            JobPackAccessFailure.ELAPSED_RUNTIME_EXPIRED,
            JobPackAccessFailure.CLOCK_ROLLBACK,
            -> "Offline access is locked. Local evidence is preserved."
        }
        is FieldGatewayException -> when (error.reason) {
            GatewayFailureReason.NETWORK,
            GatewayFailureReason.UNAVAILABLE,
            -> "Unable to download job pack. Check connection and try again."
            GatewayFailureReason.FORBIDDEN -> "Current account cannot download this job pack."
            GatewayFailureReason.UNAUTHENTICATED -> "Session expired. Sign in again."
            else -> "Unable to download job pack. Try again."
        }
        else -> "Unable to open job pack. Try again."
    }

    private fun canRetryJobPack(error: Throwable): Boolean = when (error) {
        is DeviceAuthenticationRequiredException -> true
        is OfflineAccessDeniedException ->
            error.reason != OfflineAccessDecisionReason.CLOCK_ROLLBACK_DENIED
        is FieldAuthorizationException -> false
        is JobPackAccessException -> error.reason !in setOf(
            JobPackAccessFailure.LOCAL_PACK_IDENTITY_MISMATCH,
            JobPackAccessFailure.CLOCK_ROLLBACK,
        )
        is FieldGatewayException -> error.reason in setOf(
            GatewayFailureReason.NETWORK,
            GatewayFailureReason.UNAVAILABLE,
        )
        else -> true
    }

    private fun Throwable.isSessionExpired(): Boolean =
        this is FieldSessionExpiredException ||
            (this is FieldGatewayException &&
                reason == GatewayFailureReason.UNAUTHENTICATED)

    private fun Throwable.isServerAuthorizationFailure(): Boolean =
        this is FieldGatewayException &&
            reason == GatewayFailureReason.UNAUTHENTICATED

    private fun Throwable.isRetryableNetworkFailure(): Boolean =
        this is FieldGatewayException &&
            reason in setOf(GatewayFailureReason.NETWORK, GatewayFailureReason.UNAVAILABLE)

    private fun FieldSession.toAccountSummary() = AccountSummary(
        companyId = companyId,
        userId = userId,
        email = email,
        role = role,
    )
}

private class OfflineAccessDeniedException(
    val reason: OfflineAccessDecisionReason,
) : IllegalStateException()

private fun List<AnchorInspectionDraft>.replaceDraft(
    draft: AnchorInspectionDraft,
): List<AnchorInspectionDraft> = filterNot { existing ->
    existing.inspectionId == draft.inspectionId
} + draft

private fun AnchorInspectionDraft.isBoundTo(
    capture: FieldUiState.AnchorCapture,
): Boolean {
    val pack = capture.opened.stored.pack
    if (
        companyId != pack.companyId ||
        jobId != pack.jobId ||
        jobPackVersion != pack.jobPackVersion ||
        inspectionId != capture.draft.inspectionId
    ) {
        return false
    }
    return when (reconciliationProposal) {
        ReconciliationProposal.NEWLY_DISCOVERED -> expectedAnchorId == null
        else -> capture.anchor?.let { expectedAnchorId == it.anchorId } == true
    }
}

private fun AnchorInspectionDraft.isScopedTo(
    pack: FieldJobPack,
): Boolean =
    companyId == pack.companyId &&
        jobId == pack.jobId &&
        jobPackVersion == pack.jobPackVersion
