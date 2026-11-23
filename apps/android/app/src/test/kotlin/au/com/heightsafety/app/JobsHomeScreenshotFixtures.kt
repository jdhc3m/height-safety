package au.com.heightsafety.app

import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction
import java.time.LocalDate

/** Synthetic fixtures for the T4 phone screenshots. No API or real data. */
internal object JobsHomeScreenshotFixtures {

    fun jobsHomeState() = FieldUiState.JobsLoaded(
        account = account(),
        jobs = listOf(
            job(jobId = "job-001", status = "in_progress", assigned = true, today = true),
            job(jobId = "job-002", status = "assigned", assigned = true, today = false),
            job(jobId = "job-003", status = "released", assigned = false, today = false),
            job(
                jobId = "job-004",
                status = "changes_requested",
                assigned = true,
                today = false,
            ),
        ),
        progress = mapOf(
            "job-001" to JobHomeProgress(expectedAnchors = 32, accountedAnchors = 12),
        ),
    )

    fun checklistState() = FieldUiState.JobPackOpened(
        account = account(),
        jobs = listOf(job(jobId = "job-001", status = "in_progress", assigned = true, today = true)),
        job = job(jobId = "job-001", status = "in_progress", assigned = true, today = true),
        opened = OpenedJobPack(StoredJobPack(pack(), lease()), JobPackOpenSource.DOWNLOADED),
        evidence = listOf(
            draft(
                inspectionId = "inspection-001",
                anchorId = "anchor-001",
                outcome = RecordedOutcome.SERVICEABLE,
                photos = 1,
            ),
            draft(
                inspectionId = "inspection-002",
                anchorId = "anchor-002",
                outcome = RecordedOutcome.DEFECTIVE,
                photos = 2,
            ),
            draft(
                inspectionId = "inspection-003",
                anchorId = "anchor-003",
                outcome = RecordedOutcome.NOT_INSPECTED,
                exceptionReason = InspectionExceptionReason.INACCESSIBLE,
            ),
        ),
    )

    private fun account() = AccountSummary(
        companyId = "company-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
    )

    private fun job(
        jobId: String,
        status: String,
        assigned: Boolean,
        today: Boolean,
    ) = InspectorJob(
        companyId = "company-a",
        jobId = jobId,
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-2026-01427",
        plannedDate = if (today) LocalDate.now().toString() else null,
        workflowStatus = status,
        jobPackVersion = 3L,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = if (assigned) {
            InspectorAssignment(
                companyId = "company-a",
                assignmentId = "assignment-$jobId",
                jobId = jobId,
                inspectorUserId = "inspector-a",
                assignedByUserId = null,
                assignmentType = "claimed",
                isPrimary = true,
                assignedAtEpochMillis = 1L,
                claimedAtEpochMillis = 2L,
            )
        } else {
            null
        },
    )

    private fun pack() = FieldJobPack(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-2026-01427",
        plannedDate = LocalDate.now().toString(),
        workflowStatus = "in_progress",
        jobPackVersion = 3L,
        siteName = "Harbour Point Tower",
        siteAddress = "1 Example Street, Sydney NSW 2000",
        siteReference = "SITE-A",
        accessNotes = null,
        anchors = listOf(
            JobPackAnchor(
                companyId = "company-a",
                anchorId = "anchor-001",
                siteId = "site-001",
                label = "ANC-0013",
                registerId = "REG-001",
                location = "Parapet north A3",
                anchorType = "single_point",
                manufacturer = null,
                model = null,
                installContext = null,
                registerStatus = "active",
                notes = null,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            ),
            JobPackAnchor(
                companyId = "company-a",
                anchorId = "anchor-002",
                siteId = "site-001",
                label = "ANC-0014",
                registerId = "REG-002",
                location = "Parapet north A4",
                anchorType = "single_point",
                manufacturer = null,
                model = null,
                installContext = null,
                registerStatus = "active",
                notes = null,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            ),
            JobPackAnchor(
                companyId = "company-a",
                anchorId = "anchor-003",
                siteId = "site-001",
                label = "ANC-0015",
                registerId = "REG-003",
                location = "Parapet south B1",
                anchorType = "single_point",
                manufacturer = null,
                model = null,
                installContext = null,
                registerStatus = "active",
                notes = null,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            ),
            JobPackAnchor(
                companyId = "company-a",
                anchorId = "anchor-004",
                siteId = "site-001",
                label = "ANC-0016",
                registerId = "REG-004",
                location = "Parapet south B2",
                anchorType = "single_point",
                manufacturer = null,
                model = null,
                installContext = null,
                registerStatus = "active",
                notes = null,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            ),
        ),
    )

    private fun lease() = OfflineAuthorizationLease(
        companyId = "company-a",
        userId = "inspector-a",
        jobId = "job-001",
        issuedAtEpochMillis = 1_795_536_000_000L,
        expiresAtEpochMillis = 1_795_536_000_000L + 86_401_000L,
        issuedAtElapsedRealtimeMillis = 500L,
    )

    private fun draft(
        inspectionId: String,
        anchorId: String,
        outcome: RecordedOutcome,
        exceptionReason: InspectionExceptionReason? = null,
        photos: Int = 0,
    ) = AnchorInspectionDraft(
        companyId = "company-a",
        jobId = "job-001",
        jobPackVersion = 3L,
        inspectionId = inspectionId,
        expectedAnchorId = anchorId,
        recordedOutcome = outcome,
        exceptionReason = exceptionReason,
        identityConfirmed = true,
        locationConfirmed = true,
        createdAtEpochMillis = 1_000L,
        photos = List(photos) { index ->
            AnchorEvidencePhoto(
                companyId = "company-a",
                jobId = "job-001",
                anchorInspectionId = inspectionId,
                localId = "photo-$index",
                storageReference = "private/photo-$index.jpg",
                capturedAtEpochMillis = 1_100L,
                checksum = "sha256-photo-$index",
                uploadState = PhotoUploadState.PENDING_UPLOAD,
            )
        },
    )
}
