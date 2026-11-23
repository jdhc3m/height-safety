package au.com.heightsafety.app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.SubmissionReviewIssue
import au.com.heightsafety.domain.SubmissionSynchronization

@Composable
internal fun SubmissionReviewContent(
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
    // System back returns to the job pack through the state machine; the
    // state machine ignores closes while a queue is running.
    BackHandler(enabled = !state.isQueueing) { onClose() }
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
                                    text = stringResource(
                                        R.string.submission_outcome,
                                        stringResource(outcomeLabel(outcome)),
                                    ),
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
                                            text = evidence.provisionalAnchorId
                                                ?: evidence.inspectionId,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        Text(stringResource(R.string.newly_discovered_record))
                                    }
                                }
                                evidence.recordedOutcome?.let { outcome ->
                                    SignalInfoRow(
                                        glyph = SignalGlyph.Note,
                                        text = stringResource(
                                            R.string.submission_outcome,
                                            stringResource(outcomeLabel(outcome)),
                                        ),
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
internal fun SubmissionReviewLoadingContent() {
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
