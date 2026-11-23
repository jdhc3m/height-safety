package au.com.heightsafety.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.SupportedJurisdiction

class ReferenceActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableSignalFieldEdgeToEdge()
        val requestedFrame = intent.getStringExtra("reference_frame")
        setContent {
            when (requestedFrame) {
                "job_pack" -> ReferenceStandalone(referenceJobPackState())
                "defective_anchor" -> ReferenceStandalone(referenceDefectiveAnchorState())
                else -> ReferenceGallery()
            }
        }
    }
}

@Composable
private fun ReferenceStandalone(state: FieldUiState) {
    FieldScreen(
        state = state,
        onSignIn = {},
        onRetry = {},
        onRefresh = {},
        onSignOut = {},
    )
}

@Composable
private fun ReferenceGallery() {
    SignalFieldTheme {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column(modifier = Modifier.padding(top = 24.dp)) {
                    Text(
                        text = "3B-01 reference gallery",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Text(
                        text = "Debug-only static frames. No live data or auth bypass.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
            item { ReferenceFrame("Signed out", FieldUiState.SignedOut) }
            item { ReferenceFrame("Signing in", FieldUiState.SigningIn("company-a")) }
            item { ReferenceFrame("Loading jobs", FieldUiState.LoadingJobs(referenceAccount())) }
            item {
                ReferenceFrame(
                    "Jobs loaded",
                    FieldUiState.JobsLoaded(referenceAccount(), listOf(referenceJob())),
                )
            }
            item { ReferenceFrame("Job pack", referenceJobPackState()) }
            item {
                ReferenceFrame(
                    "Anchor capture — defective",
                    referenceDefectiveAnchorState(),
                )
            }
            item { ReferenceFrame("Empty jobs", FieldUiState.EmptyJobs(referenceAccount())) }
            item {
                ReferenceFrame(
                    "Sync error",
                    FieldUiState.Error(
                        message = "Unable to sync jobs. Check connection and try again.",
                        canRetry = true,
                        account = referenceAccount(),
                    ),
                )
            }
            item { ReferenceFrame("Session expired", FieldUiState.SessionExpired()) }
            item { Box(modifier = Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun ReferenceFrame(label: String, state: FieldUiState) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(680.dp),
        ) {
            FieldScreen(
                state = state,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }
    }
}

private fun referenceAccount() = AccountSummary(
    companyId = "company-a",
    userId = "inspector-a",
    email = "inspector-a@example.test",
    role = ProductRole.INSPECTOR,
)

private fun referenceJob() = InspectorJob(
    companyId = "company-a",
    jobId = "job-001",
    siteId = "site-001",
    jurisdiction = SupportedJurisdiction.QLD,
    reference = "JOB-001",
    plannedDate = "2026-09-15",
    workflowStatus = "in_progress",
    jobPackVersion = 7L,
    createdAtEpochMillis = 1L,
    updatedAtEpochMillis = 2L,
    assignment = InspectorAssignment(
        companyId = "company-a",
        assignmentId = "assignment-001",
        jobId = "job-001",
        inspectorUserId = "inspector-a",
        assignedByUserId = null,
        assignmentType = "claimed",
        isPrimary = true,
        assignedAtEpochMillis = 1L,
        claimedAtEpochMillis = 2L,
    ),
)
