package au.com.heightsafety.app

import android.app.Activity
import android.app.KeyguardManager
import android.content.ActivityNotFoundException
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.data.EncryptedJobPackStore
import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.AnchorSubmissionService
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.ProviderAccessTokenSource
import kotlin.coroutines.resume
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID

/** Debug-only interactive field flow backed by synthetic data. */
class DebugDemoActivity : ComponentActivity() {
    private var fieldViewModel: FieldViewModel? = null
    private var deviceAuthenticationContinuation: CancellableContinuation<Boolean>? = null

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

        val gateway = DebugDemoGateway()
        val localStore = EncryptedJobPackStore(
            context = applicationContext,
            directoryName = DebugDemoGateway.DEMO_DIRECTORY_NAME,
            keyAlias = DebugDemoGateway.DEMO_KEY_ALIAS,
        )
        val jobPackService = JobPackService(
            gateway = gateway,
            store = localStore,
            nowEpochMillis = { System.currentTimeMillis() },
            elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
        )
        val anchorEvidenceService = AnchorEvidenceService(
            store = localStore,
            nowEpochMillis = { System.currentTimeMillis() },
            elapsedRealtimeMillis = { SystemClock.elapsedRealtime() },
        )
        val submissionService = AnchorSubmissionService(
            evidenceService = anchorEvidenceService,
            store = localStore,
            nowEpochMillis = { System.currentTimeMillis() },
            submissionIdGenerator = { UUID.randomUUID().toString() },
            mutationIdGenerator = { UUID.randomUUID().toString() },
        )

        setContent {
            val scope = rememberCoroutineScope()
            val viewModel = remember(scope) {
                FieldViewModel(
                    gateway = gateway,
                    providerAccessTokenSource = ProviderAccessTokenSource {
                        DebugDemoGateway.DEMO_PROVIDER_ACCESS_TOKEN
                    },
                    scope = scope,
                    jobPackService = jobPackService,
                    anchorEvidenceService = anchorEvidenceService,
                    submissionService = submissionService,
                    deviceAuthenticationGate = DeviceAuthenticationGate {
                        authenticateWithDeviceCredential()
                    },
                )
            }.also { fieldViewModel = it }
            val state by viewModel.uiState.collectAsState()

            MaterialTheme {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .statusBarsPadding(),
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "DEBUG-ONLY DEMO",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = "Synthetic NSW/QLD jobs. No server or real account.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Text(
                                text = "Temporary demo login: enter company ID aaa.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                    Surface(modifier = Modifier.weight(1f)) {
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
                            onCapturePhoto = {
                                val capture = viewModel.uiState.value as? FieldUiState.AnchorCapture
                                capture?.let {
                                    cameraCaptureLauncher.launch(
                                        CameraCaptureIntent.create(
                                            context = this@DebugDemoActivity,
                                            companyId = it.draft.companyId,
                                            jobId = it.draft.jobId,
                                            inspectionId = it.draft.inspectionId,
                                            photoDirectoryName = DebugDemoGateway.DEMO_DIRECTORY_NAME,
                                        ),
                                    )
                                }
                            },
                        )
                    }
                }
            }
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
