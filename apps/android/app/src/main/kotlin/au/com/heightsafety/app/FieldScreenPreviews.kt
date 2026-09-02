package au.com.heightsafety.app

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction
import au.com.heightsafety.domain.FieldJobPack

@Preview(name = "Signed out", showBackground = true)
@Composable
private fun SignedOutPreview() {
    ReferencePreview(FieldUiState.SignedOut)
}

@Preview(name = "Signing in", showBackground = true)
@Composable
private fun SigningInPreview() {
    ReferencePreview(FieldUiState.SigningIn("company-a"))
}

@Preview(name = "Loading jobs", showBackground = true)
@Composable
private fun LoadingJobsPreview() {
    ReferencePreview(FieldUiState.LoadingJobs(referenceAccount()))
}

@Preview(name = "Jobs loaded", showBackground = true)
@Composable
private fun JobsLoadedPreview() {
    ReferencePreview(
        FieldUiState.JobsLoaded(
            account = referenceAccount(),
            jobs = listOf(referenceJob()),
        ),
    )
}

@Preview(name = "Empty jobs", showBackground = true)
@Composable
private fun EmptyJobsPreview() {
    ReferencePreview(FieldUiState.EmptyJobs(referenceAccount()))
}

@Preview(name = "Sync error", showBackground = true)
@Composable
private fun SyncErrorPreview() {
    ReferencePreview(
        FieldUiState.Error(
            message = "Unable to sync jobs. Check connection and try again.",
            canRetry = true,
            account = referenceAccount(),
        ),
    )
}

@Preview(name = "Session expired", showBackground = true)
@Composable
private fun SessionExpiredPreview() {
    ReferencePreview(FieldUiState.SessionExpired())
}

@Preview(name = "Job pack phone", widthDp = 360, heightDp = 800, showBackground = true)
@Composable
private fun JobPackPhonePreview() {
    ReferencePreview(referenceJobPackState())
}

@Preview(name = "Job pack tablet", widthDp = 840, heightDp = 900, showBackground = true)
@Composable
private fun JobPackTabletPreview() {
    ReferencePreview(referenceJobPackState())
}

@Composable
private fun ReferencePreview(state: FieldUiState) {
    FieldScreen(
        state = state,
        onSignIn = {},
        onRetry = {},
        onRefresh = {},
        onSignOut = {},
    )
}

private fun referenceAccount() = AccountSummary(
    companyId = "company-a",
    userId = "inspector-a",
    email = "inspector-a@example.test",
    role = ProductRole.INSPECTOR,
)

private fun referenceJob() = InspectorJob(
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
    assignment = InspectorAssignment(
        companyId = "company-a",
        assignmentId = "assignment-001",
        jobId = "job-001",
        inspectorUserId = "inspector-a",
        assignedByUserId = null,
        assignmentType = "claimed",
        isPrimary = true,
        assignedAtEpochMillis = 1L,
        claimedAtEpochMillis = 2L,
    ),
)

private fun referenceJobPackState() = FieldUiState.JobPackOpened(
    account = referenceAccount(),
    jobs = listOf(referenceJob()),
    job = referenceJob(),
    opened = OpenedJobPack(
        stored = StoredJobPack(
            pack = FieldJobPack(
                companyId = "company-a",
                jobId = "job-001",
                siteId = "site-001",
                jurisdiction = SupportedJurisdiction.QLD,
                reference = "JOB-001",
                plannedDate = "2026-09-15",
                workflowStatus = "in_progress",
                jobPackVersion = 7L,
                siteName = "Site A",
                siteAddress = "1 Example Street",
                siteReference = "SITE-A",
                accessNotes = "North access",
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
            ),
            lease = OfflineAuthorizationLease(
                companyId = "company-a",
                userId = "inspector-a",
                jobId = "job-001",
                issuedAtEpochMillis = 1_000L,
                expiresAtEpochMillis = 86_401_000L,
                issuedAtElapsedRealtimeMillis = 500L,
            ),
        ),
        source = JobPackOpenSource.CACHED,
    ),
)
