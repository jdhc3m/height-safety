package au.com.heightsafety.app

import androidx.activity.ComponentActivity
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.OpenedJobPack
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.SupportedJurisdiction
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SubmissionReadiness
import au.com.heightsafety.domain.SubmissionReviewResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class FieldScreenTest {
    @get:Rule
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun assignedRowPreservesJurisdictionAssignmentAndPackVersion() {
        setContent(
            FieldUiState.JobsLoaded(
                account = account(),
                jobs = listOf(job()),
            ),
        )

        composeTestRule.onNodeWithText("JOB-001").assertIsDisplayed()
        composeTestRule.onNodeWithText("Claimed").assertIsDisplayed()
        composeTestRule.onNodeWithText("QLD").assertIsDisplayed()
        composeTestRule.onNodeWithText("Pack v7").assertIsDisplayed()
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
        composeTestRule.onNodeWithText("No jobs assigned yet").assertIsDisplayed()
        composeTestRule.onNodeWithText("All synced").assertIsDisplayed()

        screenState.value =
            FieldUiState.Error(
                message = "Unable to sync jobs. Check connection and try again.",
                canRetry = true,
                account = account(),
            )
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Sync failed").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()

        screenState.value = FieldUiState.SessionExpired()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Session expired. Sign in again.").assertIsDisplayed()
    }

    @Test
    fun lockedAndRevokedStatesExplainEvidencePreservationAndRecovery() {
        val screenState = mutableStateOf<FieldUiState>(
            FieldUiState.AppLocked(account()),
        )
        var recoveryClicked = false
        composeTestRule.setContent {
            FieldScreen(
                state = screenState.value,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onStartAdministratorRecovery = { recoveryClicked = true },
            )
        }

        composeTestRule.onNodeWithText("Height Safety is locked").assertIsDisplayed()
        composeTestRule.onNodeWithText("Local evidence remains preserved on this device.")
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("Unlock device").assertIsDisplayed()

        screenState.value = FieldUiState.AccountRevoked(account())
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Account access unavailable").assertIsDisplayed()
        composeTestRule.onNodeWithText("Administrator recovery").performClick()

        assertTrue(recoveryClicked)
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

        composeTestRule.onNodeWithText("Continue").performClick()

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

        composeTestRule.onNodeWithText("Claim").assertIsDisplayed()
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

        composeTestRule.onNodeWithText("Site A").assertIsDisplayed()
        composeTestRule.onNodeWithText("JOB-001 · QLD · Pack v7").assertIsDisplayed()
        composeTestRule.onNodeWithText("Downloaded").assertIsDisplayed()
        composeTestRule.onNodeWithText("0 / 1 anchors accounted for").assertIsDisplayed()
        composeTestRule.onNodeWithText("A-001").assertIsDisplayed()
        composeTestRule.onNodeWithText("North roof").assertIsDisplayed()
        composeTestRule.onNodeWithText("Not recorded").assertIsDisplayed()
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

         composeTestRule.onNodeWithText("Found an anchor not listed")
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
            recordedOutcome = RecordedOutcome.DEFECTIVE,
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
        composeTestRule.onNodeWithText("Defect description")
            .performScrollTo()
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("No photos attached")
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

    @Test
    fun submissionReviewShowsBlockersAndWarningsSeparately() {
        val pack = submissionPack()
        val draft = submissionDraft(pack).copy(
            recordedOutcome = RecordedOutcome.SERVICEABLE,
        )
        val review = SubmissionReviewResult(
            evidence = listOf(draft),
            readiness = SubmissionReadiness.evaluate(pack, listOf(draft)),
            intent = null,
        )
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.SubmissionReview(
                    account = account(),
                    jobs = listOf(job()),
                    job = job(),
                    opened = OpenedJobPack(
                        StoredJobPack(pack, submissionLease()),
                        JobPackOpenSource.CACHED,
                    ),
                    review = review,
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("Submission blocked").assertIsDisplayed()
        composeTestRule.onNodeWithText("Blockers").assertIsDisplayed()
        composeTestRule.onNodeWithText("Warnings for office review").assertIsDisplayed()
        composeTestRule.onNodeWithText("Blockers: 3. Warnings: 2.").assertIsDisplayed()
    }

    @Test
    fun readySubmissionReviewOffersLocalQueue() {
        val pack = submissionPack()
        val draft = submissionDraft(pack).copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = au.com.heightsafety.domain.InspectionExceptionReason.INACCESSIBLE,
        )
        val review = SubmissionReviewResult(
            evidence = listOf(draft),
            readiness = SubmissionReadiness.evaluate(pack, listOf(draft)),
            intent = null,
        )
        var queueClicked = false
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.SubmissionReview(
                    account = account(),
                    jobs = listOf(job()),
                    job = job(),
                    opened = OpenedJobPack(
                        StoredJobPack(pack, submissionLease()),
                        JobPackOpenSource.CACHED,
                    ),
                    review = review,
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onQueueSubmission = { queueClicked = true },
            )
        }

        composeTestRule.onNodeWithText("Ready to queue").assertIsDisplayed()
        composeTestRule.onNodeWithText("Queue submission locally")
            .performScrollTo()
            .performClick()

        assertTrue(queueClicked)
    }

    @Test
    fun queuedSubmissionShowsConflictAndPhotoSynchronisationBlockers() {
        val pack = submissionPack()
        val draft = submissionDraft(pack).copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = au.com.heightsafety.domain.InspectionExceptionReason.INACCESSIBLE,
            syncState = EvidenceSyncState.CONFLICT,
            photos = listOf(
                AnchorEvidencePhoto(
                    companyId = pack.companyId,
                    jobId = pack.jobId,
                    anchorInspectionId = "inspection-001",
                    localId = "photo-001",
                    storageReference = "private/photo-001.jpg",
                    capturedAtEpochMillis = 1_100L,
                    checksum = "sha256-photo-001",
                    uploadState = PhotoUploadState.PENDING_UPLOAD,
                ),
            ),
            submissionId = "submission-001",
        )
        val review = SubmissionReviewResult(
            evidence = listOf(draft),
            readiness = SubmissionReadiness.evaluate(pack, listOf(draft)),
            intent = InspectionSubmissionIntent(
                companyId = pack.companyId,
                jobId = pack.jobId,
                jobPackVersion = pack.jobPackVersion,
                submissionId = "submission-001",
                mutationId = "mutation-001",
                inspectorUserId = "inspector-a",
                sessionId = "session-001",
                createdAtEpochMillis = 1_000L,
                syncState = EvidenceSyncState.CONFLICT,
            ),
        )
        composeTestRule.setContent {
            FieldScreen(
                state = FieldUiState.SubmissionReview(
                    account = account(),
                    jobs = listOf(job()),
                    job = job(),
                    opened = OpenedJobPack(
                        StoredJobPack(pack, submissionLease()),
                        JobPackOpenSource.CACHED,
                    ),
                    review = review,
                ),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("Synchronisation conflict is recorded and requires review; local evidence is preserved.")
            .assertIsDisplayed()
        composeTestRule.onNodeWithText("Photo uploads remain pending.")
            .assertIsDisplayed()
    }

    @Test
    fun bottomBarTabsReachSyncAndAccountDestinations() {
        val screenState = mutableStateOf<FieldUiState>(
            FieldUiState.JobsLoaded(account(), listOf(job())),
        )
        composeTestRule.setContent {
            FieldScreen(
                state = screenState.value,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithText("Sync").performClick()
        composeTestRule.onNodeWithText(
            "Records saved on this device appear here while they send. Server acknowledgement is shown per record.",
        ).assertIsDisplayed()

        composeTestRule.onNodeWithText("Account").performClick()
        composeTestRule.onNodeWithText("Role: Inspector").assertIsDisplayed()

        composeTestRule.onNodeWithText("Jobs").performClick()
        composeTestRule.onNodeWithText("JOB-001").assertIsDisplayed()
    }

    @Test
    fun jobPackKeepsTheNavigationBarAndClosesThroughTheStateOnBack() {
        var packClosed = false
        val packState = referenceJobPackOpenedState()
        composeTestRule.setContent {
            FieldScreen(
                state = packState,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onCloseJobPack = { packClosed = true },
            )
        }

         composeTestRule.onNodeWithText("Site A").assertIsDisplayed()
         composeTestRule.onNodeWithText("Jobs").assertIsDisplayed()
         composeTestRule.activity.onBackPressedDispatcher.onBackPressed()

        assertTrue(packClosed)
    }

    @Test
    fun syncBadgeShowsUnsentCountsWhileAJobPackIsOpen() {
        val packState = referenceJobPackOpenedState().copy(
            evidence = listOf(
                referenceDraft().copy(syncState = EvidenceSyncState.LOCAL),
            ),
        )
        composeTestRule.setContent {
            FieldScreen(
                state = packState,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }

        composeTestRule.onNodeWithContentDescription("Unsent records: 1", useUnmergedTree = true)
            .assertIsDisplayed()
    }

    @Test
    fun unsavedCaptureBackShowsTheDiscardGuard() {
        var captureClosed = false
        composeTestRule.setContent {
            FieldScreen(
                state = anchorCaptureState(),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onCloseAnchor = { captureClosed = true },
            )
        }

        composeTestRule.onNodeWithText("Anchor capture").assertIsDisplayed()
        composeTestRule.activity.onBackPressedDispatcher.onBackPressed()

        composeTestRule.onNodeWithText("Discard changes?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Keep editing").performClick()
        assertFalse(captureClosed)

        composeTestRule.activity.onBackPressedDispatcher.onBackPressed()
        composeTestRule.onNodeWithText("Discard").performClick()

        assertTrue(captureClosed)
    }

    @Test
    fun savedCaptureClosesOnBackWithoutTheDiscardGuard() {
        var captureClosed = false
        val capture = anchorCaptureState().copy(
            evidence = listOf(anchorCaptureState().draft),
            saveState = EvidenceSaveState.SAVED_LOCALLY,
        )
        composeTestRule.setContent {
            FieldScreen(
                state = capture,
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
                onCloseAnchor = { captureClosed = true },
            )
        }

        composeTestRule.onNodeWithText("Anchor capture").assertIsDisplayed()
        composeTestRule.activity.onBackPressedDispatcher.onBackPressed()

        assertTrue(captureClosed)
    }

    private fun referenceJobPackOpenedState(): FieldUiState.JobPackOpened {
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
        return FieldUiState.JobPackOpened(
            account = account(),
            jobs = listOf(job()),
            job = job(),
            opened = OpenedJobPack(
                StoredJobPack(pack, submissionLease()),
                JobPackOpenSource.CACHED,
            ),
        )
    }

    private fun referenceDraft(): AnchorInspectionDraft {
        val pack = referenceJobPackOpenedState().opened.stored.pack
        return AnchorInspectionDraft(
            companyId = pack.companyId,
            jobId = pack.jobId,
            jobPackVersion = pack.jobPackVersion,
            inspectionId = "inspection-001",
            expectedAnchorId = pack.anchors.single().anchorId,
            createdAtEpochMillis = 1_000L,
        )
    }

    private fun anchorCaptureState(): FieldUiState.AnchorCapture {
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

    private fun submissionPack() = FieldJobPack(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
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
        ),
    )

    private fun submissionDraft(pack: FieldJobPack) = AnchorInspectionDraft(
        companyId = pack.companyId,
        jobId = pack.jobId,
        jobPackVersion = pack.jobPackVersion,
        inspectionId = "inspection-001",
        expectedAnchorId = pack.anchors.single().anchorId,
        createdAtEpochMillis = 1_000L,
    )

    private fun submissionLease() = OfflineAuthorizationLease(
        companyId = "company-a",
        userId = "inspector-a",
        jobId = "job-001",
        issuedAtEpochMillis = 1_000L,
        expiresAtEpochMillis = 86_401_000L,
        issuedAtElapsedRealtimeMillis = 500L,
    )
}
