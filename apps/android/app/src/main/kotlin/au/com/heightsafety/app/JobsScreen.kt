package au.com.heightsafety.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.InspectorJob

@Composable
internal fun JobsContent(
    state: FieldUiState,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
    onOpenJob: (InspectorJob) -> Unit,
) {
    val account = stateJobsAccount(state) ?: return

    Column(modifier = Modifier.fillMaxSize()) {
        SignalHeader(
            title = stringResource(R.string.inspector_jobs),
            subtitle = account.email,
            glyph = SignalGlyph.Industry,
            action = {
                TextButton(
                    onClick = onSignOut,
                    modifier = Modifier.heightIn(min = 48.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                ) {
                    Text(stringResource(R.string.sign_out))
                }
            },
        )
        SignalInfoRow(
            glyph = SignalGlyph.Industry,
            text = stringResource(R.string.company_value, account.companyId),
        )
        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Spacer(modifier = Modifier.height(12.dp))

        when (state) {
            is FieldUiState.LoadingJobs -> SyncingContent()
            is FieldUiState.JobsLoaded -> {
                SyncStatusLabel(state.syncState)
                Spacer(modifier = Modifier.height(8.dp))
                JobList(
                    modifier = Modifier.weight(1f),
                    jobs = state.jobs,
                    onOpenJob = onOpenJob,
                )
            }
            is FieldUiState.EmptyJobs -> {
                SyncStatusLabel(state.syncState)
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = stringResource(R.string.no_eligible_jobs),
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(stringResource(R.string.no_eligible_jobs_detail))
                Spacer(modifier = Modifier.height(16.dp))
                SignalTonalButton(
                    text = stringResource(R.string.refresh_jobs),
                    glyph = SignalGlyph.Refresh,
                    onClick = onRefresh,
                    modifier = Modifier.widthIn(min = 160.dp),
                )
            }
            is FieldUiState.Error -> {
                SyncStatusLabel(state.syncState)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = state.message,
                    color = MaterialTheme.colorScheme.error,
                )
                if (state.canRetry) {
                    Spacer(modifier = Modifier.height(16.dp))
                    SignalTonalButton(
                        text = stringResource(R.string.retry),
                        glyph = SignalGlyph.Refresh,
                        onClick = onRetry,
                        modifier = Modifier.widthIn(min = 120.dp),
                    )
                }
            }
            is FieldUiState.OpeningJobPack -> {
                SyncingJobPackContent()
            }
            is FieldUiState.JobPackError -> {
                SyncStatusLabel(state.syncState)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = state.message,
                    color = MaterialTheme.colorScheme.error,
                )
                if (state.canRetry) {
                    Spacer(modifier = Modifier.height(16.dp))
                    SignalTonalButton(
                        text = stringResource(R.string.retry),
                        glyph = SignalGlyph.Refresh,
                        onClick = onRetry,
                        modifier = Modifier.widthIn(min = 120.dp),
                    )
                }
            }
            else -> Unit
        }
    }
}

/** Account for every state the jobs screen can render; null elsewhere. */
internal fun stateJobsAccount(state: FieldUiState): AccountSummary? = when (state) {
    is FieldUiState.LoadingJobs -> state.account
    is FieldUiState.JobsLoaded -> state.account
    is FieldUiState.EmptyJobs -> state.account
    is FieldUiState.Error -> state.account
    is FieldUiState.OpeningJobPack -> state.account
    is FieldUiState.JobPackError -> state.account
    else -> null
}

@Composable
private fun SyncingContent() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator()
        Spacer(modifier = Modifier.height(12.dp))
        Text(stringResource(R.string.syncing_jobs))
    }
}

@Composable
private fun SyncingJobPackContent() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator()
        Spacer(modifier = Modifier.height(12.dp))
        Text(stringResource(R.string.downloading_job_pack))
    }
}

@Composable
internal fun SyncStatusLabel(syncState: SyncState) {
    val failed = syncState == SyncState.FAILED
    val synchronised = syncState == SyncState.SYNCHRONISED
    SignalStatusChip(
        text = when (syncState) {
            SyncState.SYNCHRONISING -> stringResource(R.string.syncing_jobs)
            SyncState.SYNCHRONISED -> stringResource(R.string.jobs_updated)
            SyncState.FAILED -> stringResource(R.string.sync_failed)
        },
        glyph = if (failed) SignalGlyph.Warning else SignalGlyph.CloudCheck,
        tint = when {
            failed -> MaterialTheme.colorScheme.error
            synchronised -> SignalSemanticColors.success
            else -> MaterialTheme.colorScheme.secondary
        },
        container = if (failed) {
            MaterialTheme.colorScheme.errorContainer
        } else if (synchronised) {
            SignalSemanticColors.successContainer
        } else {
            MaterialTheme.colorScheme.secondaryContainer
        },
    )
}

@Composable
private fun JobList(
    modifier: Modifier = Modifier,
    jobs: List<InspectorJob>,
    onOpenJob: (InspectorJob) -> Unit,
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(jobs, key = { it.jobId }) { job ->
            JobCard(job, onOpenJob)
        }
    }
}

@Composable
private fun JobCard(
    job: InspectorJob,
    onOpenJob: (InspectorJob) -> Unit,
) {
    SignalCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                SignalStandaloneIcon(
                    glyph = SignalGlyph.Industry,
                    contentDescription = null,
                    size = 40.dp,
                )
                Spacer(modifier = Modifier.size(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = job.reference,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = stringResource(assignmentLabel(job)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            SignalInfoRow(
                glyph = SignalGlyph.Location,
                text = stringResource(R.string.jurisdiction_value, job.jurisdiction.value),
            )
            SignalInfoRow(
                glyph = SignalGlyph.Note,
                text = stringResource(R.string.status_value, displayStatus(job.workflowStatus)),
            )
            SignalInfoRow(
                glyph = SignalGlyph.Pack,
                text = stringResource(R.string.job_pack_value, job.jobPackVersion),
            )
            SignalInfoRow(
                glyph = SignalGlyph.Person,
                text = stringResource(
                    R.string.assignment_value,
                    stringResource(assignmentLabel(job)),
                ),
            )
            val plannedDate = job.plannedDate
            if (plannedDate != null) {
                SignalInfoRow(
                    glyph = SignalGlyph.Calendar,
                    text = stringResource(R.string.planned_date_value, plannedDate),
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            SignalPrimaryButton(
                text = stringResource(
                    if (job.workflowStatus == "released" && job.assignment == null) {
                        R.string.claim_and_open_job_pack
                    } else {
                        R.string.open_job_pack
                    },
                ),
                glyph = SignalGlyph.ArrowForward,
                onClick = { onOpenJob(job) },
            )
        }
    }
}
