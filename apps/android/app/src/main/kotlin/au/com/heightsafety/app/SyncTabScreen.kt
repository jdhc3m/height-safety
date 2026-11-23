package au.com.heightsafety.app

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.InspectionSubmissionIntent

@Composable
internal fun SyncTabContent(
    state: FieldUiState,
) {
    val account = stateJobsAccount(state) ?: return
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        SignalHeader(
            title = stringResource(R.string.sync_tab_title),
            subtitle = account.email,
            glyph = SignalGlyph.CloudUpload,
        )
        Spacer(modifier = Modifier.height(16.dp))
        val counts = fieldSyncCounts(state)
        if (counts == null) {
            Text(
                text = stringResource(R.string.sync_tab_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            SignalCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    if (counts.total == 0) {
                        Text(
                            text = stringResource(R.string.sync_tab_all_synced),
                            style = MaterialTheme.typography.titleSmall,
                        )
                    } else {
                        if (counts.queuedRecords > 0) {
                            SignalInfoRow(
                                glyph = SignalGlyph.DeviceSave,
                                text = stringResource(
                                    R.string.sync_tab_queued_records,
                                    counts.queuedRecords,
                                ),
                            )
                        }
                        if (counts.pendingPhotos > 0) {
                            SignalInfoRow(
                                glyph = SignalGlyph.CloudUpload,
                                text = stringResource(
                                    R.string.sync_tab_photos_pending,
                                    counts.pendingPhotos,
                                ),
                            )
                        }
                        if (counts.failedPhotos > 0) {
                            SignalInfoRow(
                                glyph = SignalGlyph.Warning,
                                text = stringResource(
                                    R.string.sync_tab_photos_failed,
                                    counts.failedPhotos,
                                ),
                            )
                        }
                    }
                    stateSubmissionIntent(state)?.let {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(R.string.submission_server_not_confirmed),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

/** Queued submission intent carried by a state, when present. */
internal fun stateSubmissionIntent(state: FieldUiState): InspectionSubmissionIntent? = when (state) {
    is FieldUiState.JobPackOpened -> state.submissionIntent
    is FieldUiState.SubmissionReview -> state.review.intent
    else -> null
}
