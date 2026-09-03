package au.com.heightsafety.app

import androidx.activity.ComponentActivity
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.SupportedJurisdiction
import au.com.heightsafety.domain.StoredJobPack
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class FieldScreenTest {
    @get:Rule
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun jobCardPreservesJurisdictionStatusAssignmentAndPackVersion() {
        setContent(
            FieldUiState.JobsLoaded(
                account = account(),
                jobs = listOf(job()),
            ),
        )

        composeTestRule.onNodeWithText("JOB-001").assertIsDisplayed()
        composeTestRule.onNodeWithText("Jurisdiction: QLD").assertIsDisplayed()
        composeTestRule.onNodeWithText("Status: In Progress").assertIsDisplayed()
        composeTestRule.onNodeWithText("Job pack version: 7").assertIsDisplayed()
        composeTestRule.onNodeWithText("Assignment: Claimed").assertIsDisplayed()
    }

    @Test
    fun explicitLoadingEmptyErrorAndExpiredStatesAreVisible() {
        val screenState = mutableStateOf<FieldUiState>(FieldUiState.LoadingJobs(account()))
        composeTestRule.setContent {
            FieldScreen(
                state = screenState.value,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("Syncing jobs").assertIsDisplayed()

        screenState.value = FieldUiState.EmptyJobs(account())
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("No eligible jobs").assertIsDisplayed()
        composeTestRule.onNodeWithText("Jobs updated").assertIsDisplayed()

        screenState.value =
            FieldUiState.Error(
                message = "Unable to sync jobs. Check connection and try again.",
                canRetry = true,
                account = account(),
            )
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Job sync failed").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()

        screenState.value = FieldUiState.SessionExpired()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Session expired. Sign in again.").assertIsDisplayed()
    }

    @Test
    fun signInCompanyFieldRestoresAfterRecreation() {
        val restorationTester = StateRestorationTester(composeTestRule)
        restorationTester.setContent {
            FieldScreen(
                state = FieldUiState.SignedOut,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNode(hasSetTextAction()).performTextInput("company-a")
        restorationTester.emulateSavedInstanceStateRestore()

        composeTestRule.onNode(hasSetTextAction()).assertTextContains("company-a")
    }

    @Test
    fun signInSubmitsEnteredCompany() {
        var submittedCompanyId: String? = null
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.SignedOut,
                onSignIn = { submittedCompanyId = it },
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNode(hasSetTextAction()).performTextInput("company-a")
        composeTestRule.onNodeWithText("Sign in").performClick()

        assertEquals("company-a", submittedCompanyId)
    }

    @Test
    fun jobCardOpensSelectedJobPack() {
        var openedJob: InspectorJob? = null
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.JobsLoaded(account(), listOf(job())),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onOpenJob = { openedJob = it },
            )
        }

        composeTestRule.onNodeWithText("Open job pack").performClick()

        assertEquals("job-001", openedJob?.jobId)
    }

    @Test
    fun releasedJobOffersClaimBeforePackDownload() {
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.JobsLoaded(
                    account(),
                    listOf(job().copy(workflowStatus = "released", assignment = null)),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("Claim and open job pack").assertIsDisplayed()
    }

    @Test
    fun openedJobPackShowsVersionJurisdictionLeaseAndAnchors() {
        val pack = FieldJobPack(
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
        )
        val lease = OfflineAuthorizationLease(
            companyId = "company-a",
            userId = "inspector-a",
            jobId = "job-001",
            issuedAtEpochMillis = 1_000L,
            expiresAtEpochMillis = 86_401_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.JobPackOpened(
                    account(),
                    listOf(job()),
                    job(),
                    OpenedJobPack(StoredJobPack(pack, lease), JobPackOpenSource.DOWNLOADED),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("Job pack").assertIsDisplayed()
        composeTestRule.onNodeWithText("Jurisdiction: QLD").assertIsDisplayed()
        composeTestRule.onNodeWithText("Job pack version: 7").assertIsDisplayed()
        composeTestRule.onNodeWithText("Site: Site A").assertIsDisplayed()
        composeTestRule.onNodeWithText("Downloaded and stored securely").assertIsDisplayed()
        composeTestRule.onNodeWithText("Expected anchors: 1").assertIsDisplayed()
        composeTestRule.onNodeWithText("A-001").assertIsDisplayed()
        composeTestRule.onNodeWithText("Location: North roof").assertIsDisplayed()
    }

    @Test
    fun openedJobPackOffersNewlyDiscoveredAnchorCapture() {
        val anchor = JobPackAnchor(
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
        )
        val pack = FieldJobPack(
            companyId = "company-a",
            jobId = "job-001",
            siteId = "site-001",
            jurisdiction = SupportedJurisdiction.NSW,
            reference = "JOB-001",
            plannedDate = "2026-09-15",
            workflowStatus = "assigned",
            jobPackVersion = 7L,
            siteName = "Site A",
            siteAddress = "1 Example Street",
            siteReference = "SITE-A",
            accessNotes = null,
            anchors = listOf(anchor),
        )
        val lease = OfflineAuthorizationLease(
            companyId = "company-a",
            userId = "inspector-a",
            jobId = "job-001",
            issuedAtEpochMillis = 1_000L,
            expiresAtEpochMillis = 86_401_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        var addClicked = false
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.JobPackOpened(
                    account = account(),
                    jobs = listOf(job()),
                    job = job(),
                    opened = OpenedJobPack(
                        StoredJobPack(pack, lease),
                        JobPackOpenSource.CACHED,
                    ),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onAddDiscoveredAnchor = { addClicked = true },
            )
        }

        composeTestRule.onNodeWithText("Record newly discovered anchor")
            .performScrollTo()
            .performClick()

        assertTrue(addClicked)
    }

    @Test
    fun anchorCaptureUsesNeutralOutcomeAndLocalSaveAction() {
        val anchor = JobPackAnchor(
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
        )
        val pack = FieldJobPack(
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
            anchors = listOf(anchor),
        )
        val lease = OfflineAuthorizationLease(
            companyId = "company-a",
            userId = "inspector-a",
            jobId = "job-001",
            issuedAtEpochMillis = 1_000L,
            expiresAtEpochMillis = 86_401_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        val draft = AnchorInspectionDraft(
            companyId = "company-a",
            jobId = "job-001",
            jobPackVersion = 7L,
            inspectionId = "inspection-001",
            expectedAnchorId = "anchor-001",
            createdAtEpochMillis = 1_000L,
        )
        var updatedDraft: AnchorInspectionDraft? = null
        var saveClicked = false
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.AnchorCapture(
                    account = account(),
                    jobs = listOf(job()),
                    job = job(),
                    opened = OpenedJobPack(
                        StoredJobPack(pack, lease),
                        JobPackOpenSource.CACHED,
                    ),
                    anchor = anchor,
                    draft = draft,
                    evidence = emptyList(),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onUpdateAnchorDraft = { updatedDraft = it },
                onSaveAnchorDraft = { saveClicked = true },
                onCapturePhoto = {},
            )
        }

        composeTestRule.onNodeWithText("Anchor capture").assertIsDisplayed()
        composeTestRule.onNodeWithText("Recorded outcome").assertIsDisplayed()
        composeTestRule.onNodeWithText("Newly discovered anchor")
            .performScrollTo()
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("Proof test (optional)")
            .performScrollTo()
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("Removed from service recorded")
            .performScrollTo()
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("Capture photo")
            .performScrollTo()
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("Serviceable").performScrollTo().performClick()
        composeTestRule.onNodeWithText("Save evidence locally")
            .performScrollTo()
            .performClick()

        assertEquals(RecordedOutcome.SERVICEABLE, updatedDraft?.recordedOutcome)
        assertTrue(saveClicked)
    }

    @Test
    fun anchorCaptureCanStartAReconciliationProposal() {
        val anchor = JobPackAnchor(
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
        )
        val pack = FieldJobPack(
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
            anchors = listOf(anchor),
        )
        val lease = OfflineAuthorizationLease(
            companyId = "company-a",
            userId = "inspector-a",
            jobId = "job-001",
            issuedAtEpochMillis = 1_000L,
            expiresAtEpochMillis = 86_401_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        val draft = AnchorInspectionDraft(
            companyId = "company-a",
            jobId = "job-001",
            jobPackVersion = 7L,
            inspectionId = "inspection-001",
            expectedAnchorId = "anchor-001",
            createdAtEpochMillis = 1_000L,
        )
        var updatedDraft: AnchorInspectionDraft? = null
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.AnchorCapture(
                    account = account(),
                    jobs = listOf(job()),
                    job = job(),
                    opened = OpenedJobPack(
                        StoredJobPack(pack, lease),
                        JobPackOpenSource.CACHED,
                    ),
                    anchor = anchor,
                    draft = draft,
                    evidence = emptyList(),
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onUpdateAnchorDraft = { updatedDraft = it },
            )
        }

        composeTestRule.onNodeWithText("Newly discovered anchor")
            .performScrollTo()
            .performClick()

        assertEquals(null, updatedDraft?.expectedAnchorId)
        assertEquals(
            ReconciliationProposal.NEWLY_DISCOVERED,
            updatedDraft?.reconciliationProposal,
        )
    }

    private fun setContent(state: FieldUiState) {
        composeTestRule.setContent {
            FieldScreen(
                state = state,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }
    }

    private fun account() = AccountSummary(
        companyId = "company-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
    )

    private fun job() = InspectorJob(
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
        assignment = au.com.heightsafety.domain.InspectorAssignment(
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
}
