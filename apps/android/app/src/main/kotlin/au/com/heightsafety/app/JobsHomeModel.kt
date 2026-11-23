package au.com.heightsafety.app

import androidx.annotation.StringRes
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.RecordedOutcome

/**
 * Screen model for the Jobs home and the job anchor checklist
 * (DESIGN.md §6.1). Pure, JVM-testable derivations: everything shown on
 * these screens comes from the opened pack, the locally saved evidence and
 * the job list state. Nothing is inferred about compliance or intervals.
 */

/** Per-job progress for the Jobs home cards. Progress is only shown when
 *  durable local pack and evidence state can supply it; unknown stays blank
 *  rather than being invented. */
data class JobHomeProgress(
    val expectedAnchors: Int,
    val accountedAnchors: Int,
)

internal data class JobChecklistSummary(
    val expectedAnchors: Int,
    val accountedAnchors: Int,
    val serviceableCount: Int = 0,
    val defectiveCount: Int = 0,
    val notInspectedCount: Int = 0,
    val furtherAssessmentCount: Int = 0,
) {
    val remainingAnchors: Int
        get() = expectedAnchors - accountedAnchors
}

/**
 * An anchor is accounted for once a recorded outcome exists for it.
 * Drafts without an outcome stay in Remaining.
 */
internal fun jobChecklistSummary(
    pack: FieldJobPack,
    evidence: List<AnchorInspectionDraft>,
): JobChecklistSummary {
    val outcomeByAnchor = buildMap {
        evidence.forEach { draft ->
            val anchorId = draft.expectedAnchorId ?: return@forEach
            val outcome = draft.recordedOutcome ?: return@forEach
            putIfAbsent(anchorId, outcome)
        }
    }
    var accounted = 0
    var serviceable = 0
    var defective = 0
    var notInspected = 0
    var furtherAssessment = 0
    pack.anchors.forEach { anchor ->
        when (outcomeByAnchor[anchor.anchorId]) {
            RecordedOutcome.SERVICEABLE -> {
                accounted++
                serviceable++
            }
            RecordedOutcome.DEFECTIVE -> {
                accounted++
                defective++
            }
            RecordedOutcome.NOT_INSPECTED -> {
                accounted++
                notInspected++
            }
            RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> {
                accounted++
                furtherAssessment++
            }
            null -> Unit
        }
    }
    return JobChecklistSummary(
        expectedAnchors = pack.anchors.size,
        accountedAnchors = accounted,
        serviceableCount = serviceable,
        defectiveCount = defective,
        notInspectedCount = notInspected,
        furtherAssessmentCount = furtherAssessment,
    )
}

internal enum class ChecklistFilter {
    REMAINING,
    DONE,
    EXCEPTIONS,
}

internal data class ChecklistRow(
    val anchor: JobPackAnchor,
    val draft: AnchorInspectionDraft?,
) {
    val outcome: RecordedOutcome?
        get() = draft?.recordedOutcome

    val isAccounted: Boolean
        get() = outcome != null

    val isException: Boolean
        get() = outcome == RecordedOutcome.NOT_INSPECTED

    val photoCount: Int
        get() = draft?.photos?.size ?: 0
}

internal fun checklistRows(
    pack: FieldJobPack,
    evidence: List<AnchorInspectionDraft>,
): List<ChecklistRow> = pack.anchors.map { anchor ->
    ChecklistRow(
        anchor = anchor,
        draft = evidence.firstOrNull { it.expectedAnchorId == anchor.anchorId },
    )
}

internal fun filterChecklistRows(
    rows: List<ChecklistRow>,
    filter: ChecklistFilter,
): List<ChecklistRow> = when (filter) {
    ChecklistFilter.REMAINING -> rows.filter { !it.isAccounted }
    ChecklistFilter.DONE -> rows.filter { it.isAccounted }
    ChecklistFilter.EXCEPTIONS -> rows.filter { it.isException }
}

internal data class JobsHomeSections(
    val today: List<InspectorJob>,
    val assigned: List<InspectorJob>,
    val availableToClaim: List<InspectorJob>,
)

/**
 * Splits the visible jobs into the Today, Assigned and Available-to-claim
 * sections. todayIsoDate is the caller-supplied ISO yyyy-MM-dd string so the
 * split stays testable; offline-restored jobs keep their pack workflow
 * status and are shown as assigned.
 */
internal fun splitJobsForHome(
    jobs: List<InspectorJob>,
    todayIsoDate: String,
): JobsHomeSections {
    val today = jobs.filter { it.plannedDate == todayIsoDate }
    val remaining = jobs.filter { it.plannedDate != todayIsoDate }
    val availableToClaim = remaining.filter { it.isAvailableToClaim() }
    return JobsHomeSections(
        today = today,
        assigned = remaining.filterNot { it.isAvailableToClaim() },
        availableToClaim = availableToClaim,
    )
}

internal fun InspectorJob.isAvailableToClaim(): Boolean =
    workflowStatus == "released" && assignment == null

@StringRes
internal fun jobStatusChipLabel(workflowStatus: String): Int? = when (workflowStatus) {
    "submitted", "under_review" -> R.string.job_status_under_review
    "changes_requested" -> R.string.job_status_changes_requested
    "approved_for_report_generation" -> R.string.job_status_approved_for_report
    "report_generated" -> R.string.job_status_report_generated
    else -> null
}

@StringRes
internal fun exceptionReasonLabel(reason: InspectionExceptionReason): Int = when (reason) {
    InspectionExceptionReason.INACCESSIBLE -> R.string.exception_inaccessible
    InspectionExceptionReason.UNABLE_TO_LOCATE -> R.string.exception_unable_to_locate
}
