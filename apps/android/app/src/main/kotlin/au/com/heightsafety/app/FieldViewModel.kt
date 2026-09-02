package au.com.heightsafety.app

import au.com.heightsafety.domain.FieldAuthorizationException
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.FieldSessionExpiredException
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.InspectorJob
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
    private val nowEpochMillis: () -> Long = { System.currentTimeMillis() },
) {
    private val _uiState = MutableStateFlow<FieldUiState>(FieldUiState.SignedOut)
    val uiState: StateFlow<FieldUiState> = _uiState.asStateFlow()

    private var session: FieldSession? = null
    private var lastCompanyId: String = ""
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
