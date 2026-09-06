package au.com.heightsafety.app

import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.AnchorEvidenceSubmissionStore
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.AnchorSubmissionService
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldOfflineAccessState
import au.com.heightsafety.domain.FieldJobPackStore
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.JobPackGateway
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.OfflineAccessSession
import au.com.heightsafety.domain.OfflineAccessStateStore
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.ProviderAccessTokenSource
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction
import au.com.heightsafety.domain.SyncMutation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FieldViewModelTest {
    @Test
    fun signInLoadsAuthorisedJobsAndReportsSynchronisedState() = runTest {
        val gateway = FakeGateway(
            jobs = listOf(
                job("released", companyId = "company-a", jobId = "released-job"),
                job(
                    "assigned",
                    companyId = "company-a",
                    jobId = "assigned-job",
                    assignment = assignment("company-a", "assigned-job", "inspector-a"),
                ),
                job("released", companyId = "company-b", jobId = "other-company-job"),
            ),
        )
        val viewModel = viewModel(gateway, scope = this)

        viewModel.signIn(" company-a ")
        assertTrue(viewModel.uiState.value is FieldUiState.SigningIn)
        advanceUntilIdle()

        val state = viewModel.uiState.value as FieldUiState.JobsLoaded
        assertEquals(SyncState.SYNCHRONISED, state.syncState)
        assertEquals(
            listOf("released-job", "assigned-job"),
            state.jobs.map { it.jobId },
        )
        assertFalse(state.jobs.any { it.companyId != "company-a" })
    }

    @Test
    fun sameCompanyJobAssignedToAnotherInspectorIsHidden() = runTest {
        val gateway = FakeGateway(
            jobs = listOf(
                job(
                    "assigned",
                    companyId = "company-a",
                    jobId = "other-inspector-job",
                    assignment = assignment("company-a", "other-inspector-job", "inspector-b"),
                ),
            ),
        )
        val viewModel = viewModel(gateway, scope = this)

        viewModel.signIn("company-a")
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is FieldUiState.EmptyJobs)
    }

    @Test
    fun emptyAndErrorStatesExposeSyncOutcome() = runTest {
        val emptyViewModel = viewModel(FakeGateway(jobs = emptyList()), scope = this)
        emptyViewModel.signIn("company-a")
        advanceUntilIdle()
        assertEquals(SyncState.SYNCHRONISED, (emptyViewModel.uiState.value as FieldUiState.EmptyJobs).syncState)

        val errorViewModel = viewModel(
            FakeGateway(
                failure = FieldGatewayException(
                    GatewayFailureReason.NETWORK,
                    "test network failure",
                ),
            ),
            scope = this,
        )
        errorViewModel.signIn("company-a")
        advanceUntilIdle()

        val state = errorViewModel.uiState.value as FieldUiState.Error
        assertEquals(SyncState.FAILED, state.syncState)
        assertTrue(state.canRetry)
        assertEquals("Unable to sync jobs. Check connection and try again.", state.message)
    }

    @Test
    fun nonInspectorSessionIsRejectedBeforeJobList() = runTest {
        val gateway = FakeGateway(sessionRole = ProductRole.OFFICE_REVIEWER)
        val viewModel = viewModel(gateway, scope = this)

        viewModel.signIn("company-a")
        advanceUntilIdle()

        val state = viewModel.uiState.value as FieldUiState.Error
        assertEquals("Inspector access is required.", state.message)
        assertFalse(gateway.listJobsCalled)
    }

    @Test
    fun expiredSessionLocksFieldAccess() = runTest {
        var now = 1_000L
        val gateway = FakeGateway(
            jobs = listOf(job("released")),
            sessionExpiresAtEpochMillis = 2_000L,
        )
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            nowEpochMillis = { now },
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        assertTrue(viewModel.uiState.value is FieldUiState.JobsLoaded)

        now = 2_000L
        viewModel.refreshJobs()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is FieldUiState.SessionExpired)
        assertEquals(1, gateway.listJobsCallCount)
    }

    @Test
    fun unauthenticatedJobResponseExpiresSession() = runTest {
        val gateway = FakeGateway(
            failure = FieldGatewayException(
                GatewayFailureReason.UNAUTHENTICATED,
                "expired session",
            ),
        )
        val viewModel = viewModel(gateway, scope = this)

        viewModel.signIn("company-a")
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is FieldUiState.SessionExpired)
    }

    @Test
    fun signOutClearsSessionAndRevokesIt() = runTest {
        val gateway = FakeGateway()
        val viewModel = viewModel(gateway, scope = this)
        viewModel.signIn("company-a")
        advanceUntilIdle()

        viewModel.signOut()
        advanceUntilIdle()

        assertEquals(FieldUiState.SignedOut, viewModel.uiState.value)
        assertTrue(gateway.revokeCalled)
        assertEquals(2, gateway.clearSessionCallCount)
        viewModel.refreshJobs()
        assertEquals(FieldUiState.SignedOut, viewModel.uiState.value)
    }

    @Test
    fun signOutIsBlockedWhileOfflineEvidenceIsPending() = runTest {
        var now = 1_000L
        var elapsed = 500L
        val gateway = FakeGateway()
        val access = OfflineAccessSession(
            store = FakeOfflineAccessStateStore(),
            nowEpochMillis = { now },
            elapsedRealtimeMillis = { elapsed },
        )
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            nowEpochMillis = { now },
            offlineAccessSession = access,
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        access.markLocalJobPackPresent("inspector-a")
        access.recordMutation("mutation-1", "inspector-a")

        viewModel.signOut()
        advanceUntilIdle()

        val state = viewModel.uiState.value as FieldUiState.Error
        assertEquals(
            "Finish synchronising local evidence before signing out.",
            state.message,
        )
        assertFalse(gateway.revokeCalled)
    }

    @Test
    fun tenantMismatchCannotCreateLocalSession() = runTest {
        val viewModel = viewModel(
            FakeGateway(sessionCompanyId = "company-b"),
            scope = this,
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()

        val state = viewModel.uiState.value as FieldUiState.Error
        assertEquals("Company could not be verified.", state.message)
    }

    @Test
    fun openingJobPackDownloadsItAndThenUsesCachedVersion() = runTest {
        val job = job("released")
        val gateway = FakeGateway(jobs = listOf(job))
        val store = FakeJobPackStore()
        val service = JobPackService(
            gateway = gateway,
            store = store,
            nowEpochMillis = { 1_000L },
            elapsedRealtimeMillis = { 500L },
        )
        val viewModel = viewModel(gateway, scope = this, jobPackService = service)

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()

        val downloaded = viewModel.uiState.value as FieldUiState.JobPackOpened
        assertEquals(JobPackOpenSource.DOWNLOADED, downloaded.opened.source)
        assertEquals(1, gateway.claimJobCallCount)
        assertEquals(1, gateway.downloadPackCallCount)
        assertEquals(1, downloaded.opened.stored.pack.anchors.size)

        gateway.packFailure = IllegalStateException("offline")
        viewModel.closeJobPack()
        viewModel.openJobPack(job)
        advanceUntilIdle()

        val cached = viewModel.uiState.value as FieldUiState.JobPackOpened
        assertEquals(JobPackOpenSource.CACHED, cached.opened.source)
        assertEquals(1, gateway.downloadPackCallCount)
    }

    @Test
    fun openingJobPackStopsWhenDeviceAuthenticationIsDeclined() = runTest {
        val job = job("released")
        val gateway = FakeGateway(jobs = listOf(job))
        val service = JobPackService(
            gateway = gateway,
            store = FakeJobPackStore(),
            nowEpochMillis = { 1_000L },
            elapsedRealtimeMillis = { 500L },
        )
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = service,
            deviceAuthenticationGate = DeviceAuthenticationGate { false },
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()

        val state = viewModel.uiState.value as FieldUiState.JobPackError
        assertEquals("Unlock this device to open the job pack.", state.message)
        assertTrue(state.canRetry)
        assertEquals(0, gateway.downloadPackCallCount)
    }

    @Test
    fun anchorCaptureLoadsDraftAndSavesLocally() = runTest {
        val job = job(
            "assigned",
            jobId = "job-001",
            assignment = assignment("company-a", "job-001", "inspector-a"),
        )
        val gateway = FakeGateway(jobs = listOf(job))
        val packStore = FakeJobPackStore()
        val evidenceStore = FakeEvidenceStore()
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = JobPackService(
                gateway = gateway,
                store = packStore,
                nowEpochMillis = { 1_000L },
                elapsedRealtimeMillis = { 500L },
            ),
            anchorEvidenceService = AnchorEvidenceService(
                store = evidenceStore,
                nowEpochMillis = { 2_000L },
                elapsedRealtimeMillis = { 2_000L },
            ),
            inspectionIdGenerator = { "inspection-001" },
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()
        val opened = viewModel.uiState.value as FieldUiState.JobPackOpened
        viewModel.openAnchor(opened.opened.stored.pack.anchors.single())

        val capture = viewModel.uiState.value as FieldUiState.AnchorCapture
        viewModel.updateAnchorDraft(
            capture.draft.copy(
                identityConfirmed = true,
                locationConfirmed = true,
                observations = "Recorded observation.",
            ),
        )
        viewModel.saveAnchorDraft()
        advanceUntilIdle()

        val saved = viewModel.uiState.value as FieldUiState.AnchorCapture
        assertEquals(EvidenceSaveState.SAVED_LOCALLY, saved.saveState)
        assertEquals("inspection-001", evidenceStore.drafts.single().inspectionId)
        assertEquals("Recorded observation.", evidenceStore.drafts.single().observations)
    }

    @Test
    fun newlyDiscoveredAnchorDraftCanBeSavedAndReopened() = runTest {
        val job = job(
            "assigned",
            jobId = "job-001",
            assignment = assignment("company-a", "job-001", "inspector-a"),
        )
        val gateway = FakeGateway(jobs = listOf(job))
        val evidenceStore = FakeEvidenceStore()
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = JobPackService(
                gateway = gateway,
                store = FakeJobPackStore(),
                nowEpochMillis = { 1_000L },
                elapsedRealtimeMillis = { 500L },
            ),
            anchorEvidenceService = AnchorEvidenceService(
                store = evidenceStore,
                nowEpochMillis = { 2_000L },
                elapsedRealtimeMillis = { 2_000L },
            ),
            inspectionIdGenerator = { "inspection-discovered-001" },
            provisionalAnchorIdGenerator = { "provisional-001" },
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()
        viewModel.openNewlyDiscoveredAnchor()

        val started = viewModel.uiState.value as FieldUiState.AnchorCapture
        assertEquals(null, started.anchor)
        assertEquals(
            ReconciliationProposal.NEWLY_DISCOVERED,
            started.draft.reconciliationProposal,
        )
        assertEquals("provisional-001", started.draft.provisionalAnchorId)

        viewModel.updateAnchorDraft(
            started.draft.copy(
                identityConfirmed = true,
                locationConfirmed = true,
                location = "South roof",
                observations = "Anchor observed onsite.",
                recordedOutcome = RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED,
                recommendation = "Office review of register proposal.",
            ),
        )
        viewModel.saveAnchorDraft()
        advanceUntilIdle()
        viewModel.closeAnchor()
        viewModel.closeJobPack()
        viewModel.openJobPack(job)
        advanceUntilIdle()

        val opened = viewModel.uiState.value as FieldUiState.JobPackOpened
        assertEquals(1, opened.evidence.size)
        viewModel.openEvidence(opened.evidence.single())

        val reopened = viewModel.uiState.value as FieldUiState.AnchorCapture
        assertEquals(null, reopened.anchor)
        assertEquals("South roof", reopened.draft.location)
        assertEquals(
            "Anchor observed onsite.",
            reopened.draft.observations,
        )
    }

    @Test
    fun anchorCaptureRejectsDraftRetargetedToAnotherAnchor() = runTest {
        val job = job(
            "assigned",
            jobId = "job-001",
            assignment = assignment("company-a", "job-001", "inspector-a"),
        )
        val gateway = FakeGateway(jobs = listOf(job))
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = JobPackService(
                gateway = gateway,
                store = FakeJobPackStore(),
                nowEpochMillis = { 1_000L },
                elapsedRealtimeMillis = { 500L },
            ),
            anchorEvidenceService = AnchorEvidenceService(
                store = FakeEvidenceStore(),
                nowEpochMillis = { 2_000L },
                elapsedRealtimeMillis = { 2_000L },
            ),
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()
        val opened = viewModel.uiState.value as FieldUiState.JobPackOpened
        viewModel.openAnchor(opened.opened.stored.pack.anchors.single())
        val capture = viewModel.uiState.value as FieldUiState.AnchorCapture

        viewModel.updateAnchorDraft(capture.draft.copy(expectedAnchorId = "another-anchor"))

        val rejected = viewModel.uiState.value as FieldUiState.AnchorCapture
        assertEquals(capture.draft, rejected.draft)
        assertEquals(EvidenceSaveState.FAILED, rejected.saveState)
        assertEquals(
            "Evidence must remain associated with the opened anchor.",
            rejected.saveError,
        )
    }

    @Test
    fun capturedPhotoIsBoundToCurrentInspectionAndSavedLocally() = runTest {
        val job = job(
            "assigned",
            jobId = "job-001",
            assignment = assignment("company-a", "job-001", "inspector-a"),
        )
        val gateway = FakeGateway(jobs = listOf(job))
        val evidenceStore = FakeEvidenceStore()
        var scheduledPhotoUploads = 0
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = JobPackService(
                gateway = gateway,
                store = FakeJobPackStore(),
                nowEpochMillis = { 1_000L },
                elapsedRealtimeMillis = { 500L },
            ),
            anchorEvidenceService = AnchorEvidenceService(
                store = evidenceStore,
                nowEpochMillis = { 2_000L },
                elapsedRealtimeMillis = { 2_000L },
            ),
            schedulePhotoUpload = { scheduledPhotoUploads += 1 },
            inspectionIdGenerator = { "inspection-001" },
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()
        viewModel.openAnchor(
            (viewModel.uiState.value as FieldUiState.JobPackOpened)
                .opened.stored.pack.anchors.single(),
        )

        viewModel.attachCapturedPhoto(
            CapturedAnchorPhoto(
                companyId = "company-a",
                jobId = "job-001",
                inspectionId = "inspection-001",
                localId = "photo-001",
                storageReference = "anchor-photos/photo-001.jpg",
                capturedAtEpochMillis = 2_100L,
                checksum = "sha256-photo-001",
                contentType = "image/jpeg",
            ),
        )
        advanceUntilIdle()

        assertEquals(
            EvidenceSaveState.SAVED_LOCALLY,
            (viewModel.uiState.value as FieldUiState.AnchorCapture).saveState,
        )
        assertEquals("photo-001", evidenceStore.drafts.single().photos.single().localId)
        assertEquals(
            "inspection-001",
            evidenceStore.drafts.single().photos.single().anchorInspectionId,
        )
        assertEquals(1, scheduledPhotoUploads)
    }

    @Test
    fun submissionReviewKeepsCaptureBlockersSeparateAndDoesNotQueue() = runTest {
        val job = job(
            "assigned",
            jobId = "job-001",
            assignment = assignment("company-a", "job-001", "inspector-a"),
        )
        val gateway = FakeGateway(jobs = listOf(job))
        val evidenceStore = FakeEvidenceStore()
        val evidenceService = AnchorEvidenceService(
            store = evidenceStore,
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = JobPackService(
                gateway = gateway,
                store = FakeJobPackStore(),
                nowEpochMillis = { 1_000L },
                elapsedRealtimeMillis = { 500L },
            ),
            anchorEvidenceService = evidenceService,
            submissionService = AnchorSubmissionService(
                evidenceService = evidenceService,
                store = evidenceStore,
                nowEpochMillis = { 2_000L },
                submissionIdGenerator = { "submission-001" },
                mutationIdGenerator = { "mutation-001" },
            ),
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()
        viewModel.openSubmissionReview()
        advanceUntilIdle()

        val review = viewModel.uiState.value as FieldUiState.SubmissionReview
        assertFalse(review.review.readiness.isReadyForQueue)
        assertTrue(
            review.review.readiness.blockers.any {
                it.code.name == "MISSING_EXPECTED_ANCHOR_COVERAGE"
            },
        )

        viewModel.queueSubmission()
        advanceUntilIdle()

        val stillBlocked = viewModel.uiState.value as FieldUiState.SubmissionReview
        assertNull(stillBlocked.review.intent)
        assertFalse(stillBlocked.isQueueing)
        assertNull(stillBlocked.queueError)
    }

    @Test
    fun readySubmissionQueuesLocallyAndQueuedEvidenceCannotReopenCapture() = runTest {
        val job = job(
            "assigned",
            jobId = "job-001",
            assignment = assignment("company-a", "job-001", "inspector-a"),
        )
        val gateway = FakeGateway(jobs = listOf(job))
        val evidenceStore = FakeEvidenceStore()
        evidenceStore.drafts += AnchorInspectionDraft(
            companyId = "company-a",
            jobId = "job-001",
            jobPackVersion = 3L,
            inspectionId = "inspection-001",
            expectedAnchorId = "anchor-job-001",
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = InspectionExceptionReason.INACCESSIBLE,
            createdAtEpochMillis = 1_000L,
        )
        val evidenceService = AnchorEvidenceService(
            store = evidenceStore,
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        var scheduledSyncCount = 0
        val viewModel = viewModel(
            gateway = gateway,
            scope = this,
            jobPackService = JobPackService(
                gateway = gateway,
                store = FakeJobPackStore(),
                nowEpochMillis = { 1_000L },
                elapsedRealtimeMillis = { 500L },
            ),
            anchorEvidenceService = evidenceService,
            submissionService = AnchorSubmissionService(
                evidenceService = evidenceService,
                store = evidenceStore,
                nowEpochMillis = { 2_000L },
                submissionIdGenerator = { "submission-001" },
                mutationIdGenerator = { "mutation-001" },
            ),
            scheduleMutationSync = {
                scheduledSyncCount += 1
                error("scheduler unavailable")
            },
        )

        viewModel.signIn("company-a")
        advanceUntilIdle()
        viewModel.openJobPack(job)
        advanceUntilIdle()
        viewModel.openSubmissionReview()
        advanceUntilIdle()
        viewModel.queueSubmission()
        advanceUntilIdle()

        val queued = viewModel.uiState.value as FieldUiState.SubmissionReview
        assertNotNull(queued.review.intent)
        assertEquals(EvidenceSyncState.PENDING, queued.review.intent?.syncState)
        assertEquals("submission-001", evidenceStore.drafts.single().submissionId)
        assertEquals(1, scheduledSyncCount)

        viewModel.closeSubmissionReview()
        val opened = viewModel.uiState.value as FieldUiState.JobPackOpened
        viewModel.openAnchor(opened.opened.stored.pack.anchors.single())
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is FieldUiState.SubmissionReview)
    }

    private fun viewModel(
        gateway: FakeGateway,
        scope: CoroutineScope,
        jobPackService: JobPackService? = null,
        anchorEvidenceService: AnchorEvidenceService? = null,
        submissionService: AnchorSubmissionService? = null,
        offlineAccessSession: OfflineAccessSession? = null,
        scheduleMutationSync: () -> Unit = {},
        schedulePhotoUpload: () -> Unit = {},
        nowEpochMillis: () -> Long = { 1_000L },
        deviceAuthenticationGate: DeviceAuthenticationGate =
            DeviceAuthenticationGate { true },
        inspectionIdGenerator: () -> String = { "inspection-generated" },
        provisionalAnchorIdGenerator: () -> String = { "provisional-generated" },
    ) = FieldViewModel(
        gateway = gateway,
        providerAccessTokenSource = ProviderAccessTokenSource { "provider-token" },
        scope = scope,
        nowEpochMillis = nowEpochMillis,
        jobPackService = jobPackService,
        anchorEvidenceService = anchorEvidenceService,
        submissionService = submissionService,
        offlineAccessSession = offlineAccessSession,
        scheduleMutationSync = scheduleMutationSync,
        schedulePhotoUpload = schedulePhotoUpload,
        deviceAuthenticationGate = deviceAuthenticationGate,
        inspectionIdGenerator = inspectionIdGenerator,
        provisionalAnchorIdGenerator = provisionalAnchorIdGenerator,
    )

    private class FakeEvidenceStore : AnchorEvidenceSubmissionStore {
        val drafts = mutableListOf<AnchorInspectionDraft>()
        var submission: InspectionSubmissionIntent? = null

        override suspend fun loadEvidence(
            companyId: String,
            jobId: String,
            jobPackVersion: Long,
        ): List<AnchorInspectionDraft> = drafts.filter {
            it.companyId == companyId &&
                it.jobId == jobId &&
                it.jobPackVersion == jobPackVersion
        }

        override suspend fun saveEvidence(draft: AnchorInspectionDraft) {
            drafts.removeIf {
                it.companyId == draft.companyId &&
                    it.jobId == draft.jobId &&
                    it.jobPackVersion == draft.jobPackVersion &&
                    it.inspectionId == draft.inspectionId
            }
            drafts += draft
        }

        override suspend fun loadSubmission(
            companyId: String,
            jobId: String,
            jobPackVersion: Long,
        ): InspectionSubmissionIntent? = submission?.takeIf {
            it.companyId == companyId &&
                it.jobId == jobId &&
                it.jobPackVersion == jobPackVersion
        }

        override suspend fun queueSubmission(
            intent: InspectionSubmissionIntent,
            frozenEvidence: List<AnchorInspectionDraft>,
            mutation: SyncMutation,
        ): InspectionSubmissionIntent {
            submission?.let { return it }
            submission = intent
            drafts.removeAll {
                it.companyId == intent.companyId &&
                    it.jobId == intent.jobId &&
                    it.jobPackVersion == intent.jobPackVersion
            }
            drafts += frozenEvidence
            return intent
        }
    }

    private class FakeOfflineAccessStateStore : OfflineAccessStateStore {
        var state: FieldOfflineAccessState? = null

        override suspend fun loadOfflineAccessState(
            companyId: String,
            userId: String,
        ): FieldOfflineAccessState? = state?.takeIf {
            it.companyId == companyId && it.userId == userId
        }

        override suspend fun saveOfflineAccessState(state: FieldOfflineAccessState) {
            this.state = state
        }
    }

    private class FakeGateway(
        private val jobs: List<InspectorJob> = emptyList(),
        private val failure: Throwable? = null,
        private val sessionCompanyId: String = "company-a",
        private val sessionRole: ProductRole = ProductRole.INSPECTOR,
        private val sessionExpiresAtEpochMillis: Long = 10_000L,
    ) : FieldGateway, JobPackGateway {
        var listJobsCalled = false
        var listJobsCallCount = 0
        var packFailure: Throwable? = null
        var claimJobCallCount = 0
        var downloadPackCallCount = 0
        private val claimedJobIds = mutableSetOf<String>()
        var revokeCalled = false
        var clearSessionCallCount = 0

        override suspend fun createSession(
            companyId: String,
            providerAccessToken: String,
        ): FieldSession = FieldSession(
            accessToken = "session-token",
            companyId = sessionCompanyId,
            sessionId = "session-id",
            userId = "inspector-a",
            email = "inspector-a@example.test",
            role = sessionRole,
            mfaSatisfied = false,
            expiresAtEpochMillis = sessionExpiresAtEpochMillis,
        )

        override suspend fun listAuthorizedJobs(session: FieldSession): List<InspectorJob> {
            listJobsCalled = true
            listJobsCallCount += 1
            failure?.let { throw it }
            return jobs
        }

        override suspend fun claimJob(
            session: FieldSession,
            jobId: String,
        ): InspectorJob {
            claimJobCallCount += 1
            val selectedJob = jobs.single { it.jobId == jobId }
            claimedJobIds += jobId
            return selectedJob.copy(
                workflowStatus = "assigned",
                assignment = InspectorAssignment(
                    companyId = session.companyId,
                    assignmentId = "assignment-$jobId",
                    jobId = jobId,
                    inspectorUserId = session.userId,
                    assignedByUserId = null,
                    assignmentType = "claimed",
                    isPrimary = true,
                    assignedAtEpochMillis = 1L,
                    claimedAtEpochMillis = 1L,
                ),
            )
        }

        override suspend fun downloadJobPack(
            session: FieldSession,
            jobId: String,
        ): FieldJobPack {
            downloadPackCallCount += 1
            packFailure?.let { throw it }
            val selectedJob = jobs.single { it.jobId == jobId }
            val workflowStatus = if (jobId in claimedJobIds) "assigned" else selectedJob.workflowStatus
            return FieldJobPack(
                companyId = selectedJob.companyId,
                jobId = selectedJob.jobId,
                siteId = selectedJob.siteId,
                jurisdiction = selectedJob.jurisdiction,
                reference = selectedJob.reference,
                plannedDate = selectedJob.plannedDate,
                workflowStatus = workflowStatus,
                jobPackVersion = selectedJob.jobPackVersion,
                siteName = "Site ${selectedJob.siteId}",
                siteAddress = "1 Example Street",
                siteReference = null,
                accessNotes = null,
                anchors = listOf(
                    au.com.heightsafety.domain.JobPackAnchor(
                        companyId = selectedJob.companyId,
                        anchorId = "anchor-${selectedJob.jobId}",
                        siteId = selectedJob.siteId,
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
        }

        override suspend fun revokeSession(session: FieldSession) {
            revokeCalled = true
        }

        override fun clearSession() {
            clearSessionCallCount += 1
        }
    }

    private class FakeJobPackStore : FieldJobPackStore {
        var stored: StoredJobPack? = null

        override suspend fun save(
            pack: FieldJobPack,
            lease: OfflineAuthorizationLease,
            downloadedAtEpochMillis: Long,
        ) {
            stored = StoredJobPack(pack, lease)
        }

        override suspend fun load(companyId: String, jobId: String): StoredJobPack? =
            stored?.takeIf { it.pack.companyId == companyId && it.pack.jobId == jobId }

        override suspend fun updateLease(lease: OfflineAuthorizationLease) {
            stored = stored!!.copy(lease = lease)
        }
    }

    private fun job(
        status: String,
        companyId: String = "company-a",
        jobId: String = "job-a",
        assignment: InspectorAssignment? = null,
    ) = InspectorJob(
        companyId = companyId,
        jobId = jobId,
        siteId = "site-$jobId",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "Reference $jobId",
        plannedDate = "2026-09-15",
        workflowStatus = status,
        jobPackVersion = 3L,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = assignment,
    )

    private fun assignment(
        companyId: String,
        jobId: String,
        inspectorUserId: String,
    ) = InspectorAssignment(
        companyId = companyId,
        assignmentId = "assignment-$jobId",
        jobId = jobId,
        inspectorUserId = inspectorUserId,
        assignedByUserId = "office-a",
        assignmentType = "assigned",
        isPrimary = true,
        assignedAtEpochMillis = 1L,
        claimedAtEpochMillis = null,
    )
}
