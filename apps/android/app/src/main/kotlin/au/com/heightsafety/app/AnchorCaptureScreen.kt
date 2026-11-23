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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.RecordedDisposition
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.RecordedProofTest
import au.com.heightsafety.domain.ReconciliationProposal

@Composable
internal fun AnchorCaptureContent(
    state: FieldUiState.AnchorCapture,
    onClose: () -> Unit,
    onUpdateDraft: (AnchorInspectionDraft) -> Unit,
    onSave: () -> Unit,
    onCapturePhoto: () -> Unit,
) {
    val draft = state.draft
    var discardRequested by remember { mutableStateOf(false) }
    val hasUnsavedEdits = captureHasUnsavedEdits(state)

    fun requestClose() {
        if (hasUnsavedEdits) {
            discardRequested = true
        } else {
            onClose()
        }
    }

    // System back must reach the same state machine close action as the
    // on-screen back button so the shell and the state stay aligned.
    BackHandler(enabled = true) { requestClose() }
    if (discardRequested) {
        AlertDialog(
            onDismissRequest = { discardRequested = false },
            title = { Text(stringResource(R.string.discard_changes_title)) },
            text = { Text(stringResource(R.string.discard_changes_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        discardRequested = false
                        onClose()
                    },
                ) {
                    Text(
                        stringResource(R.string.discard_changes_discard),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { discardRequested = false }) {
                    Text(stringResource(R.string.discard_changes_keep_editing))
                }
            },
        )
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        SignalBackButton(
            label = stringResource(R.string.back_to_job_pack),
            onClick = { requestClose() },
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
                label = outcomeLabel(outcome),
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
