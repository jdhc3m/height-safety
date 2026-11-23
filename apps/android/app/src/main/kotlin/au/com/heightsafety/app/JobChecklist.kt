package au.com.heightsafety.app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import au.com.heightsafety.app.icons.HeightSafetyIcons
import au.com.heightsafety.app.theme.DesignTokens
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.RecordedOutcome

/**
 * Job anchor checklist (DESIGN.md §6.1). App bar with site name and job
 * subtitle, a progress card with outcome counters, filter chips, 64 dp rows
 * with outcome tiles, a row overflow for not-inspected and reconciliation
 * shortcuts, the "Found an anchor not listed" action and a sticky submit
 * gate. Capture stays the T5 ticket; row taps open it unchanged.
 */
@Composable
internal fun JobChecklistContent(
    state: FieldUiState.JobPackOpened,
    onClose: () -> Unit,
    onOpenAnchor: (JobPackAnchor) -> Unit,
    onOpenEvidence: (AnchorInspectionDraft) -> Unit,
    onMarkAnchorNotInspected: (JobPackAnchor) -> Unit,
    onProposeAnchorReplacement: (JobPackAnchor) -> Unit,
    onProposeAnchorDuplicate: (JobPackAnchor) -> Unit,
    onAddDiscoveredAnchor: () -> Unit,
    onOpenSubmissionReview: () -> Unit,
) {
    val pack = state.opened.stored.pack
    var filter by remember { mutableStateOf(ChecklistFilter.REMAINING) }

    // System back closes the pack through the state machine so the shell
    // back stack and the state stay aligned.
    BackHandler { onClose() }

    val summary = jobChecklistSummary(pack, state.evidence)
    val rows = checklistRows(pack, state.evidence)
    val visibleRows = filterChecklistRows(rows, filter)
    val discoveredEvidence = state.evidence.filter {
        it.expectedAnchorId == null &&
            it.reconciliationProposal == ReconciliationProposal.NEWLY_DISCOVERED
    }

    Column(modifier = Modifier.fillMaxSize()) {
        ChecklistTopBar(
            title = pack.siteName,
            subtitle = stringResource(
                R.string.checklist_subtitle,
                pack.reference,
                pack.jurisdiction.value,
                pack.jobPackVersion,
            ),
            onClose = onClose,
        )
        ChecklistProgressCard(state = state, summary = summary)
        ChecklistFilterChips(
            filter = filter,
            remaining = summary.remainingAnchors,
            done = summary.accountedAnchors,
            exceptions = summary.notInspectedCount,
            onSelect = { filter = it },
        )
        Box(modifier = Modifier.weight(1f)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    top = 4.dp,
                    bottom = 96.dp,
                ),
            ) {
                if (pack.anchors.isEmpty()) {
                    item(key = "empty-anchors") {
                        Text(
                            text = stringResource(R.string.no_expected_anchors),
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
                items(visibleRows, key = { it.anchor.anchorId }) { row ->
                    ChecklistRowItem(
                        row = row,
                        onClick = { onOpenAnchor(row.anchor) },
                        onMarkNotInspected = { onMarkAnchorNotInspected(row.anchor) },
                        onProposeReplacement = { onProposeAnchorReplacement(row.anchor) },
                        onProposeDuplicate = { onProposeAnchorDuplicate(row.anchor) },
                    )
                }
                if (discoveredEvidence.isNotEmpty()) {
                    item(key = "header-discovered") {
                        Text(
                            text = stringResource(R.string.discovered_anchor_records),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }
                    items(
                        items = discoveredEvidence,
                        key = { "discovered-${it.inspectionId}" },
                    ) { evidence ->
                        DiscoveredRowItem(
                            evidence = evidence,
                            onClick = { onOpenEvidence(evidence) },
                        )
                    }
                }
            }
            ExtendedFloatingActionButton(
                onClick = onAddDiscoveredAnchor,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp),
            ) {
                HeightSafetyTileIcon(
                    icon = HeightSafetyIcons.FoundAnchorTile,
                    contentDescription = null,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.fab_found_anchor))
            }
        }
        SubmitGate(
            expected = summary.expectedAnchors,
            remaining = summary.remainingAnchors,
            submissionQueued = state.submissionIntent != null,
            onOpenSubmissionReview = onOpenSubmissionReview,
        )
    }
}

@Composable
private fun ChecklistTopBar(
    title: String,
    subtitle: String,
    onClose: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onClose) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = stringResource(R.string.back_description),
                tint = MaterialTheme.colorScheme.onSurface,
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun ChecklistProgressCard(
    state: FieldUiState.JobPackOpened,
    summary: JobChecklistSummary,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(
                    R.string.checklist_progress_title,
                    summary.accountedAnchors,
                    summary.expectedAnchors,
                ),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = {
                    if (summary.expectedAnchors <= 0) {
                        0f
                    } else {
                        summary.accountedAnchors.toFloat() /
                            summary.expectedAnchors.toFloat()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                OutcomeCounter(
                    count = summary.serviceableCount,
                    icon = HeightSafetyIcons.ServiceableTile,
                    contentDescription = stringResource(R.string.outcome_serviceable),
                )
                OutcomeCounter(
                    count = summary.defectiveCount,
                    icon = HeightSafetyIcons.DefectiveTile,
                    contentDescription = stringResource(R.string.outcome_defective),
                )
                OutcomeCounter(
                    count = summary.notInspectedCount,
                    icon = HeightSafetyIcons.NotInspectedTile,
                    contentDescription = stringResource(R.string.outcome_not_inspected),
                )
                OutcomeCounter(
                    count = summary.furtherAssessmentCount,
                    icon = HeightSafetyIcons.FurtherAssessmentTile,
                    contentDescription = stringResource(R.string.outcome_further_assessment),
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = stringResource(
                        when (state.opened.source) {
                            JobPackOpenSource.DOWNLOADED -> R.string.chip_pack_downloaded
                            JobPackOpenSource.CACHED -> R.string.job_pack_available_offline
                        },
                    ),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = stringResource(
                        R.string.offline_lease_expiry,
                        displayLeaseExpiry(state.opened.stored.lease.expiresAtEpochMillis),
                    ),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun OutcomeCounter(
    count: Int,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
) {
    if (count == 0) {
        return
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        HeightSafetyTileIcon(
            icon = icon,
            contentDescription = contentDescription,
            modifier = Modifier.size(20.dp),
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun ChecklistFilterChips(
    filter: ChecklistFilter,
    remaining: Int,
    done: Int,
    exceptions: Int,
    onSelect: (ChecklistFilter) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterChip(
            selected = filter == ChecklistFilter.REMAINING,
            onClick = { onSelect(ChecklistFilter.REMAINING) },
            label = { Text(stringResource(R.string.chip_filter_remaining, remaining)) },
            leadingIcon = if (filter == ChecklistFilter.REMAINING) {
                { FilterCheckIcon() }
            } else {
                null
            },
        )
        FilterChip(
            selected = filter == ChecklistFilter.DONE,
            onClick = { onSelect(ChecklistFilter.DONE) },
            label = { Text(stringResource(R.string.chip_filter_done, done)) },
            leadingIcon = if (filter == ChecklistFilter.DONE) {
                { FilterCheckIcon() }
            } else {
                null
            },
        )
        FilterChip(
            selected = filter == ChecklistFilter.EXCEPTIONS,
            onClick = { onSelect(ChecklistFilter.EXCEPTIONS) },
            label = { Text(stringResource(R.string.chip_filter_exceptions, exceptions)) },
            leadingIcon = if (filter == ChecklistFilter.EXCEPTIONS) {
                { FilterCheckIcon() }
            } else {
                null
            },
        )
    }
}

@Composable
private fun FilterCheckIcon() {
    Icon(
        imageVector = Icons.Filled.Check,
        contentDescription = null,
        modifier = Modifier.size(FilterChipDefaults.IconSize),
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ChecklistRowItem(
    row: ChecklistRow,
    onClick: () -> Unit,
    onMarkNotInspected: () -> Unit,
    onProposeReplacement: () -> Unit,
    onProposeDuplicate: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    Box {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp)
                .combinedClickable(
                    onClick = onClick,
                    onLongClick = { menuOpen = true },
                )
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RowOutcomeTile(row = row)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = row.anchor.label ?: row.anchor.registerId ?: row.anchor.anchorId,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                row.anchor.location?.let { location ->
                    Text(
                        text = location,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = rowSecondaryText(row),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp),
            )
        }
        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.menu_mark_not_inspected)) },
                onClick = {
                    menuOpen = false
                    onMarkNotInspected()
                },
            )
            DropdownMenuItem(
                text = { Text(stringResource(R.string.menu_propose_replacement)) },
                onClick = {
                    menuOpen = false
                    onProposeReplacement()
                },
            )
            DropdownMenuItem(
                text = { Text(stringResource(R.string.menu_propose_duplicate)) },
                onClick = {
                    menuOpen = false
                    onProposeDuplicate()
                },
            )
        }
    }
}

/** Outcome tile icon when a result is recorded, empty ring when remaining. */
@Composable
private fun RowOutcomeTile(row: ChecklistRow) {
    when (row.outcome) {
        RecordedOutcome.SERVICEABLE -> TileIcon(
            icon = HeightSafetyIcons.ServiceableTile,
            description = stringResource(R.string.outcome_serviceable),
        )
        RecordedOutcome.DEFECTIVE -> TileIcon(
            icon = HeightSafetyIcons.DefectiveTile,
            description = stringResource(R.string.outcome_defective),
        )
        RecordedOutcome.NOT_INSPECTED -> TileIcon(
            icon = HeightSafetyIcons.NotInspectedTile,
            description = stringResource(R.string.outcome_not_inspected),
        )
        RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> TileIcon(
            icon = HeightSafetyIcons.FurtherAssessmentTile,
            description = stringResource(R.string.outcome_further_assessment),
        )
        null -> Box(
            modifier = Modifier
                .size(24.dp)
                .border(
                    width = 2.dp,
                    color = MaterialTheme.colorScheme.outlineVariant,
                    shape = CircleShape,
                ),
        )
    }
}

@Composable
private fun TileIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
) {
    HeightSafetyTileIcon(
        icon = icon,
        contentDescription = description,
        modifier = Modifier.size(24.dp),
    )
}

@Composable
private fun rowSecondaryText(row: ChecklistRow): String {
    val parts = mutableListOf<String>()
    row.outcome?.let { outcome ->
        parts += stringResource(outcomeLabel(outcome))
        if (outcome == RecordedOutcome.NOT_INSPECTED) {
            row.draft?.exceptionReason?.let { reason ->
                parts += stringResource(exceptionReasonLabel(reason))
            }
        }
    }
    if (row.photoCount > 0) {
        parts += pluralStringResource(
            R.plurals.photo_count,
            row.photoCount,
            row.photoCount,
        )
    }
    if (parts.isEmpty()) {
        return stringResource(R.string.checklist_not_recorded)
    }
    return parts.joinToString(separator = " · ")
}

@Composable
private fun DiscoveredRowItem(
    evidence: AnchorInspectionDraft,
    onClick: () -> Unit,
) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp)
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = HeightSafetyIcons.FoundAnchorTile,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = evidence.provisionalAnchorId ?: evidence.inspectionId,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(R.string.newly_discovered_record),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(24.dp),
        )
    }
}

/**
 * Sticky bottom bar: the Submit gate appears once every expected anchor has a
 * recorded outcome; before that it names what is still remaining. A queued
 * submission keeps the review reachable.
 */
@Composable
private fun SubmitGate(
    expected: Int,
    remaining: Int,
    submissionQueued: Boolean,
    onOpenSubmissionReview: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 3.dp,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = DesignTokens.Touch.bottomBar)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            when {
                expected == 0 -> Text(
                    text = stringResource(R.string.no_expected_anchors),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                submissionQueued -> GateButton(
                    label = stringResource(R.string.submit_gate_view_submission),
                    onClick = onOpenSubmissionReview,
                )
                remaining == 0 -> GateButton(
                    label = stringResource(R.string.submit_gate_submit),
                    onClick = onOpenSubmissionReview,
                )
                else -> Text(
                    text = stringResource(R.string.submit_gate_remaining, remaining),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun GateButton(
    label: String,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = DesignTokens.Touch.fieldControl),
        shape = MaterialTheme.shapes.small,
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
    ) {
        Text(text = label, textAlign = TextAlign.Center)
    }
}
