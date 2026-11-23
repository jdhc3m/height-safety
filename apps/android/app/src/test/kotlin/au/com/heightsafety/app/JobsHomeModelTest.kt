package au.com.heightsafety.app

import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.SupportedJurisdiction
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JobsHomeModelTest {

    @Test
    fun checklistSummaryCountsRecordedOutcomesPerExpectedAnchor() {
        val pack = pack(
            "anchor-001",
            "anchor-002",
            "anchor-003",
            "anchor-004",
        )
        val summary = jobChecklistSummary(
            pack = pack,
            evidence = listOf(
                draft("inspection-001", "anchor-001", RecordedOutcome.SERVICEABLE),
                draft("inspection-002", "anchor-002", RecordedOutcome.DEFECTIVE),
                draft("inspection-003", "anchor-003", RecordedOutcome.NOT_INSPECTED),
                draft("inspection-004", "anchor-004", null),
            ),
        )

        assertEquals(4, summary.expectedAnchors)
        assertEquals(3, summary.accountedAnchors)
        assertEquals(1, summary.remainingAnchors)
        assertEquals(1, summary.serviceableCount)
        assertEquals(1, summary.defectiveCount)
        assertEquals(1, summary.notInspectedCount)
        assertEquals(0, summary.furtherAssessmentCount)
    }

    @Test
    fun summaryKeepsTheFirstRecordedOutcomeWhenDraftsRepeatAnAnchor() {
        val pack = pack("anchor-001")
        val summary = jobChecklistSummary(
            pack = pack,
            evidence = listOf(
                draft("inspection-001", "anchor-001", RecordedOutcome.SERVICEABLE),
                draft("inspection-002", "anchor-001", RecordedOutcome.DEFECTIVE),
            ),
        )

        assertEquals(1, summary.accountedAnchors)
        assertEquals(1, summary.serviceableCount)
        assertEquals(0, summary.defectiveCount)
    }

    @Test
    fun remainingFilterKeepsOnlyAnchorsWithoutARecordedOutcome() {
        val pack = pack("anchor-001", "anchor-002", "anchor-003")
        val rows = checklistRows(
            pack = pack,
            evidence = listOf(
                draft("inspection-001", "anchor-001", RecordedOutcome.SERVICEABLE),
                draft(
                    "inspection-002",
                    "anchor-002",
                    RecordedOutcome.NOT_INSPECTED,
                    exceptionReason = InspectionExceptionReason.INACCESSIBLE,
                ),
            ),
        )

        assertEquals(
            listOf("anchor-003"),
            filterChecklistRows(rows, ChecklistFilter.REMAINING).map { it.anchor.anchorId },
        )
        assertEquals(
            listOf("anchor-001", "anchor-002"),
            filterChecklistRows(rows, ChecklistFilter.DONE).map { it.anchor.anchorId },
        )
        assertEquals(
            listOf("anchor-002"),
            filterChecklistRows(rows, ChecklistFilter.EXCEPTIONS).map { it.anchor.anchorId },
        )
    }

    @Test
    fun rowsCarryPhotoCountsFromTheirDraft() {
        val pack = pack("anchor-001")
        val draft = draft("inspection-001", "anchor-001", RecordedOutcome.DEFECTIVE)
            .copy(photos = listOf(photo("photo-001"), photo("photo-002")))
        val rows = checklistRows(pack, listOf(draft))

        assertEquals(2, rows.single().photoCount)
        assertEquals(RecordedOutcome.DEFECTIVE, rows.single().outcome)
        assertTrue(rows.single().isAccounted)
        assertFalse(rows.single().isException)
    }

    @Test
    fun jobsSplitIntoTodayAssignedAndAvailableToClaim() {
        val today = "2026-11-23"
        val sections = splitJobsForHome(
            jobs = listOf(
                job("job-today", plannedDate = today, status = "in_progress", assigned = true),
                job("job-assigned", plannedDate = "2026-11-24", status = "assigned", assigned = true),
                job("job-claim", plannedDate = "2026-11-24", status = "released", assigned = false),
                job("job-offline", plannedDate = null, status = "in_progress", assigned = false),
            ),
            todayIsoDate = today,
        )

        assertEquals(listOf("job-today"), sections.today.map { it.jobId })
        assertEquals(
            listOf("job-assigned", "job-offline"),
            sections.assigned.map { it.jobId },
        )
        assertEquals(listOf("job-claim"), sections.availableToClaim.map { it.jobId })
    }

    @Test
    fun emptyPlannedDateJobsNeverLandInTheTodaySection() {
        val sections = splitJobsForHome(
            jobs = listOf(job("job-a", plannedDate = null, status = "assigned", assigned = true)),
            todayIsoDate = "2026-11-23",
        )

        assertTrue(sections.today.isEmpty())
        assertEquals(listOf("job-a"), sections.assigned.map { it.jobId })
    }

    @Test
    fun reviewStatusesShowAChipAndWorkingStatusesDoNot() {
        assertNull(jobStatusChipLabel("in_progress"))
        assertNull(jobStatusChipLabel("released"))
        assertNull(jobStatusChipLabel("draft"))
        assertEquals(R.string.job_status_under_review, jobStatusChipLabel("under_review"))
        assertEquals(R.string.job_status_under_review, jobStatusChipLabel("submitted"))
        assertEquals(R.string.job_status_changes_requested, jobStatusChipLabel("changes_requested"))
        assertEquals(
            R.string.job_status_approved_for_report,
            jobStatusChipLabel("approved_for_report_generation"),
        )
        assertEquals(R.string.job_status_report_generated, jobStatusChipLabel("report_generated"))
    }

    @Test
    fun todayActionLabelsFollowTheClaimState() {
        assertEquals(R.string.action_claim, todayActionLabel(releasedUnassignedJob()))
        assertEquals(
            R.string.action_continue,
            todayActionLabel(
                job("job-a", plannedDate = null, status = "in_progress", assigned = true),
            ),
        )
    }

    private fun releasedUnassignedJob() =
        job("job-claim", plannedDate = null, status = "released", assigned = false)

    private fun pack(vararg anchorIds: String) = FieldJobPack(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
        workflowStatus = "in_progress",
        jobPackVersion = 7L,
        siteName = "Site A",
        siteAddress = null,
        siteReference = null,
        accessNotes = null,
        anchors = anchorIds.map { anchorId ->
            JobPackAnchor(
                companyId = "company-a",
                anchorId = anchorId,
                siteId = "site-001",
                label = "A-${anchorId.takeLast(3)}",
                registerId = "REG-$anchorId",
                location = "North roof",
                anchorType = "single_point",
                manufacturer = null,
                model = null,
                installContext = null,
                registerStatus = "active",
                notes = null,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            )
        },
    )

    private fun draft(
        inspectionId: String,
        anchorId: String,
        outcome: RecordedOutcome?,
        exceptionReason: InspectionExceptionReason? = null,
    ) = AnchorInspectionDraft(
        companyId = "company-a",
        jobId = "job-001",
        jobPackVersion = 7L,
        inspectionId = inspectionId,
        expectedAnchorId = anchorId,
        recordedOutcome = outcome,
        exceptionReason = exceptionReason,
        createdAtEpochMillis = 1_000L,
    )

    private fun photo(localId: String) = AnchorEvidencePhoto(
        companyId = "company-a",
        jobId = "job-001",
        anchorInspectionId = "inspection-001",
        localId = localId,
        storageReference = "private/$localId.jpg",
        capturedAtEpochMillis = 1_100L,
        checksum = "sha256-$localId",
    )

    private fun job(
        jobId: String,
        plannedDate: String?,
        status: String,
        assigned: Boolean,
    ) = InspectorJob(
        companyId = "company-a",
        jobId = jobId,
        siteId = "site-$jobId",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-$jobId",
        plannedDate = plannedDate,
        workflowStatus = status,
        jobPackVersion = 3L,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = if (assigned) {
            au.com.heightsafety.domain.InspectorAssignment(
                companyId = "company-a",
                assignmentId = "assignment-$jobId",
                jobId = jobId,
                inspectorUserId = "inspector-a",
                assignedByUserId = null,
                assignmentType = "assigned",
                isPrimary = true,
                assignedAtEpochMillis = 1L,
                claimedAtEpochMillis = 2L,
            )
        } else {
            null
        },
    )
}
