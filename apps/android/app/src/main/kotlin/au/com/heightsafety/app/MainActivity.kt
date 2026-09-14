package au.com.heightsafety.app

import android.app.Activity
import android.app.KeyguardManager
import android.content.ActivityNotFoundException
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.collectAsState
import androidx.lifecycle.lifecycleScope
import au.com.heightsafety.data.EncryptedJobPackStore
import au.com.heightsafety.api.infrastructure.ApiClient
import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.AnchorSubmissionService
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.OfflineAccessSession
import kotlin.coroutines.resume
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID

class MainActivity : ComponentActivity() {
    private var deviceAuthenticationContinuation: CancellableContinuation<Boolean>? = null
    private var fieldViewModel: FieldViewModel? = null
    private var appWasStopped = false
    private var cameraCaptureInProgress = false

    private val cameraCaptureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        cameraCaptureInProgress = false
        CameraCaptureIntent.capturedPhoto(result.data)?.let { photo ->
            fieldViewModel?.attachCapturedPhoto(photo)
        }
    }

    private val deviceAuthenticationLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val continuation = deviceAuthenticationContinuation ?: return@registerForActivityResult
        deviceAuthenticationContinuation = null
        continuation.resume(result.resultCode == Activity.RESULT_OK)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableSignalFieldEdgeToEdge()
        setContent {
            val viewModel = remember {
                val apiClient = ApiClient(
                    baseUrl = getString(R.string.api_base_url),
                    authNames = arrayOf("access-token"),
                )
                val gateway = OpenApiFieldGateway(apiClient)
                val localStore = EncryptedJobPackStore(applicationContext)
                val offlineAccessSession = OfflineAccessSession(
                    store = localStore,
                    nowEpochMillis = { System.currentTimeMillis() },
                    elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
                )
                val evidenceService = AnchorEvidenceService(
                    store = localStore,
                    nowEpochMillis = { System.currentTimeMillis() },
                    elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
                )
                FieldViewModel(
                    gateway = gateway,
                    providerAccessTokenSource = providerAccessTokenSource(),
                    scope = lifecycleScope,
                    jobPackService = JobPackService(
                        gateway = gateway,
                        store = localStore,
                        nowEpochMillis = { System.currentTimeMillis() },
                        elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
                    ),
                    anchorEvidenceService = evidenceService,
                    offlineAccessSession = offlineAccessSession,
                    sessionStore = localStore,
                    submissionService = AnchorSubmissionService(
                        evidenceService = evidenceService,
                        store = localStore,
                        nowEpochMillis = { System.currentTimeMillis() },
                        submissionIdGenerator = { UUID.randomUUID().toString() },
                        mutationIdGenerator = { UUID.randomUUID().toString() },
                    ),
                    scheduleAuthenticatedMutationSync = { session ->
                        MutationOutboxWork.enqueue(applicationContext, session)
                    },
                    clearAuthenticatedMutationSync = {
                        MutationOutboxWork.clearSession()
                        PhotoUploadWork.clearSession()
                    },
                    scheduleAuthenticatedPhotoUpload = { session ->
                        PhotoUploadWork.enqueue(applicationContext, session)
                    },
                    schedulePhotoUpload = {
                        PhotoUploadWork.enqueue(applicationContext)
                    },
                    deviceAuthenticationGate = DeviceAuthenticationGate {
                        authenticateWithDeviceCredential()
                    },
                )
            }.also { fieldViewModel = it }
            LaunchedEffect(viewModel) {
                viewModel.restorePersistedSession()
            }
            val state by viewModel.uiState.collectAsState()
            FieldScreen(
                state = state,
                onSignIn = viewModel::signIn,
                onRetry = viewModel::retry,
                onRefresh = viewModel::refreshJobs,
                onSignOut = viewModel::signOut,
                onOpenJob = viewModel::openJobPack,
                onCloseJobPack = viewModel::closeJobPack,
                onOpenAnchor = viewModel::openAnchor,
                onOpenEvidence = viewModel::openEvidence,
                onAddDiscoveredAnchor = viewModel::openNewlyDiscoveredAnchor,
                onCloseAnchor = viewModel::closeAnchor,
                onUpdateAnchorDraft = viewModel::updateAnchorDraft,
                onSaveAnchorDraft = viewModel::saveAnchorDraft,
                onOpenSubmissionReview = viewModel::openSubmissionReview,
                onCloseSubmissionReview = viewModel::closeSubmissionReview,
                onQueueSubmission = viewModel::queueSubmission,
                onStartAdministratorRecovery = viewModel::startAdministratorRecovery,
                onCapturePhoto = {
                    val capture = viewModel.uiState.value as? FieldUiState.AnchorCapture
                    capture?.let {
                        cameraCaptureInProgress = true
                        cameraCaptureLauncher.launch(
                            CameraCaptureIntent.create(
                                context = this@MainActivity,
                                companyId = it.draft.companyId,
                                jobId = it.draft.jobId,
                                inspectionId = it.draft.inspectionId,
                                localId = UUID.randomUUID().toString(),
                            ),
                        )
                    }
                },
            )
        }
    }

    private fun providerAccessTokenSource() =
        if (
            hasAuth0Configuration(
                domain = getString(R.string.com_auth0_domain),
                clientId = getString(R.string.com_auth0_client_id),
                apiAudience = getString(R.string.auth0_api_audience),
            )
        ) {
            Auth0ProviderAccessTokenSource(this)
        } else {
            UnconfiguredProviderAccessTokenSource()
        }

    override fun onPostResume() {
        super.onPostResume()
        if (appWasStopped) {
            appWasStopped = false
            fieldViewModel?.onApplicationForegrounded()
        }
    }

    override fun onStop() {
        val stoppedForExternalAuthentication = deviceAuthenticationContinuation != null
        val stoppedForCameraCapture = cameraCaptureInProgress
        appWasStopped = !stoppedForExternalAuthentication && !stoppedForCameraCapture
        if (appWasStopped) {
            fieldViewModel?.onApplicationBackgrounded()
        }
        super.onStop()
    }

    override fun onDestroy() {
        deviceAuthenticationContinuation?.cancel()
        deviceAuthenticationContinuation = null
        super.onDestroy()
    }

    private suspend fun authenticateWithDeviceCredential(): Boolean {
        val keyguardManager = getSystemService(KeyguardManager::class.java)
        if (keyguardManager == null || !keyguardManager.isDeviceSecure) {
            return false
        }
        val intent = keyguardManager.createConfirmDeviceCredentialIntent(
            getString(R.string.device_unlock_title),
            getString(R.string.device_unlock_description),
        ) ?: return false

        return suspendCancellableCoroutine { continuation ->
            if (deviceAuthenticationContinuation != null) {
                continuation.resume(false)
                return@suspendCancellableCoroutine
            }
            deviceAuthenticationContinuation = continuation
            continuation.invokeOnCancellation {
                if (deviceAuthenticationContinuation === continuation) {
                    deviceAuthenticationContinuation = null
                }
            }
            try {
                deviceAuthenticationLauncher.launch(intent)
            } catch (_: ActivityNotFoundException) {
                deviceAuthenticationContinuation = null
                continuation.resume(false)
            }
        }
    }
}
