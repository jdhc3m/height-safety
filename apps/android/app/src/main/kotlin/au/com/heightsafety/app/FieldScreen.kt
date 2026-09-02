package au.com.heightsafety.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob

@Composable
fun FieldScreen(
    state: FieldUiState,
    onSignIn: (String) -> Unit,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
) {
    MaterialTheme {
        Scaffold { innerPadding ->
            Surface(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(horizontal = 24.dp, vertical = 16.dp),
                ) {
                    when (state) {
                        FieldUiState.SignedOut -> SignInContent(
                            message = null,
                            isSigningIn = false,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.SigningIn -> SignInContent(
                            message = null,
                            isSigningIn = true,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.SessionExpired -> SignInContent(
                            message = state.message,
                            isSigningIn = false,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.Error -> if (state.account == null) {
                            SignInContent(
                                message = state.message,
                                isSigningIn = false,
                                onSignIn = onSignIn,
                            )
                        } else {
                            JobsContent(
                                state = state,
                                onRetry = onRetry,
                                onRefresh = onRefresh,
                                onSignOut = onSignOut,
                            )
                        }
                        is FieldUiState.LoadingJobs,
                        is FieldUiState.JobsLoaded,
                        is FieldUiState.EmptyJobs,
                        -> JobsContent(
                            state = state,
                            onRetry = onRetry,
                            onRefresh = onRefresh,
                            onSignOut = onSignOut,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SignInContent(
    message: String?,
    isSigningIn: Boolean,
    onSignIn: (String) -> Unit,
) {
    var companyId by rememberSaveable { mutableStateOf("") }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.inspector_sign_in),
            style = MaterialTheme.typography.titleLarge,
        )
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedTextField(
            value = companyId,
            onValueChange = { companyId = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.company_id)) },
            singleLine = true,
            enabled = !isSigningIn,
        )
        if (message != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.error,
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { onSignIn(companyId) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isSigningIn,
        ) {
            if (isSigningIn) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                )
                Spacer(modifier = Modifier.size(8.dp))
            }
            Text(
                text = if (isSigningIn) {
                    stringResource(R.string.signing_in)
                } else {
                    stringResource(R.string.sign_in)
                },
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.provider_neutral_sign_in_note),
            modifier = Modifier.fillMaxWidth(),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun JobsContent(
    state: FieldUiState,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
) {
    val account = when (state) {
        is FieldUiState.LoadingJobs -> state.account
        is FieldUiState.JobsLoaded -> state.account
        is FieldUiState.EmptyJobs -> state.account
        is FieldUiState.Error -> state.account
        else -> return
    } ?: return

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.inspector_jobs),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = account.email,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = onSignOut) {
                Text(stringResource(R.string.sign_out))
            }
        }
        Text(
            text = stringResource(R.string.company_value, account.companyId),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(12.dp))

        when (state) {
            is FieldUiState.LoadingJobs -> SyncingContent()
            is FieldUiState.JobsLoaded -> {
                SyncStatusLabel(state.syncState)
                Spacer(modifier = Modifier.height(8.dp))
                JobList(
                    modifier = Modifier.weight(1f),
                    jobs = state.jobs,
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
                Button(onClick = onRefresh) {
                    Text(stringResource(R.string.refresh_jobs))
                }
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
                    Button(onClick = onRetry) {
                        Text(stringResource(R.string.retry))
                    }
                }
            }
            else -> Unit
        }
    }
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
private fun SyncStatusLabel(syncState: SyncState) {
    Text(
        text = when (syncState) {
            SyncState.SYNCHRONISING -> stringResource(R.string.syncing_jobs)
            SyncState.SYNCHRONISED -> stringResource(R.string.jobs_updated)
            SyncState.FAILED -> stringResource(R.string.sync_failed)
        },
        style = MaterialTheme.typography.labelLarge,
        color = if (syncState == SyncState.FAILED) {
            MaterialTheme.colorScheme.error
        } else {
            MaterialTheme.colorScheme.primary
        },
    )
}

@Composable
private fun JobList(
    modifier: Modifier = Modifier,
    jobs: List<InspectorJob>,
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(jobs, key = { it.jobId }) { job ->
            JobCard(job)
        }
    }
}

@Composable
private fun JobCard(job: InspectorJob) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = job.reference,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(stringResource(R.string.jurisdiction_value, job.jurisdiction.value))
            Text(stringResource(R.string.status_value, displayStatus(job.workflowStatus)))
            Text(stringResource(R.string.job_pack_value, job.jobPackVersion))
            Text(stringResource(R.string.assignment_value, displayAssignment(job)))
            val plannedDate = job.plannedDate
            if (plannedDate != null) {
                Text(stringResource(R.string.planned_date_value, plannedDate))
            }
        }
    }
}

private fun displayStatus(status: String): String = status
    .split('_')
    .joinToString(" ") { word ->
        word.replaceFirstChar { character -> character.uppercase() }
    }

private fun displayAssignment(job: InspectorJob): String {
    val assignment = job.assignment
    if (assignment == null) {
        return if (job.workflowStatus == "released") {
            "Available to claim"
        } else {
            "None recorded"
        }
    }
    return when (assignment.assignmentType) {
        "assigned" -> "Assigned"
        "claimed" -> "Claimed"
        else -> assignment.assignmentType
    }
}
