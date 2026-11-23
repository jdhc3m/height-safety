package au.com.heightsafety.app

import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction

/** Synthetic reference fixtures shared by the navigation-shell tests. */
internal object FieldNavShellTestFixtures {

    fun referenceAccount() = AccountSummary(
        companyId = "company-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
    )

    fun referenceJob() = InspectorJob(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.QLD,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
        workflowStatus = "in_progress",
        jobPackVersion = 7L,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = null,
    )

    fun referenceJobPackOpenedState(): FieldUiState.JobPackOpened {
        val pack = referencePack()
        return FieldUiState.JobPackOpened(
            account = referenceAccount(),
            jobs = listOf(referenceJob()),
            job = referenceJob(),
            opened = OpenedJobPack(
                StoredJobPack(pack, referenceLease()),
                JobPackOpenSource.CACHED,
            ),
        )
    }

    fun referenceDraft(): AnchorInspectionDraft {
        val pack = referencePack()
        return AnchorInspectionDraft(
            companyId = pack.companyId,
            jobId = pack.jobId,
            jobPackVersion = pack.jobPackVersion,
            inspectionId = "inspection-001",
            expectedAnchorId = pack.anchors.single().anchorId,
            createdAtEpochMillis = 1_000L,
        )
    }

    fun anchorCaptureState(): FieldUiState.AnchorCapture {
        val packState = referenceJobPackOpenedState()
        return FieldUiState.AnchorCapture(
            account = packState.account,
            jobs = packState.jobs,
            job = packState.job,
            opened = packState.opened,
            anchor = packState.opened.stored.pack.anchors.single(),
            draft = referenceDraft(),
            evidence = emptyList(),
        )
    }

    private fun referencePack() = FieldJobPack(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.QLD,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
        workflowStatus = "assigned",
        jobPackVersion = 7L,
        siteName = "Site A",
        siteAddress = "1 Example Street",
        siteReference = "SITE-A",
        accessNotes = null,
        anchors = listOf(
            JobPackAnchor(
                companyId = "company-a",
                anchorId = "anchor-001",
                siteId = "site-001",
                label = "A-001",
                registerId = "REG-001",
                location = "North roof",
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

    private fun referenceLease() = OfflineAuthorizationLease(
        companyId = "company-a",
        userId = "inspector-a",
        jobId = "job-001",
        issuedAtEpochMillis = 1_000L,
        expiresAtEpochMillis = 86_401_000L,
        issuedAtElapsedRealtimeMillis = 500L,
    )
}
