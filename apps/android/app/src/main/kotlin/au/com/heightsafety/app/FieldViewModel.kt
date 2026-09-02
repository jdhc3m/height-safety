package au.com.heightsafety.app

import au.com.heightsafety.domain.FieldAuthorizationException
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.FieldSessionExpiredException
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAccessException
import au.com.heightsafety.domain.JobPackAccessFailure
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.ProviderAccessTokenException
import au.com.heightsafety.domain.ProviderAccessTokenSource
import au.com.heightsafety.domain.requireInspectorSession
import au.com.heightsafety.domain.visibleJobsForInspector
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class SyncState {
    SYNCHRONISING,
    SYNCHRONISED,
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
}

class FieldViewModel(
    private val gateway: FieldGateway,
    private val providerAccessTokenSource: ProviderAccessTokenSource,
    private val scope: CoroutineScope,
    private val jobPackService: JobPackService? = null,
    private val nowEpochMillis: () -> Long = { System.currentTimeMillis() },
    private val deviceAuthenticationGate: DeviceAuthenticationGate =
        DeviceAuthenticationGate { true },
) {
    private val _uiState = MutableStateFlow<FieldUiState>(FieldUiState.SignedOut)
    val uiState: StateFlow<FieldUiState> = _uiState.asStateFlow()

    private var session: FieldSession? = null
    private var lastCompanyId: String = ""
    private var lastJobs: List<InspectorJob> = emptyList()
    private var activeRequest: Job? = null

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

                session = createdSession
                loadJobs(createdSession)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                session = null
                gateway.clearSession()
                _uiState.value = signInError(error)
            }
        }
    }

    fun retry() {
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
                    throw DeviceAuthenticationRequiredException()
                }
                if (
                    selectedJob.workflowStatus == "released" &&
                    selectedJob.assignment == null
                ) {
                    authorisedJob = claimJob(currentSession, selectedJob)
                }
                val opened = service.openOrDownload(currentSession, authorisedJob)
                _uiState.value = FieldUiState.JobPackOpened(
                    account = account,
                    jobs = lastJobs,
                    job = authorisedJob,
                    opened = opened,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                if (error.isSessionExpired()) {
                    expireSession()
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
        session = null
        _uiState.value = FieldUiState.SignedOut
        gateway.clearSession()

        if (currentSession != null) {
            scope.launch {
                try {
                    gateway.revokeSession(currentSession)
                } catch (error: CancellationException) {
                    throw error
                } catch (_: Throwable) {
                    // Local session is already cleared. Server revocation remains
                    // best effort when connectivity is unavailable.
                }
            }
        }
    }

    private suspend fun loadJobs(currentSession: FieldSession) {
        if (currentSession.isExpired(nowEpochMillis())) {
            expireSession()
            return
        }

        val account = currentSession.toAccountSummary()
        _uiState.value = FieldUiState.LoadingJobs(account)
        try {
            val jobs = visibleJobsForInspector(
                currentSession,
                gateway.listAuthorizedJobs(currentSession),
            )
            lastJobs = jobs
            _uiState.value = if (jobs.isEmpty()) {
                FieldUiState.EmptyJobs(account)
            } else {
                FieldUiState.JobsLoaded(account, jobs)
            }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Throwable) {
            if (error.isSessionExpired()) {
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

    private fun expireSession() {
        session = null
        gateway.clearSession()
        _uiState.value = FieldUiState.SessionExpired()
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

    private fun FieldSession.toAccountSummary() = AccountSummary(
        companyId = companyId,
        userId = userId,
        email = email,
        role = role,
    )
}
