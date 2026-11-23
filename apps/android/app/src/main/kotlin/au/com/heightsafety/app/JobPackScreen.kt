package au.com.heightsafety.app

import androidx.activity.compose.BackHandler
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.ReconciliationProposal

@Composable
internal fun JobPackContent(
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
    // System back closes the pack through the state machine so the shell
    // back stack and the state stay aligned.
    BackHandler { onClose() }
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
internal fun SubmissionQueueSummary(
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
