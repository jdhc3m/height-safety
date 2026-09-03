package au.com.heightsafety.app

import au.com.heightsafety.domain.AnchorEvidenceService
import au.com.heightsafety.domain.AnchorEvidenceStore
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldJobPackStore
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackGateway
import au.com.heightsafety.domain.JobPackOpenSource
import au.com.heightsafety.domain.JobPackService
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.ProviderAccessTokenSource
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
            anchorEvidenceService = AnchorEvidenceService(evidenceStore) { 2_000L },
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

    private fun viewModel(
        gateway: FakeGateway,
        scope: CoroutineScope,
        jobPackService: JobPackService? = null,
        anchorEvidenceService: AnchorEvidenceService? = null,
        nowEpochMillis: () -> Long = { 1_000L },
        deviceAuthenticationGate: DeviceAuthenticationGate =
            DeviceAuthenticationGate { true },
        inspectionIdGenerator: () -> String = { "inspection-generated" },
    ) = FieldViewModel(
        gateway = gateway,
        providerAccessTokenSource = ProviderAccessTokenSource { "provider-token" },
        scope = scope,
        nowEpochMillis = nowEpochMillis,
        jobPackService = jobPackService,
        anchorEvidenceService = anchorEvidenceService,
        deviceAuthenticationGate = deviceAuthenticationGate,
        inspectionIdGenerator = inspectionIdGenerator,
    )

    private class FakeEvidenceStore : AnchorEvidenceStore {
        val drafts = mutableListOf<AnchorInspectionDraft>()

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
            drafts.removeIf { it.inspectionId == draft.inspectionId }
            drafts += draft
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
