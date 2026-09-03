package au.com.heightsafety.app

import android.app.Activity
import android.app.KeyguardManager
import android.content.ActivityNotFoundException
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.collectAsState
import au.com.heightsafety.data.EncryptedJobPackStore
import au.com.heightsafety.api.infrastructure.ApiClient
import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.JobPackService
import kotlin.coroutines.resume
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID

class MainActivity : ComponentActivity() {
    private var deviceAuthenticationContinuation: CancellableContinuation<Boolean>? = null
    private var fieldViewModel: FieldViewModel? = null

    private val cameraCaptureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
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
        enableEdgeToEdge()
        setContent {
            val scope = rememberCoroutineScope()
            val viewModel = remember(scope) {
                val apiClient = ApiClient(
                    baseUrl = getString(R.string.api_base_url),
                    authNames = arrayOf("access-token"),
                )
                val gateway = OpenApiFieldGateway(apiClient)
                val localStore = EncryptedJobPackStore(applicationContext)
                FieldViewModel(
                    gateway = gateway,
                    providerAccessTokenSource = UnconfiguredProviderAccessTokenSource(),
                    scope = scope,
                    jobPackService = JobPackService(
                        gateway = gateway,
                        store = localStore,
                        nowEpochMillis = { System.currentTimeMillis() },
                        elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
                    ),
                    anchorEvidenceService = AnchorEvidenceService(
                        store = localStore,
                        nowEpochMillis = { System.currentTimeMillis() },
                        elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
                    ),
                    deviceAuthenticationGate = DeviceAuthenticationGate {
                        authenticateWithDeviceCredential()
                    },
                )
            }.also { fieldViewModel = it }
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
                onCloseAnchor = viewModel::closeAnchor,
                onUpdateAnchorDraft = viewModel::updateAnchorDraft,
                onSaveAnchorDraft = viewModel::saveAnchorDraft,
                onCapturePhoto = {
                    val capture = viewModel.uiState.value as? FieldUiState.AnchorCapture
                    capture?.let {
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
