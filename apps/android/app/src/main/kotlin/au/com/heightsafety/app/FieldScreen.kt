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
import androidx.compose.material3.Checkbox
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
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.RecordedOutcome
import java.text.DateFormat
import java.util.Date

@Composable
fun FieldScreen(
    state: FieldUiState,
    onSignIn: (String) -> Unit,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
    onOpenJob: (InspectorJob) -> Unit = {},
    onCloseJobPack: () -> Unit = {},
    onOpenAnchor: (JobPackAnchor) -> Unit = {},
    onCloseAnchor: () -> Unit = {},
    onUpdateAnchorDraft: (AnchorInspectionDraft) -> Unit = {},
    onSaveAnchorDraft: () -> Unit = {},
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
                                onOpenJob = onOpenJob,
                            )
                        }
                        is FieldUiState.LoadingJobs,
                        is FieldUiState.JobsLoaded,
                        is FieldUiState.EmptyJobs,
                        is FieldUiState.OpeningJobPack,
                        is FieldUiState.JobPackError,
                        -> JobsContent(
                            state = state,
                            onRetry = onRetry,
                            onRefresh = onRefresh,
                            onSignOut = onSignOut,
                            onOpenJob = onOpenJob,
                        )
                        is FieldUiState.JobPackOpened -> JobPackContent(
                            state = state,
                            onClose = onCloseJobPack,
                            onOpenAnchor = onOpenAnchor,
                        )
                        is FieldUiState.AnchorCapture -> AnchorCaptureContent(
                            state = state,
                            onClose = onCloseAnchor,
                            onUpdateDraft = onUpdateAnchorDraft,
                            onSave = onSaveAnchorDraft,
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
    onOpenJob: (InspectorJob) -> Unit,
) {
    val account = when (state) {
        is FieldUiState.LoadingJobs -> state.account
        is FieldUiState.JobsLoaded -> state.account
        is FieldUiState.EmptyJobs -> state.account
        is FieldUiState.Error -> state.account
        is FieldUiState.OpeningJobPack -> state.account
        is FieldUiState.JobPackError -> state.account
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
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { onOpenJob(job) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    stringResource(
                        if (job.workflowStatus == "released" && job.assignment == null) {
                            R.string.claim_and_open_job_pack
                        } else {
                            R.string.open_job_pack
                        },
                    ),
                )
            }
        }
    }
}

@Composable
private fun JobPackContent(
    state: FieldUiState.JobPackOpened,
    onClose: () -> Unit,
    onOpenAnchor: (JobPackAnchor) -> Unit,
) {
    val pack = state.opened.stored.pack
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onClose) {
                Text(stringResource(R.string.back_to_jobs))
            }
            Text(
                text = stringResource(R.string.job_pack_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = pack.reference,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(stringResource(R.string.jurisdiction_value, pack.jurisdiction.value))
        Text(stringResource(R.string.job_pack_value, pack.jobPackVersion))
        Text(stringResource(R.string.site_value, pack.siteName))
        pack.siteAddress?.let { Text(stringResource(R.string.address_value, it)) }
        Text(
            text = when (state.opened.source) {
                JobPackOpenSource.DOWNLOADED -> stringResource(R.string.job_pack_downloaded)
                JobPackOpenSource.CACHED -> stringResource(R.string.job_pack_available_offline)
            },
            color = MaterialTheme.colorScheme.primary,
            style = MaterialTheme.typography.labelLarge,
        )
        Text(
            stringResource(
                R.string.offline_lease_expiry,
                displayLeaseExpiry(state.opened.stored.lease.expiresAtEpochMillis),
            ),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            stringResource(R.string.expected_anchor_count, pack.anchors.size),
            style = MaterialTheme.typography.titleMedium,
        )
        if (pack.anchors.isEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(stringResource(R.string.no_expected_anchors))
        } else {
            Spacer(modifier = Modifier.height(8.dp))
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(pack.anchors, key = JobPackAnchor::anchorId) { anchor ->
                    JobPackAnchorRow(
                        anchor = anchor,
                        evidence = state.evidence.firstOrNull {
                            it.expectedAnchorId == anchor.anchorId
                        },
                        onOpenAnchor = onOpenAnchor,
                    )
                }
            }
        }
    }
}

@Composable
private fun JobPackAnchorRow(
    anchor: JobPackAnchor,
    evidence: AnchorInspectionDraft?,
    onOpenAnchor: (JobPackAnchor) -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = anchor.label ?: anchor.registerId ?: anchor.anchorId,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            anchor.location?.let {
                Text(stringResource(R.string.location_value, it))
            }
            Text(stringResource(R.string.status_value, displayStatus(anchor.registerStatus)))
            Text(
                stringResource(
                    if (evidence == null) {
                        R.string.anchor_evidence_not_started
                    } else {
                        R.string.anchor_evidence_saved
                    },
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { onOpenAnchor(anchor) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.capture_anchor_evidence))
            }
        }
    }
}

@Composable
private fun AnchorCaptureContent(
    state: FieldUiState.AnchorCapture,
    onClose: () -> Unit,
    onUpdateDraft: (AnchorInspectionDraft) -> Unit,
    onSave: () -> Unit,
) {
    val draft = state.draft
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onClose) {
                Text(stringResource(R.string.back_to_job_pack))
            }
            Text(
                text = stringResource(R.string.anchor_capture_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = state.job.reference,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Text(stringResource(R.string.site_value, state.opened.stored.pack.siteName))
        Text(
            stringResource(
                R.string.jurisdiction_value,
                state.opened.stored.pack.jurisdiction.value,
            ),
        )
        Spacer(modifier = Modifier.height(12.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = draft.expectedAnchorId ?: draft.provisionalAnchorId.orEmpty(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                state.anchor.location?.let {
                    Text(stringResource(R.string.location_value, it))
                }
                Text(stringResource(R.string.anchor_evidence_scope))
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.recorded_outcome_label),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutcomeChoices(
            selected = draft.recordedOutcome,
            onSelected = { outcome ->
                onUpdateDraft(
                    draft.copy(
                        recordedOutcome = outcome,
                        exceptionReason = if (outcome == RecordedOutcome.NOT_INSPECTED) {
                            draft.exceptionReason
                        } else {
                            null
                        },
                    ),
                )
            },
        )
        if (draft.recordedOutcome == RecordedOutcome.NOT_INSPECTED) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.exception_reason_label),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            ExceptionChoices(
                selected = draft.exceptionReason,
                onSelected = { reason -> onUpdateDraft(draft.copy(exceptionReason = reason)) },
            )
        } else {
            ConfirmationRow(
                label = stringResource(R.string.identity_confirmed),
                checked = draft.identityConfirmed,
                onCheckedChange = {
                    onUpdateDraft(draft.copy(identityConfirmed = it))
                },
            )
            ConfirmationRow(
                label = stringResource(R.string.location_confirmed),
                checked = draft.locationConfirmed,
                onCheckedChange = {
                    onUpdateDraft(draft.copy(locationConfirmed = it))
                },
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        EvidenceTextField(
            label = stringResource(R.string.observations_label),
            value = draft.observations,
            onValueChange = { onUpdateDraft(draft.copy(observations = it)) },
            minLines = 3,
        )
        Spacer(modifier = Modifier.height(12.dp))
        if (draft.recordedOutcome == RecordedOutcome.DEFECTIVE) {
            EvidenceTextField(
                label = stringResource(R.string.defect_description_label),
                value = draft.defectDescription,
                onValueChange = { onUpdateDraft(draft.copy(defectDescription = it)) },
                minLines = 2,
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        if (draft.recordedOutcome == RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED) {
            EvidenceTextField(
                label = stringResource(R.string.recommendation_label),
                value = draft.recommendation,
                onValueChange = { onUpdateDraft(draft.copy(recommendation = it)) },
                minLines = 2,
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        EvidenceTextField(
            label = stringResource(R.string.notes_label),
            value = draft.notes,
            onValueChange = { onUpdateDraft(draft.copy(notes = it)) },
            minLines = 2,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = stringResource(R.string.photos_label),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(stringResource(R.string.photos_attached, draft.photos.size))
                Text(
                    text = stringResource(R.string.photos_association_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (state.validationIssues.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = stringResource(R.string.capture_still_needs),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.error,
            )
            state.validationIssues.forEach { issue ->
                Text(
                    text = "• ${issue.message}",
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
        state.saveError?.let { error ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(error, color = MaterialTheme.colorScheme.error)
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = when (state.saveState) {
                EvidenceSaveState.SAVING -> stringResource(R.string.saving_locally)
                EvidenceSaveState.SAVED_LOCALLY -> stringResource(R.string.saved_locally)
                EvidenceSaveState.FAILED -> stringResource(R.string.local_save_failed)
                EvidenceSaveState.EDITING -> stringResource(R.string.local_draft_note)
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Button(
            onClick = onSave,
            modifier = Modifier.fillMaxWidth(),
            enabled = state.saveState != EvidenceSaveState.SAVING,
        ) {
            Text(stringResource(R.string.save_evidence_locally))
        }
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun OutcomeChoices(
    selected: RecordedOutcome?,
    onSelected: (RecordedOutcome) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RecordedOutcome.entries.forEach { outcome ->
            val label = when (outcome) {
                RecordedOutcome.SERVICEABLE -> R.string.outcome_serviceable
                RecordedOutcome.DEFECTIVE -> R.string.outcome_defective
                RecordedOutcome.NOT_INSPECTED -> R.string.outcome_not_inspected
                RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED ->
                    R.string.outcome_further_assessment
            }
            if (selected == outcome) {
                Button(
                    onClick = { onSelected(outcome) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(label))
                }
            } else {
                TextButton(
                    onClick = { onSelected(outcome) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(label))
                }
            }
        }
    }
}

@Composable
private fun ExceptionChoices(
    selected: InspectionExceptionReason?,
    onSelected: (InspectionExceptionReason) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(
            InspectionExceptionReason.INACCESSIBLE to R.string.exception_inaccessible,
            InspectionExceptionReason.UNABLE_TO_LOCATE to R.string.exception_unable_to_locate,
        ).forEach { (reason, label) ->
            if (selected == reason) {
                Button(
                    onClick = { onSelected(reason) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(label))
                }
            } else {
                TextButton(
                    onClick = { onSelected(reason) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(label))
                }
            }
        }
    }
}

@Composable
private fun ConfirmationRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
        Text(label)
    }
}

@Composable
private fun EvidenceTextField(
    label: String,
    value: String?,
    onValueChange: (String) -> Unit,
    minLines: Int,
) {
    OutlinedTextField(
        value = value.orEmpty(),
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        minLines = minLines,
    )
}

private fun displayLeaseExpiry(epochMillis: Long): String =
    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
        .format(Date(epochMillis))

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
