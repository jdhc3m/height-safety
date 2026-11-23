package au.com.heightsafety.app

import androidx.activity.ComponentActivity
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.longClick
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeDown
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
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * Instrumented coverage for the T4 Jobs home and job checklist
 * (DESIGN.md §6.1): pull-to-refresh, filter chips, row-to-capture and the
 * submit gate.
 */
class JobsHomeChecklistInstrumentedTest {
    @get:Rule
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun pullToRefreshOnJobsHomeInvokesRefresh() {
        var refreshCount = 0
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.JobsLoaded(account(), listOf(job("assigned", true))),
                onSignIn = {},
                onRetry = {},
                onRefresh = { refreshCount += 1 },
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithTag("jobs_home_refresh")
            .performTouchInput { swipeDown() }
        composeTestRule.waitForIdle()

        assertTrue(refreshCount >= 1)
    }

    @Test
    fun todayCardShowsLocalProgressAndOpensTheJob() {
        var openedJob: InspectorJob? = null
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.JobsLoaded(
                    account = account(),
                    jobs = listOf(job("in_progress", true)),
                    progress = mapOf(
                        "job-001" to JobHomeProgress(expectedAnchors = 32, accountedAnchors = 12),
                    ),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onOpenJob = { openedJob = it },
            )
        }

        composeTestRule.onNodeWithText("Today").assertIsDisplayed()
        composeTestRule.onNodeWithText("12 of 32 accounted").assertIsDisplayed()
        composeTestRule.onNodeWithText("Continue").performClick()

        assertEquals("job-001", openedJob?.jobId)
    }

    @Test
    fun checklistFilterChipsScopeTheAnchorRows() {
        composeTestRule.setContent {
            FieldScreen(
                state = checklistState(
                    draft(
                        "inspection-001",
                        "anchor-001",
                        RecordedOutcome.SERVICEABLE,
                        photos = 1,
                    ),
                    draft(
                        "inspection-002",
                        "anchor-002",
                        RecordedOutcome.NOT_INSPECTED,
                        exceptionReason = InspectionExceptionReason.INACCESSIBLE,
                    ),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("2 / 3 anchors accounted for").assertIsDisplayed()
        // Remaining is the default filter: only anchor-003 is left.
        composeTestRule.onNodeWithText("A-003").assertIsDisplayed()
        composeTestRule.onNodeWithText("A-001").assertDoesNotExist()

        composeTestRule.onNodeWithText("Done (2)").performClick()
        composeTestRule.onNodeWithText("A-001").assertIsDisplayed()
        composeTestRule.onNodeWithText("1 photo").assertIsDisplayed()
        composeTestRule.onNodeWithText("A-002").assertIsDisplayed()
        composeTestRule.onNodeWithText("Not inspected · Inaccessible").assertIsDisplayed()
        composeTestRule.onNodeWithText("A-003").assertDoesNotExist()

        composeTestRule.onNodeWithText("Exceptions (1)").performClick()
        composeTestRule.onNodeWithText("A-002").assertIsDisplayed()
        composeTestRule.onNodeWithText("A-001").assertDoesNotExist()
    }

    @Test
    fun rowTapOpensCaptureAndOverflowPresetsReachTheCallbacks() {
        var openedAnchor: JobPackAnchor? = null
        var markedAnchor: JobPackAnchor? = null
        composeTestRule.setContent {
            FieldScreen(
                state = checklistState(),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onOpenAnchor = { openedAnchor = it },
                onMarkAnchorNotInspected = { markedAnchor = it },
            )
        }

        composeTestRule.onNodeWithText("A-003").performClick()
        assertEquals("anchor-003", openedAnchor?.anchorId)

        composeTestRule.onNodeWithText("A-003").performTouchInput { longClick() }
        composeTestRule.onNodeWithText("Mark not inspected").performClick()

        assertEquals("anchor-003", markedAnchor?.anchorId)
    }

    @Test
    fun submitGateAppearsOnlyWhenEveryExpectedAnchorIsAccountedFor() {
        var reviewRequested = false
        val screenState = mutableStateOf(checklistState())
        composeTestRule.setContent {
            FieldScreen(
                state = screenState.value,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onOpenSubmissionReview = { reviewRequested = true },
            )
        }

        composeTestRule.onNodeWithText("1 remaining").assertIsDisplayed()
        composeTestRule.onNodeWithText("Submit job").assertDoesNotExist()

        composeTestRule.onNodeWithText("Found an anchor not listed").assertIsDisplayed()
        screenState.value = checklistState(
            draft("inspection-001", "anchor-001", RecordedOutcome.SERVICEABLE),
            draft("inspection-002", "anchor-002", RecordedOutcome.NOT_INSPECTED),
            draft("inspection-003", "anchor-003", RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED),
        )
        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Submit job").assertIsDisplayed()
        composeTestRule.onNodeWithText("Submit job").performClick()

        assertTrue(reviewRequested)
    }

    @Test
    fun queuedSubmissionKeepsTheReviewReachableThroughTheGate() {
        composeTestRule.setContent {
            FieldScreen(
                state = checklistState(
                    draft("inspection-001", "anchor-001", RecordedOutcome.SERVICEABLE),
                    draft("inspection-002", "anchor-002", RecordedOutcome.NOT_INSPECTED),
                    draft("inspection-003", "anchor-003", RecordedOutcome.DEFECTIVE),
                ).copy(submissionIntent = referenceSubmissionIntent()),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("View submission").assertIsDisplayed()
    }

    @Test
    fun reconciliationShortcutsAreListedInTheRowOverflow() {
        composeTestRule.setContent {
            FieldScreen(
                state = checklistState(),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("A-003").performTouchInput { longClick() }
        composeTestRule.onNodeWithText("Propose replacement").assertIsDisplayed()
        composeTestRule.onNodeWithText("Propose duplicate").assertIsDisplayed()
        composeTestRule.onNodeWithText("Mark not inspected").performClick()
        composeTestRule.waitForIdle()

        // The overflow menu closed; the checklist stays in place.
        composeTestRule.onNodeWithText("2 / 3 anchors accounted for").assertIsDisplayed()
    }

    private fun account() = AccountSummary(
        companyId = "company-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
    )

    private fun job(status: String, assigned: Boolean) = InspectorJob(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001",
        plannedDate = LocalDate.now().toString(),
        workflowStatus = status,
        jobPackVersion = 7L,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = if (assigned) {
            InspectorAssignment(
                companyId = "company-a",
                assignmentId = "assignment-001",
                jobId = "job-001",
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
        reference = "JOB-001",
        plannedDate = LocalDate.now().toString(),
        workflowStatus = "in_progress",
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
            JobPackAnchor(
                companyId = "company-a",
                anchorId = "anchor-002",
                siteId = "site-001",
                label = "A-002",
                registerId = "REG-002",
                location = "South roof",
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
                label = "A-003",
                registerId = "REG-003",
                location = "East roof",
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
        issuedAtEpochMillis = 1_000L,
        expiresAtEpochMillis = 86_401_000L,
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
        jobPackVersion = 7L,
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

    private fun checklistState(
        vararg drafts: AnchorInspectionDraft,
    ) = FieldUiState.JobPackOpened(
        account = account(),
        jobs = listOf(job("in_progress", true)),
        job = job("in_progress", true),
        opened = OpenedJobPack(StoredJobPack(pack(), lease()), JobPackOpenSource.CACHED),
        evidence = drafts.toList(),
    )

    private fun referenceSubmissionIntent() = InspectionSubmissionIntent(
        companyId = "company-a",
        jobId = "job-001",
        jobPackVersion = 7L,
        submissionId = "submission-001",
        mutationId = "mutation-001",
        inspectorUserId = "inspector-a",
        sessionId = "session-001",
        createdAtEpochMillis = 1_000L,
        syncState = au.com.heightsafety.domain.EvidenceSyncState.PENDING,
    )
}
