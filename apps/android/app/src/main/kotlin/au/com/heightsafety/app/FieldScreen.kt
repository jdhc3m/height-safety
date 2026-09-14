package au.com.heightsafety.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.CircleShape
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.RecordedDisposition
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.RecordedProofTest
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.PhotoUploadQueueState
import au.com.heightsafety.domain.SubmissionReviewIssue
import au.com.heightsafety.domain.SubmissionSynchronization
import au.com.heightsafety.domain.SubmissionSynchronizationBlocker
import au.com.heightsafety.domain.SyncMutationState
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
    onOpenEvidence: (AnchorInspectionDraft) -> Unit = {},
    onAddDiscoveredAnchor: () -> Unit = {},
    onCloseAnchor: () -> Unit = {},
    onUpdateAnchorDraft: (AnchorInspectionDraft) -> Unit = {},
    onSaveAnchorDraft: () -> Unit = {},
    onCapturePhoto: () -> Unit = {},
    onOpenSubmissionReview: () -> Unit = {},
    onCloseSubmissionReview: () -> Unit = {},
    onQueueSubmission: () -> Unit = {},
    onStartAdministratorRecovery: () -> Unit = {},
) {
    SignalFieldTheme {
        Scaffold(containerColor = MaterialTheme.colorScheme.background) { innerPadding ->
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
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
                        is FieldUiState.RestoringSession -> SignInContent(
                            message = null,
                            isSigningIn = true,
                            isRestoring = true,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.SessionExpired -> SignInContent(
                            message = state.message,
                            isSigningIn = false,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.AppLocked -> AppLockedContent(
                            state = state,
                            onUnlock = onRetry,
                        )
                        is FieldUiState.AccountRevoked -> AccountRevokedContent(
                            state = state,
                            onStartRecovery = onStartAdministratorRecovery,
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
                            onOpenEvidence = onOpenEvidence,
                            onAddDiscoveredAnchor = onAddDiscoveredAnchor,
                            onOpenSubmissionReview = onOpenSubmissionReview,
                        )
                        is FieldUiState.OpeningSubmissionReview -> SubmissionReviewLoadingContent()
                        is FieldUiState.SubmissionReview -> SubmissionReviewContent(
                            state = state,
                            onClose = onCloseSubmissionReview,
                            onQueue = onQueueSubmission,
                        )
                        is FieldUiState.AnchorCapture -> AnchorCaptureContent(
                            state = state,
                            onClose = onCloseAnchor,
                            onUpdateDraft = onUpdateAnchorDraft,
                            onSave = onSaveAnchorDraft,
                            onCapturePhoto = onCapturePhoto,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SignalCard(
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface,
    elevation: Dp = 2.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation),
        border = BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.42f),
        ),
        content = content,
    )
}

@Composable
private fun SignalStandaloneIcon(
    glyph: SignalGlyph,
    contentDescription: String?,
    tint: Color? = null,
    size: Dp = 36.dp,
    modifier: Modifier = Modifier,
) {
    SignalGlyphIcon(
        glyph = glyph,
        tint = tint,
        contentDescription = contentDescription,
        modifier = modifier.size(size),
    )
}

@Composable
private fun SignalShadedPanel(
    glyph: SignalGlyph,
    title: String,
    containerColor: Color,
    iconTint: Color? = null,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier,
        shape = MaterialTheme.shapes.small,
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SignalStandaloneIcon(
                    glyph = glyph,
                    contentDescription = null,
                    tint = iconTint,
                    size = 28.dp,
                )
                Spacer(modifier = Modifier.size(10.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
private fun SignalStatusChip(
    text: String,
    glyph: SignalGlyph,
    tint: Color = MaterialTheme.colorScheme.primary,
    container: Color = MaterialTheme.colorScheme.primaryContainer,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.heightIn(min = 32.dp),
        shape = CircleShape,
        color = container,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SignalGlyphIcon(
                glyph = glyph,
                tint = tint,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.size(6.dp))
            Text(
                text = text,
                color = tint,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun SignalBackButton(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    TextButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.heightIn(min = 48.dp),
        contentPadding = PaddingValues(horizontal = 0.dp),
    ) {
        SignalGlyphIcon(
            glyph = SignalGlyph.ArrowBack,
            tint = MaterialTheme.colorScheme.primary,
            contentDescription = null,
            modifier = Modifier.size(22.dp),
        )
        Spacer(modifier = Modifier.size(6.dp))
        Text(label)
    }
}

@Composable
private fun SignalHeader(
    title: String,
    subtitle: String? = null,
    glyph: SignalGlyph,
    action: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .padding(end = 8.dp),
            verticalAlignment = Alignment.Top,
        ) {
            SignalStandaloneIcon(
                glyph = glyph,
                contentDescription = null,
                size = 40.dp,
            )
            Spacer(modifier = Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        action?.invoke()
    }
}

@Composable
private fun SignalInfoRow(
    glyph: SignalGlyph,
    text: String,
    tint: Color? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.Top,
    ) {
        SignalGlyphIcon(
            glyph = glyph,
            tint = tint,
            contentDescription = null,
            modifier = Modifier
                .padding(top = 1.dp)
                .size(20.dp),
        )
        Spacer(modifier = Modifier.size(8.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = tint ?: MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SignalPrimaryButton(
    text: String,
    glyph: SignalGlyph,
    onClick: () -> Unit,
    modifier: Modifier = Modifier.fillMaxWidth(),
    enabled: Boolean = true,
    showProgress: Boolean = false,
) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = 48.dp),
        enabled = enabled,
        shape = MaterialTheme.shapes.small,
        colors = androidx.compose.material3.ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
    ) {
        if (showProgress) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        } else {
            SignalGlyphIcon(
                glyph = glyph,
                tint = MaterialTheme.colorScheme.onPrimary,
                contentDescription = null,
                modifier = Modifier.size(22.dp),
            )
        }
        Spacer(modifier = Modifier.size(8.dp))
        Text(text = text, textAlign = TextAlign.Center)
    }
}

@Composable
private fun SignalTonalButton(
    text: String,
    glyph: SignalGlyph,
    onClick: () -> Unit,
    modifier: Modifier = Modifier.fillMaxWidth(),
    enabled: Boolean = true,
) {
    FilledTonalButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 48.dp),
        enabled = enabled,
        shape = MaterialTheme.shapes.small,
        colors = androidx.compose.material3.ButtonDefaults.filledTonalButtonColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
        ),
    ) {
        SignalGlyphIcon(
            glyph = glyph,
            tint = MaterialTheme.colorScheme.onSecondaryContainer,
            contentDescription = null,
            modifier = Modifier.size(22.dp),
        )
        Spacer(modifier = Modifier.size(8.dp))
        Text(text = text, textAlign = TextAlign.Center)
    }
}

@Composable
private fun SignInContent(
    message: String?,
    isSigningIn: Boolean,
    isRestoring: Boolean = false,
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
        SignalStandaloneIcon(
            glyph = SignalGlyph.Industry,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            size = 52.dp,
        )
        Spacer(modifier = Modifier.height(16.dp))
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
        SignalPrimaryButton(
            text = if (isSigningIn) {
                stringResource(
                    if (isRestoring) {
                        R.string.restoring_session
                    } else {
                        R.string.signing_in
                    },
                )
            } else {
                stringResource(R.string.sign_in)
            },
            glyph = SignalGlyph.ArrowForward,
            onClick = { onSignIn(companyId) },
            enabled = !isSigningIn,
            showProgress = isSigningIn,
        )
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
private fun AppLockedContent(
    state: FieldUiState.AppLocked,
    onUnlock: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SignalStandaloneIcon(
            glyph = SignalGlyph.Lock,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.tertiary,
            size = 48.dp,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.app_locked_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = state.message,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.app_locked_evidence_note),
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(16.dp))
        SignalPrimaryButton(
            text = stringResource(R.string.unlock_device),
            glyph = SignalGlyph.Lock,
            onClick = onUnlock,
        )
    }
}

@Composable
private fun AccountRevokedContent(
    state: FieldUiState.AccountRevoked,
    onStartRecovery: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SignalStandaloneIcon(
            glyph = SignalGlyph.Person,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.error,
            size = 48.dp,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.account_access_unavailable_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = state.account.email,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(R.string.company_value, state.account.companyId),
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = state.message,
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.error,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.recovery_evidence_note),
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        state.recoveryMessage?.let { message ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        SignalPrimaryButton(
            text = stringResource(
                if (state.isRecovering) {
                    R.string.authorising_recovery
                } else {
                    R.string.start_administrator_recovery
                },
            ),
            glyph = SignalGlyph.Person,
            onClick = onStartRecovery,
            enabled = !state.isRecovering,
            showProgress = state.isRecovering,
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
private fun SubmissionQueueSummary(
    isQueued: Boolean,
    onOpenReview: () -> Unit,
) {
    SignalCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(
                    if (isQueued) {
                        R.string.submission_queued_locally
                    } else {
                        R.string.submission_review_title
                    },
                ),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(
                    if (isQueued) {
                        R.string.submission_server_not_confirmed
                    } else {
                        R.string.submission_review_detail
                    },
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(12.dp))
            SignalPrimaryButton(
                text = stringResource(
                    if (isQueued) {
                        R.string.view_queued_submission
                    } else {
                        R.string.review_before_submission
                    },
                ),
                glyph = if (isQueued) SignalGlyph.Queue else SignalGlyph.Note,
                onClick = onOpenReview,
            )
        }
    }
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
                        text = displayAssignment(job),
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
                text = stringResource(R.string.assignment_value, displayAssignment(job)),
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

@Composable
private fun JobPackContent(
    state: FieldUiState.JobPackOpened,
    onClose: () -> Unit,
    onOpenAnchor: (JobPackAnchor) -> Unit,
    onOpenEvidence: (AnchorInspectionDraft) -> Unit,
    onAddDiscoveredAnchor: () -> Unit,
    onOpenSubmissionReview: () -> Unit,
) {
    val pack = state.opened.stored.pack
    val discoveredEvidence = state.evidence.filter {
        it.expectedAnchorId == null &&
            it.reconciliationProposal == ReconciliationProposal.NEWLY_DISCOVERED
    }
    Column(modifier = Modifier.fillMaxSize()) {
        SignalBackButton(
            label = stringResource(R.string.back_to_jobs),
            onClick = onClose,
        )
        SignalHeader(
            title = stringResource(R.string.job_pack_title),
            subtitle = pack.reference,
            glyph = SignalGlyph.Pack,
        )
        Spacer(modifier = Modifier.height(12.dp))
        SignalCard(
            modifier = Modifier.fillMaxWidth(),
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            elevation = 1.dp,
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                SignalInfoRow(
                    glyph = SignalGlyph.Industry,
                    text = stringResource(R.string.site_value, pack.siteName),
                )
                pack.siteAddress?.let {
                    SignalInfoRow(
                        glyph = SignalGlyph.Location,
                        text = stringResource(R.string.address_value, it),
                    )
                }
                SignalInfoRow(
                    glyph = SignalGlyph.Location,
                    text = stringResource(
                        R.string.jurisdiction_value,
                        pack.jurisdiction.value,
                    ),
                )
                SignalInfoRow(
                    glyph = SignalGlyph.Pack,
                    text = stringResource(R.string.job_pack_value, pack.jobPackVersion),
                )
                Spacer(modifier = Modifier.height(8.dp))
                SignalStatusChip(
                    text = when (state.opened.source) {
                        JobPackOpenSource.DOWNLOADED -> {
                            stringResource(R.string.job_pack_downloaded)
                        }
                        JobPackOpenSource.CACHED -> {
                            stringResource(R.string.job_pack_available_offline)
                        }
                    },
                    glyph = SignalGlyph.CloudCheck,
                    tint = MaterialTheme.colorScheme.secondary,
                    container = MaterialTheme.colorScheme.secondaryContainer,
                )
                Spacer(modifier = Modifier.height(6.dp))
                SignalInfoRow(
                    glyph = SignalGlyph.Lock,
                    text = stringResource(
                        R.string.offline_lease_expiry,
                        displayLeaseExpiry(state.opened.stored.lease.expiresAtEpochMillis),
                    ),
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        SubmissionQueueSummary(
            isQueued = state.submissionIntent != null,
            onOpenReview = onOpenSubmissionReview,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            stringResource(R.string.expected_anchor_count, pack.anchors.size),
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(modifier = Modifier.height(8.dp))
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (pack.anchors.isEmpty()) {
                item { Text(stringResource(R.string.no_expected_anchors)) }
            } else {
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

            if (discoveredEvidence.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.discovered_anchor_records),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                items(
                    items = discoveredEvidence,
                    key = { evidence -> "discovered-${evidence.inspectionId}" },
                ) { evidence ->
                    DiscoveredAnchorRow(
                        evidence = evidence,
                        onOpenEvidence = onOpenEvidence,
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                SignalTonalButton(
                    text = stringResource(R.string.record_discovered_anchor),
                    glyph = SignalGlyph.AddLocation,
                    onClick = onAddDiscoveredAnchor,
                    enabled = state.submissionIntent == null,
                )
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
    SignalCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                SignalStandaloneIcon(
                    glyph = SignalGlyph.RoofAnchor,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    size = 38.dp,
                )
                Spacer(modifier = Modifier.size(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = anchor.label ?: anchor.registerId ?: anchor.anchorId,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            anchor.location?.let {
                SignalInfoRow(
                    glyph = SignalGlyph.Location,
                    text = stringResource(R.string.location_value, it),
                )
            }
            SignalInfoRow(
                glyph = SignalGlyph.Note,
                text = stringResource(R.string.status_value, displayStatus(anchor.registerStatus)),
            )
            SignalInfoRow(
                glyph = SignalGlyph.CloudCheck,
                text = stringResource(
                    if (evidence == null) {
                        R.string.anchor_evidence_not_started
                    } else {
                        R.string.anchor_evidence_saved
                    },
                ),
            )
            Spacer(modifier = Modifier.height(12.dp))
            SignalPrimaryButton(
                text = stringResource(
                    if (evidence?.submissionId != null) {
                        R.string.view_submitted_evidence
                    } else {
                        R.string.capture_anchor_evidence
                    },
                ),
                glyph = if (evidence?.submissionId != null) {
                    SignalGlyph.Visibility
                } else {
                    SignalGlyph.Camera
                },
                onClick = { onOpenAnchor(anchor) },
            )
        }
    }
}

@Composable
private fun DiscoveredAnchorRow(
    evidence: AnchorInspectionDraft,
    onOpenEvidence: (AnchorInspectionDraft) -> Unit,
) {
    SignalCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                SignalStandaloneIcon(
                    glyph = SignalGlyph.AddLocation,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.secondary,
                    size = 38.dp,
                )
                Spacer(modifier = Modifier.size(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = evidence.provisionalAnchorId ?: evidence.inspectionId,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = stringResource(R.string.newly_discovered_record),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            evidence.location?.let {
                SignalInfoRow(
                    glyph = SignalGlyph.Location,
                    text = stringResource(R.string.location_value, it),
                )
            }
            SignalInfoRow(
                glyph = SignalGlyph.CloudCheck,
                text = stringResource(R.string.anchor_evidence_saved),
            )
            Spacer(modifier = Modifier.height(12.dp))
            SignalPrimaryButton(
                text = stringResource(
                    if (evidence.submissionId != null) {
                        R.string.view_submitted_evidence
                    } else {
                        R.string.capture_anchor_evidence
                    },
                ),
                glyph = if (evidence.submissionId != null) {
                    SignalGlyph.Visibility
                } else {
                    SignalGlyph.Camera
                },
                onClick = { onOpenEvidence(evidence) },
            )
        }
    }
}

@Composable
private fun SubmissionReviewLoadingContent() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
        Spacer(modifier = Modifier.height(12.dp))
        Text(stringResource(R.string.preparing_submission_review))
    }
}

@Composable
private fun SubmissionReviewContent(
    state: FieldUiState.SubmissionReview,
    onClose: () -> Unit,
    onQueue: () -> Unit,
) {
    val pack = state.opened.stored.pack
    val review = state.review
    val submissionIntent = review.intent
    val synchronization = submissionIntent?.let { intent ->
        SubmissionSynchronization(
            mutationState = intent.syncState.toSyncMutationState(),
            photoStates = review.evidence
                .flatMap { evidence -> evidence.photos }
                .map { photo -> photo.uploadState.toQueueState() },
        )
    }
    val discoveredEvidence = review.evidence.filter { it.expectedAnchorId == null }
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 720.dp),
        ) {
            SignalBackButton(
                label = stringResource(R.string.back_to_job_pack),
                onClick = onClose,
                enabled = !state.isQueueing,
            )
            SignalHeader(
                title = stringResource(R.string.submission_review_title),
                subtitle = pack.reference,
                glyph = SignalGlyph.Note,
            )
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    SignalInfoRow(
                        glyph = SignalGlyph.Industry,
                        text = stringResource(R.string.site_value, pack.siteName),
                    )
                    SignalInfoRow(
                        glyph = SignalGlyph.Location,
                        text = stringResource(R.string.jurisdiction_value, pack.jurisdiction.value),
                    )
                    SignalInfoRow(
                        glyph = SignalGlyph.Pack,
                        text = stringResource(R.string.job_pack_value, pack.jobPackVersion),
                    )
                }
                item {
                    SignalCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = stringResource(
                                    if (submissionIntent == null) {
                                        if (review.readiness.isReadyForQueue) {
                                            R.string.submission_ready_to_queue
                                        } else {
                                            R.string.submission_blocked
                                        }
                                    } else {
                                        R.string.submission_queued_locally
                                    },
                                ),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            if (submissionIntent == null) {
                                Text(
                                    stringResource(
                                        R.string.submission_counts,
                                        review.readiness.blockers.size,
                                        review.readiness.warnings.size,
                                    ),
                                )
                            } else {
                                Text(stringResource(R.string.submission_server_not_confirmed))
                                Text(
                                    stringResource(
                                        R.string.submission_mutation_state,
                                        displayStatus(submissionIntent.syncState.value),
                                    ),
                                )
                                if (synchronization?.isReadyForReview == true) {
                                    Text(stringResource(R.string.submission_sync_ready))
                                } else {
                                    Text(
                                        stringResource(R.string.submission_sync_blocked),
                                        color = MaterialTheme.colorScheme.error,
                                    )
                                    synchronization?.blockers?.forEach { blocker ->
                                        Text(
                                            stringResource(blocker.label()),
                                            color = MaterialTheme.colorScheme.error,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                if (review.readiness.blockers.isNotEmpty()) {
                    item {
                        SubmissionIssueCard(
                            title = stringResource(R.string.submission_blockers),
                            issues = review.readiness.blockers,
                            isBlocker = true,
                        )
                    }
                }
                if (review.readiness.warnings.isNotEmpty()) {
                    item {
                        SubmissionIssueCard(
                            title = stringResource(R.string.submission_warnings),
                            issues = review.readiness.warnings,
                            isBlocker = false,
                        )
                    }
                }
                item {
                    Text(
                        text = stringResource(R.string.submission_coverage),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                items(pack.anchors, key = JobPackAnchor::anchorId) { anchor ->
                    val evidence = review.evidence.firstOrNull {
                        it.expectedAnchorId == anchor.anchorId
                    }
                    SignalCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.Top) {
                                SignalStandaloneIcon(
                                    glyph = SignalGlyph.RoofAnchor,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    size = 38.dp,
                                )
                                Spacer(modifier = Modifier.size(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = anchor.label ?: anchor.registerId ?: anchor.anchorId,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        stringResource(
                                            if (evidence == null) {
                                                R.string.submission_coverage_missing
                                            } else {
                                                R.string.submission_coverage_recorded
                                            },
                                        ),
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            evidence?.recordedOutcome?.let { outcome ->
                                SignalInfoRow(
                                    glyph = SignalGlyph.Note,
                                    text = stringResource(R.string.submission_outcome, outcomeLabel(outcome)),
                                )
                            }
                        }
                    }
                }
                if (discoveredEvidence.isNotEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.discovered_anchor_records),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    items(
                        discoveredEvidence,
                        key = { evidence -> "submission-discovered-${evidence.inspectionId}" },
                    ) { evidence ->
                        SignalCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.Top) {
                                    SignalStandaloneIcon(
                                        glyph = SignalGlyph.AddLocation,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.secondary,
                                        size = 38.dp,
                                    )
                                    Spacer(modifier = Modifier.size(10.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = evidence.provisionalAnchorId ?: evidence.inspectionId,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        Text(stringResource(R.string.newly_discovered_record))
                                    }
                                }
                                evidence.recordedOutcome?.let { outcome ->
                                    SignalInfoRow(
                                        glyph = SignalGlyph.Note,
                                        text = stringResource(R.string.submission_outcome, outcomeLabel(outcome)),
                                    )
                                }
                            }
                        }
                    }
                }
                item {
                    Text(
                        text = stringResource(R.string.submission_photo_state_note),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    state.queueError?.let { error ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(error, color = MaterialTheme.colorScheme.error)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    SignalPrimaryButton(
                        text = stringResource(
                            if (state.isQueueing) {
                                R.string.queueing_submission
                            } else if (submissionIntent == null) {
                                R.string.queue_submission_locally
                            } else {
                                R.string.submission_already_queued
                            },
                        ),
                        glyph = SignalGlyph.CloudUpload,
                        onClick = onQueue,
                        enabled = submissionIntent == null &&
                            review.readiness.isReadyForQueue &&
                            !state.isQueueing,
                        showProgress = state.isQueueing,
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun SubmissionIssueCard(
    title: String,
    issues: List<SubmissionReviewIssue>,
    isBlocker: Boolean,
) {
    SignalCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (isBlocker) {
                    MaterialTheme.colorScheme.error
                } else {
                    SignalSemanticColors.warning
                },
            )
            issues.forEach { issue ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "• ${issue.anchorReference?.let { "$it: " }.orEmpty()}${issue.message}",
                    color = if (isBlocker) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    },
                )
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
    onCapturePhoto: () -> Unit,
) {
    val draft = state.draft
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        SignalBackButton(
            label = stringResource(R.string.back_to_job_pack),
            onClick = onClose,
        )
        SignalHeader(
            title = stringResource(R.string.anchor_capture_title),
            subtitle = state.job.reference,
            glyph = SignalGlyph.RoofAnchor,
        )
        Spacer(modifier = Modifier.height(8.dp))
        SignalInfoRow(
            glyph = SignalGlyph.Industry,
            text = stringResource(R.string.site_value, state.opened.stored.pack.siteName),
        )
        SignalInfoRow(
            glyph = SignalGlyph.Location,
            text = stringResource(
                R.string.jurisdiction_value,
                state.opened.stored.pack.jurisdiction.value,
            ),
        )
        Spacer(modifier = Modifier.height(12.dp))
        SignalCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    SignalStandaloneIcon(
                        glyph = SignalGlyph.RoofAnchor,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        size = 40.dp,
                    )
                    Spacer(modifier = Modifier.size(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = draft.expectedAnchorId ?: draft.provisionalAnchorId.orEmpty(),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = stringResource(R.string.anchor_evidence_scope),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                (if (draft.reconciliationProposal == null) {
                    state.anchor?.location
                } else {
                    draft.location
                })?.let {
                    SignalInfoRow(
                        glyph = SignalGlyph.Location,
                        text = stringResource(R.string.location_value, it),
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.anchor_record_label),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        val expectedAnchor = state.anchor
        if (expectedAnchor == null) {
            Text(
                text = stringResource(R.string.newly_discovered_record),
                color = MaterialTheme.colorScheme.primary,
            )
        } else {
            ReconciliationChoices(
                expectedSelected = draft.reconciliationProposal == null &&
                    draft.expectedAnchorId == expectedAnchor.anchorId,
                selected = draft.reconciliationProposal,
                onSelected = { proposal ->
                    onUpdateDraft(
                        when (proposal) {
                            null -> draft.copy(
                                expectedAnchorId = expectedAnchor.anchorId,
                                provisionalAnchorId = null,
                                reconciliationProposal = null,
                                reconciliationReferenceId = null,
                                location = expectedAnchor.location,
                            )
                            ReconciliationProposal.NEWLY_DISCOVERED -> draft.copy(
                                expectedAnchorId = null,
                                reconciliationProposal = proposal,
                                reconciliationReferenceId = null,
                                location = null,
                            )
                            ReconciliationProposal.REPLACEMENT -> draft.copy(
                                expectedAnchorId = expectedAnchor.anchorId,
                                reconciliationProposal = proposal,
                                reconciliationReferenceId = null,
                                location = null,
                            )
                            ReconciliationProposal.DUPLICATE -> draft.copy(
                                expectedAnchorId = expectedAnchor.anchorId,
                                provisionalAnchorId = null,
                                reconciliationProposal = proposal,
                                location = expectedAnchor.location,
                            )
                        },
                    )
                },
            )
        }
        when (draft.reconciliationProposal) {
            ReconciliationProposal.NEWLY_DISCOVERED,
            ReconciliationProposal.REPLACEMENT,
            -> {
                EvidenceTextField(
                    label = stringResource(R.string.provisional_anchor_id_label),
                    value = draft.provisionalAnchorId,
                    onValueChange = {
                        onUpdateDraft(draft.copy(provisionalAnchorId = it))
                    },
                    minLines = 1,
                )
                Spacer(modifier = Modifier.height(8.dp))
                EvidenceTextField(
                    label = stringResource(R.string.location_context_label),
                    value = draft.location,
                    onValueChange = { onUpdateDraft(draft.copy(location = it)) },
                    minLines = 2,
                )
            }
            ReconciliationProposal.DUPLICATE -> {
                EvidenceTextField(
                    label = stringResource(R.string.reconciliation_reference_label),
                    value = draft.reconciliationReferenceId,
                    onValueChange = {
                        onUpdateDraft(draft.copy(reconciliationReferenceId = it))
                    },
                    minLines = 1,
                )
            }
            null -> Unit
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
        Text(
            text = stringResource(R.string.disposition_label),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        ConfirmationRow(
            label = stringResource(R.string.removed_from_service),
            checked = draft.disposition == RecordedDisposition.REMOVED_FROM_SERVICE,
            onCheckedChange = {
                onUpdateDraft(
                    draft.copy(
                        disposition = if (it) {
                            RecordedDisposition.REMOVED_FROM_SERVICE
                        } else {
                            null
                        },
                    ),
                )
            },
        )
        Spacer(modifier = Modifier.height(8.dp))
        EvidenceTextField(
            label = stringResource(
                if (
                    draft.recordedOutcome == RecordedOutcome.NOT_INSPECTED &&
                    draft.exceptionReason == InspectionExceptionReason.UNABLE_TO_LOCATE
                ) {
                    R.string.search_context_label
                } else {
                    R.string.observations_label
                },
            ),
            value = draft.observations,
            onValueChange = { onUpdateDraft(draft.copy(observations = it)) },
            minLines = 3,
        )
        Spacer(modifier = Modifier.height(12.dp))
        if (draft.recordedOutcome == RecordedOutcome.DEFECTIVE) {
            SignalShadedPanel(
                glyph = SignalGlyph.Warning,
                title = stringResource(R.string.defect_description_label),
                containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.62f),
                iconTint = MaterialTheme.colorScheme.error,
                modifier = Modifier.fillMaxWidth(),
            ) {
                EvidenceTextField(
                    label = stringResource(R.string.defect_description_prompt),
                    value = draft.defectDescription,
                    onValueChange = { onUpdateDraft(draft.copy(defectDescription = it)) },
                    minLines = 2,
                )
            }
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
        ProofTestFields(
            proofTest = draft.proofTest,
            onChanged = { onUpdateDraft(draft.copy(proofTest = it)) },
        )
        Spacer(modifier = Modifier.height(16.dp))
        SignalCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SignalStandaloneIcon(
                        glyph = SignalGlyph.Camera,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.secondary,
                        size = 34.dp,
                    )
                    Spacer(modifier = Modifier.size(10.dp))
                    Text(
                        text = stringResource(R.string.photos_label),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                if (draft.photos.isEmpty()) {
                    SignalShadedPanel(
                        glyph = SignalGlyph.Camera,
                        title = stringResource(R.string.no_photos_attached),
                        containerColor = SignalSemanticColors.successContainer,
                        iconTint = SignalSemanticColors.success,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = stringResource(R.string.photos_association_note),
                            style = MaterialTheme.typography.bodySmall,
                            color = SignalSemanticColors.onSuccessContainer,
                        )
                    }
                } else {
                    SignalShadedPanel(
                        glyph = SignalGlyph.CloudCheck,
                        title = stringResource(R.string.photos_attached, draft.photos.size),
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        iconTint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = stringResource(
                                R.string.photos_upload_state,
                                draft.photos.count {
                                    it.uploadState == PhotoUploadState.PENDING_UPLOAD
                                },
                                draft.photos.count {
                                    it.uploadState == PhotoUploadState.UPLOADED
                                },
                                draft.photos.count {
                                    it.uploadState == PhotoUploadState.FAILED
                                },
                            ),
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = stringResource(R.string.photos_association_note),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                SignalTonalButton(
                    text = stringResource(R.string.capture_photo),
                    glyph = SignalGlyph.Camera,
                    onClick = onCapturePhoto,
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
        SignalPrimaryButton(
            text = stringResource(R.string.save_evidence_locally),
            glyph = SignalGlyph.DeviceSave,
            onClick = onSave,
            enabled = state.saveState != EvidenceSaveState.SAVING,
        )
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun ReconciliationChoices(
    expectedSelected: Boolean,
    selected: ReconciliationProposal?,
    onSelected: (ReconciliationProposal?) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        ChoiceButton(
            selected = expectedSelected,
            label = R.string.expected_anchor_record,
            glyph = SignalGlyph.RoofAnchor,
            onClick = { onSelected(null) },
        )
        ChoiceButton(
            selected = selected == ReconciliationProposal.NEWLY_DISCOVERED,
            label = R.string.newly_discovered_record,
            glyph = SignalGlyph.AddLocation,
            onClick = { onSelected(ReconciliationProposal.NEWLY_DISCOVERED) },
        )
        ChoiceButton(
            selected = selected == ReconciliationProposal.REPLACEMENT,
            label = R.string.replacement_record,
            glyph = SignalGlyph.Replace,
            onClick = { onSelected(ReconciliationProposal.REPLACEMENT) },
        )
        ChoiceButton(
            selected = selected == ReconciliationProposal.DUPLICATE,
            label = R.string.duplicate_record,
            glyph = SignalGlyph.Duplicate,
            onClick = { onSelected(ReconciliationProposal.DUPLICATE) },
        )
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
            val glyph = when (outcome) {
                RecordedOutcome.SERVICEABLE -> SignalGlyph.Check
                RecordedOutcome.DEFECTIVE -> SignalGlyph.Warning
                RecordedOutcome.NOT_INSPECTED -> SignalGlyph.Lock
                RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> SignalGlyph.Note
            }
            val colors = when (outcome) {
                RecordedOutcome.SERVICEABLE -> ChoiceColors(
                    accent = SignalSemanticColors.success,
                    selectedContainer = SignalSemanticColors.successContainer,
                    selectedContent = SignalSemanticColors.onSuccessContainer,
                )
                RecordedOutcome.DEFECTIVE -> ChoiceColors(
                    accent = SignalSemanticColors.danger,
                    selectedContainer = SignalSemanticColors.dangerContainer,
                    selectedContent = SignalSemanticColors.onDangerContainer,
                )
                RecordedOutcome.NOT_INSPECTED -> ChoiceColors(
                    accent = SignalSemanticColors.warning,
                    selectedContainer = SignalSemanticColors.warningContainer,
                    selectedContent = SignalSemanticColors.onWarningContainer,
                )
                RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> ChoiceColors(
                    accent = SignalSemanticColors.discovery,
                    selectedContainer = SignalSemanticColors.discoveryContainer,
                    selectedContent = SignalSemanticColors.onDiscoveryContainer,
                )
            }
            ChoiceButton(
                selected = selected == outcome,
                label = label,
                glyph = glyph,
                accent = colors.accent,
                selectedContainer = colors.selectedContainer,
                selectedContent = colors.selectedContent,
                unselectedIcon = colors.accent,
                onClick = { onSelected(outcome) },
            )
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
            ChoiceButton(
                selected = selected == reason,
                label = label,
                glyph = if (reason == InspectionExceptionReason.INACCESSIBLE) {
                    SignalGlyph.Lock
                } else {
                    SignalGlyph.Search
                },
                onClick = { onSelected(reason) },
            )
        }
    }
}

private data class ChoiceColors(
    val accent: Color,
    val selectedContainer: Color,
    val selectedContent: Color,
)

@Composable
private fun ChoiceButton(
    selected: Boolean,
    @androidx.annotation.StringRes label: Int,
    glyph: SignalGlyph,
    onClick: () -> Unit,
    accent: Color = MaterialTheme.colorScheme.primary,
    selectedContainer: Color = MaterialTheme.colorScheme.primaryContainer,
    selectedContent: Color = MaterialTheme.colorScheme.onPrimaryContainer,
    unselectedIcon: Color = MaterialTheme.colorScheme.secondary,
) {
    if (selected) {
        Button(
            onClick = onClick,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp),
            shape = MaterialTheme.shapes.small,
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                containerColor = selectedContainer,
                contentColor = selectedContent,
            ),
            border = BorderStroke(1.dp, accent),
        ) {
            SignalGlyphIcon(
                glyph = glyph,
                tint = selectedContent,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
            )
            Spacer(modifier = Modifier.size(8.dp))
            Text(stringResource(label))
            Spacer(modifier = Modifier.size(8.dp))
            SignalGlyphIcon(
                glyph = SignalGlyph.Check,
                tint = selectedContent,
                contentDescription = null,
                modifier = Modifier.size(22.dp),
            )
        }
    } else {
        OutlinedButton(
            onClick = onClick,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp),
            shape = MaterialTheme.shapes.small,
            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.onSurface,
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            SignalGlyphIcon(
                glyph = glyph,
                tint = unselectedIcon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
            )
            Spacer(modifier = Modifier.size(8.dp))
            Text(stringResource(label))
        }
    }
}

@Composable
private fun ProofTestFields(
    proofTest: RecordedProofTest?,
    onChanged: (RecordedProofTest?) -> Unit,
) {
    val current = proofTest ?: RecordedProofTest()
    fun update(updated: RecordedProofTest) {
        onChanged(updated.takeIf { it.hasEnteredValue })
    }

    Text(
        text = stringResource(R.string.proof_test_label),
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
    )
    Spacer(modifier = Modifier.height(8.dp))
    EvidenceTextField(
        label = stringResource(R.string.proof_test_load_label),
        value = current.load,
        onValueChange = { update(current.copy(load = it)) },
        minLines = 1,
    )
    Spacer(modifier = Modifier.height(8.dp))
    EvidenceTextField(
        label = stringResource(R.string.proof_test_hold_label),
        value = current.hold,
        onValueChange = { update(current.copy(hold = it)) },
        minLines = 1,
    )
    Spacer(modifier = Modifier.height(8.dp))
    EvidenceTextField(
        label = stringResource(R.string.proof_test_result_label),
        value = current.result,
        onValueChange = { update(current.copy(result = it)) },
        minLines = 1,
    )
    Spacer(modifier = Modifier.height(8.dp))
    EvidenceTextField(
        label = stringResource(R.string.proof_test_equipment_label),
        value = current.equipmentReference,
        onValueChange = { update(current.copy(equipmentReference = it)) },
        minLines = 1,
    )
}

@Composable
private fun ConfirmationRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
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

private fun EvidenceSyncState.toSyncMutationState(): SyncMutationState = when (this) {
    EvidenceSyncState.LOCAL -> SyncMutationState.PENDING
    EvidenceSyncState.PENDING -> SyncMutationState.PENDING
    EvidenceSyncState.SYNCHRONISING -> SyncMutationState.SYNCHRONISING
    EvidenceSyncState.SYNCHRONISED -> SyncMutationState.SYNCHRONISED
    EvidenceSyncState.FAILED -> SyncMutationState.FAILED
    EvidenceSyncState.CONFLICT -> SyncMutationState.CONFLICT
}

private fun PhotoUploadState.toQueueState(): PhotoUploadQueueState = when (this) {
    PhotoUploadState.PENDING_UPLOAD -> PhotoUploadQueueState.PENDING
    PhotoUploadState.UPLOADED -> PhotoUploadQueueState.UPLOADED
    PhotoUploadState.FAILED -> PhotoUploadQueueState.FAILED
}

private fun SubmissionSynchronizationBlocker.label(): Int = when (this) {
    SubmissionSynchronizationBlocker.SERVER_ACKNOWLEDGEMENT_REQUIRED ->
        R.string.submission_sync_acknowledgement_required
    SubmissionSynchronizationBlocker.SERVER_CONFLICT -> R.string.submission_sync_conflict
    SubmissionSynchronizationBlocker.PHOTO_UPLOAD_PENDING -> R.string.submission_sync_photo_pending
    SubmissionSynchronizationBlocker.PHOTO_UPLOAD_FAILED -> R.string.submission_sync_photo_failed
}

private fun outcomeLabel(outcome: RecordedOutcome): String = when (outcome) {
    RecordedOutcome.SERVICEABLE -> "Serviceable"
    RecordedOutcome.DEFECTIVE -> "Defective"
    RecordedOutcome.NOT_INSPECTED -> "Not inspected"
    RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> "Further assessment required"
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
