package au.com.heightsafety.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import au.com.heightsafety.app.icons.HeightSafetyIcons
import au.com.heightsafety.app.theme.LocalHeightSafetySemanticColors
import au.com.heightsafety.domain.InspectorJob
import java.time.LocalDate

/**
 * Jobs home (DESIGN.md §6.1). Pull-to-refresh, Today cards with optional
 * local progress, compact assigned/claim rows, a global sync chip and the
 * connection banner. All content is derived from the field state; nothing
 * about compliance or intervals is inferred.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun JobsHomeContent(
    state: FieldUiState,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
    onOpenJob: (InspectorJob) -> Unit,
) {
    val account = stateJobsAccount(state) ?: return

    Column(modifier = Modifier.fillMaxSize()) {
        JobsHomeHeader(
            subtitle = account.companyId,
            chip = jobsHomeSyncChip(state),
            onRefresh = onRefresh,
            onSignOut = onSignOut,
        )
        when (state) {
            is FieldUiState.LoadingJobs -> JobsHomeSkeleton(
                modifier = Modifier.weight(1f),
            )
            is FieldUiState.JobsLoaded -> JobsHomeBody(
                state = state,
                onOpenJob = onOpenJob,
                onRefresh = onRefresh,
                modifier = Modifier.weight(1f),
            )
            is FieldUiState.EmptyJobs -> JobsHomeEmpty(modifier = Modifier.weight(1f))
            is FieldUiState.Error -> JobsHomeError(
                message = state.message,
                canRetry = state.canRetry,
                onRetry = onRetry,
                modifier = Modifier.weight(1f),
            )
            is FieldUiState.OpeningJobPack -> JobsHomeOpeningPack(
                modifier = Modifier.weight(1f),
            )
            is FieldUiState.JobPackError -> JobsHomeError(
                message = state.message,
                canRetry = state.canRetry,
                onRetry = onRetry,
                modifier = Modifier.weight(1f),
            )
            else -> Box(modifier = Modifier.weight(1f))
        }
        if (jobsHomeShowsConnectionNotice(state)) {
            JobsConnectionBanner()
        }
    }
}

internal fun stateJobsAccount(state: FieldUiState): AccountSummary? = when (state) {
    is FieldUiState.LoadingJobs -> state.account
    is FieldUiState.JobsLoaded -> state.account
    is FieldUiState.EmptyJobs -> state.account
    is FieldUiState.Error -> state.account
    is FieldUiState.OpeningJobPack -> state.account
    is FieldUiState.JobPackError -> state.account
    else -> null
}

internal enum class JobsHomeSyncChip { ALL_SYNCED, SYNCING, FAILED }

internal fun jobsHomeSyncChip(state: FieldUiState): JobsHomeSyncChip = when (state) {
    is FieldUiState.LoadingJobs, is FieldUiState.OpeningJobPack -> JobsHomeSyncChip.SYNCING
    is FieldUiState.Error, is FieldUiState.JobPackError -> JobsHomeSyncChip.FAILED
    is FieldUiState.JobsLoaded ->
        if (state.syncState == SyncState.FAILED) {
            JobsHomeSyncChip.FAILED
        } else {
            JobsHomeSyncChip.ALL_SYNCED
        }
    is FieldUiState.EmptyJobs ->
        if (state.syncState == SyncState.FAILED) {
            JobsHomeSyncChip.FAILED
        } else {
            JobsHomeSyncChip.ALL_SYNCED
        }
    else -> JobsHomeSyncChip.ALL_SYNCED
}

/**
 * The connection banner appears whenever the last job sync did not complete
 * (offline or another retryable failure). Counts of queued changes arrive
 * with the Sync tab (T6); until then the banner stays count-free.
 */
internal fun jobsHomeShowsConnectionNotice(state: FieldUiState): Boolean = when (state) {
    is FieldUiState.Error, is FieldUiState.JobPackError -> true
    is FieldUiState.JobsLoaded -> state.syncState == SyncState.FAILED
    is FieldUiState.EmptyJobs -> state.syncState == SyncState.FAILED
    else -> false
}

@Composable
private fun JobsHomeHeader(
    subtitle: String,
    chip: JobsHomeSyncChip,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(R.string.jobs_title),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        JobsSyncChip(chip)
        Box {
            IconButton(onClick = { menuOpen = true }) {
                Icon(
                    imageVector = Icons.Filled.MoreVert,
                    contentDescription = stringResource(R.string.jobs_menu_description),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.refresh_jobs)) },
                    onClick = {
                        menuOpen = false
                        onRefresh()
                    },
                )
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.sign_out)) },
                    onClick = {
                        menuOpen = false
                        onSignOut()
                    },
                )
            }
        }
    }
}

private data class JobsSyncChipStyle(
    val tint: Color,
    val container: Color,
    val icon: ImageVector,
)

@Composable
private fun JobsSyncChip(chip: JobsHomeSyncChip) {
    val semanticColors = LocalHeightSafetySemanticColors.current
    val style = when (chip) {
        JobsHomeSyncChip.FAILED -> JobsSyncChipStyle(
            tint = MaterialTheme.colorScheme.error,
            container = MaterialTheme.colorScheme.errorContainer,
            icon = HeightSafetyIcons.NotSyncedFree,
        )
        JobsHomeSyncChip.SYNCING -> JobsSyncChipStyle(
            tint = MaterialTheme.colorScheme.secondary,
            container = MaterialTheme.colorScheme.secondaryContainer,
            icon = HeightSafetyIcons.SendingFree,
        )
        JobsHomeSyncChip.ALL_SYNCED -> JobsSyncChipStyle(
            tint = semanticColors.success,
            container = semanticColors.successContainer,
            icon = HeightSafetyIcons.SyncedFree,
        )
    }
    val label = when (chip) {
        JobsHomeSyncChip.FAILED -> stringResource(R.string.sync_chip_failed)
        JobsHomeSyncChip.SYNCING -> stringResource(R.string.sync_chip_syncing)
        JobsHomeSyncChip.ALL_SYNCED -> stringResource(R.string.sync_chip_all_synced)
    }
    Surface(shape = CircleShape, color = style.container) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = style.icon,
                contentDescription = null,
                tint = style.tint,
                modifier = Modifier.size(16.dp),
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                color = style.tint,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JobsHomeBody(
    state: FieldUiState.JobsLoaded,
    onOpenJob: (InspectorJob) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val sections = splitJobsForHome(
        jobs = state.jobs,
        todayIsoDate = LocalDate.now().toString(),
    )
    PullToRefreshBox(
        isRefreshing = state.syncState == SyncState.SYNCHRONISING,
        onRefresh = onRefresh,
        modifier = modifier
            .fillMaxSize()
            .testTag("jobs_home_refresh"),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (sections.today.isNotEmpty()) {
                item(key = "header-today") {
                    SectionHeader(stringResource(R.string.section_today))
                }
                items(sections.today, key = { "today-${it.jobId}" }) { job ->
                    TodayJobCard(
                        job = job,
                        progress = state.progress[job.jobId],
                        onOpenJob = onOpenJob,
                    )
                }
            }
            if (sections.assigned.isNotEmpty()) {
                item(key = "header-assigned") {
                    SectionHeader(stringResource(R.string.section_assigned))
                }
                items(sections.assigned, key = { "assigned-${it.jobId}" }) { job ->
                    AssignedJobRow(
                        job = job,
                        onOpenJob = onOpenJob,
                    )
                }
            }
            if (sections.availableToClaim.isNotEmpty()) {
                item(key = "header-available") {
                    SectionHeader(stringResource(R.string.section_available_to_claim))
                }
                items(sections.availableToClaim, key = { "claim-${it.jobId}" }) { job ->
                    AssignedJobRow(
                        job = job,
                        onOpenJob = onOpenJob,
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
    )
}

/** Non-interactive metadata chip (jurisdiction, pack version, planned date). */
@Composable
private fun MetadataChip(text: String) {
    Surface(
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
        )
    }
}

@Composable
private fun TodayJobCard(
    job: InspectorJob,
    progress: JobHomeProgress?,
    onOpenJob: (InspectorJob) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                HeightSafetyTileIcon(
                    icon = HeightSafetyIcons.SitesTile,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                )
                Spacer(modifier = Modifier.width(12.dp))
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
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetadataChip(text = job.jurisdiction.value)
                MetadataChip(text = stringResource(R.string.chip_pack_version, job.jobPackVersion))
            }
            progress?.let { progressValue ->
                Spacer(modifier = Modifier.height(12.dp))
                LinearProgressIndicator(
                    progress = {
                        if (progressValue.expectedAnchors <= 0) {
                            0f
                        } else {
                            progressValue.accountedAnchors.toFloat() /
                                progressValue.expectedAnchors.toFloat()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = stringResource(
                        R.string.progress_accounted_value,
                        progressValue.accountedAnchors,
                        progressValue.expectedAnchors,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { onOpenJob(job) },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp),
                shape = MaterialTheme.shapes.small,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) {
                Text(text = stringResource(todayActionLabel(job)), textAlign = TextAlign.Center)
            }
        }
    }
}

@androidx.annotation.StringRes
internal fun todayActionLabel(job: InspectorJob): Int = if (job.isAvailableToClaim()) {
    R.string.action_claim
} else {
    R.string.action_continue
}


@Composable
private fun AssignedJobRow(
    job: InspectorJob,
    onOpenJob: (InspectorJob) -> Unit,
) {
    val semanticColors = LocalHeightSafetySemanticColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .clickable { onOpenJob(job) }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        HeightSafetyTileIcon(
            icon = HeightSafetyIcons.SitesTile,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = job.reference,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(assignmentLabel(job)),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        jobStatusChipLabel(job.workflowStatus)?.let { labelRes ->
            val style = when (job.workflowStatus) {
                "changes_requested" -> JobsStatusChipStyle(
                    tint = semanticColors.warning,
                    container = semanticColors.warningContainer,
                    icon = HeightSafetyIcons.ChangesRequestedFree,
                )
                "approved_for_report_generation", "report_generated" -> JobsStatusChipStyle(
                    tint = semanticColors.success,
                    container = semanticColors.successContainer,
                    icon = HeightSafetyIcons.SyncedFree,
                )
                else -> JobsStatusChipStyle(
                    tint = semanticColors.discovery,
                    container = semanticColors.discoveryContainer,
                    icon = HeightSafetyIcons.UnderReviewFree,
                )
            }
            Surface(shape = CircleShape, color = style.container) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = style.icon,
                        contentDescription = null,
                        tint = style.tint,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = stringResource(labelRes),
                        color = style.tint,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(24.dp),
        )
    }
}

private data class JobsStatusChipStyle(
    val tint: Color,
    val container: Color,
    val icon: ImageVector,
)

/** Loading skeletons stand in for the job list while jobs load. */
@Composable
private fun JobsHomeSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.syncing_jobs))
        }
        Spacer(modifier = Modifier.height(8.dp))
        repeat(3) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 84.dp),
            ) {}
        }
    }
}

@Composable
private fun JobsHomeEmpty(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        HeightSafetyTileIcon(
            icon = HeightSafetyIcons.JobsTile,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.home_empty_title),
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.home_empty_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun JobsHomeOpeningPack(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        CircularProgressIndicator()
        Spacer(modifier = Modifier.height(12.dp))
        Text(stringResource(R.string.downloading_job_pack))
    }
}

@Composable
private fun JobsHomeError(
    message: String,
    canRetry: Boolean,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Text(
            text = stringResource(R.string.sync_chip_failed),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.error,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            color = MaterialTheme.colorScheme.error,
        )
        if (canRetry) {
            Spacer(modifier = Modifier.height(16.dp))
            TextButton(onClick = onRetry, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(stringResource(R.string.retry))
            }
        }
    }
}

/**
 * Yellow banner naming that saved changes stay protected until a connection
 * returns. Shown when the last job sync did not complete.
 */
@Composable
private fun JobsConnectionBanner() {
    val semanticColors = LocalHeightSafetySemanticColors.current
    Surface(
        color = semanticColors.warningContainer,
        contentColor = semanticColors.onWarningContainer,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = HeightSafetyIcons.OfflineFree,
                contentDescription = null,
                tint = semanticColors.warning,
                modifier = Modifier.size(24.dp),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = stringResource(R.string.offline_banner_title),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = stringResource(R.string.offline_banner_body),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
