package au.com.heightsafety.app

import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.ProviderAccessTokenSource
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
        val viewModel = viewModel(gateway, scope = this) { now }

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

    private fun viewModel(
        gateway: FakeGateway,
        scope: CoroutineScope,
        nowEpochMillis: () -> Long = { 1_000L },
    ) = FieldViewModel(
        gateway = gateway,
        providerAccessTokenSource = ProviderAccessTokenSource { "provider-token" },
        scope = scope,
        nowEpochMillis = nowEpochMillis,
    )

    private class FakeGateway(
        private val jobs: List<InspectorJob> = emptyList(),
        private val failure: Throwable? = null,
        private val sessionCompanyId: String = "company-a",
        private val sessionRole: ProductRole = ProductRole.INSPECTOR,
        private val sessionExpiresAtEpochMillis: Long = 10_000L,
    ) : FieldGateway {
        var listJobsCalled = false
        var listJobsCallCount = 0
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

        override suspend fun revokeSession(session: FieldSession) {
            revokeCalled = true
        }

        override fun clearSession() {
            clearSessionCallCount += 1
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
