package au.com.heightsafety.app

import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.data.EncryptedJobPackStore
import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.ProviderAccessTokenSource

/** Debug-only interactive field flow backed by synthetic data. */
class DebugDemoActivity : ComponentActivity() {
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
                    deviceAuthenticationGate = DeviceAuthenticationGate { true },
                )
            }
            LaunchedEffect(viewModel) {
                viewModel.signIn(DebugDemoGateway.DEMO_COMPANY_ID)
            }
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
                            onCloseAnchor = viewModel::closeAnchor,
                            onUpdateAnchorDraft = viewModel::updateAnchorDraft,
                            onSaveAnchorDraft = viewModel::saveAnchorDraft,
                        )
                    }
                }
            }
        }
    }
}
