package au.com.heightsafety.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.PhotoUploadQueueState
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.SubmissionSynchronization
import au.com.heightsafety.domain.SubmissionSynchronizationBlocker
import au.com.heightsafety.domain.SyncMutationState
import java.text.DateFormat
import java.util.Date

@Composable
internal fun SignalCard(
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
internal fun SignalStandaloneIcon(
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
internal fun SignalShadedPanel(
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
internal fun SignalStatusChip(
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
internal fun SignalBackButton(
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
internal fun SignalHeader(
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
internal fun SignalInfoRow(
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
internal fun SignalPrimaryButton(
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
internal fun SignalTonalButton(
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
internal fun ConfirmationRow(
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
internal fun EvidenceTextField(
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

internal data class ChoiceColors(
    val accent: Color,
    val selectedContainer: Color,
    val selectedContent: Color,
)

@Composable
internal fun ChoiceButton(
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

@androidx.annotation.StringRes
internal fun assignmentLabel(job: InspectorJob): Int {
    val assignment = job.assignment
    if (assignment == null) {
        return if (job.workflowStatus == "released") {
            R.string.assignment_available_to_claim
        } else {
            R.string.assignment_none_recorded
        }
    }
    return when (assignment.assignmentType) {
        "assigned" -> R.string.assignment_assigned
        "claimed" -> R.string.assignment_claimed
        else -> R.string.assignment_none_recorded
    }
}

@androidx.annotation.StringRes
internal fun roleLabel(role: ProductRole): Int = when (role) {
    ProductRole.ADMINISTRATOR -> R.string.role_label_administrator
    ProductRole.OFFICE_REVIEWER -> R.string.role_label_office_reviewer
    ProductRole.INSPECTOR -> R.string.role_label_inspector
}

@androidx.annotation.StringRes
internal fun outcomeLabel(outcome: RecordedOutcome): Int = when (outcome) {
    RecordedOutcome.SERVICEABLE -> R.string.outcome_serviceable
    RecordedOutcome.DEFECTIVE -> R.string.outcome_defective
    RecordedOutcome.NOT_INSPECTED -> R.string.outcome_not_inspected
    RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> R.string.outcome_further_assessment
}

internal fun displayStatus(status: String): String = status
    .split('_')
    .joinToString(" ") { word ->
        word.replaceFirstChar { character -> character.uppercase() }
    }

internal fun displayLeaseExpiry(epochMillis: Long): String =
    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
        .format(Date(epochMillis))

internal fun EvidenceSyncState.toSyncMutationState(): SyncMutationState = when (this) {
    EvidenceSyncState.LOCAL -> SyncMutationState.PENDING
    EvidenceSyncState.PENDING -> SyncMutationState.PENDING
    EvidenceSyncState.SYNCHRONISING -> SyncMutationState.SYNCHRONISING
    EvidenceSyncState.SYNCHRONISED -> SyncMutationState.SYNCHRONISED
    EvidenceSyncState.FAILED -> SyncMutationState.FAILED
    EvidenceSyncState.CONFLICT -> SyncMutationState.CONFLICT
}

internal fun PhotoUploadState.toQueueState(): PhotoUploadQueueState = when (this) {
    PhotoUploadState.PENDING_UPLOAD -> PhotoUploadQueueState.PENDING
    PhotoUploadState.UPLOADED -> PhotoUploadQueueState.UPLOADED
    PhotoUploadState.FAILED -> PhotoUploadQueueState.FAILED
}

@androidx.annotation.StringRes
internal fun SubmissionSynchronizationBlocker.label(): Int = when (this) {
    SubmissionSynchronizationBlocker.SERVER_ACKNOWLEDGEMENT_REQUIRED ->
        R.string.submission_sync_acknowledgement_required
    SubmissionSynchronizationBlocker.SERVER_CONFLICT -> R.string.submission_sync_conflict
    SubmissionSynchronizationBlocker.PHOTO_UPLOAD_PENDING -> R.string.submission_sync_photo_pending
    SubmissionSynchronizationBlocker.PHOTO_UPLOAD_FAILED -> R.string.submission_sync_photo_failed
}
