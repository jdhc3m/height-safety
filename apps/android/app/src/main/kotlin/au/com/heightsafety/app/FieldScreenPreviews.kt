package au.com.heightsafety.app

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.SupportedJurisdiction

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
