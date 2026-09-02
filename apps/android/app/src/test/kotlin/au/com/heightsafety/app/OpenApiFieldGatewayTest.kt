package au.com.heightsafety.app

import au.com.heightsafety.api.apis.IdentityApi
import au.com.heightsafety.api.apis.JobWorkflowApi
import au.com.heightsafety.api.models.AcceptInvitationDto
import au.com.heightsafety.api.models.AssignJobDto
import au.com.heightsafety.api.models.AuthMeResponseDto
import au.com.heightsafety.api.models.AuthUserResponseDto
import au.com.heightsafety.api.models.CreateInvitationDto
import au.com.heightsafety.api.models.CreateJobDto
import au.com.heightsafety.api.models.JobAssignmentResponseDto
import au.com.heightsafety.api.models.JobResponseDto
import au.com.heightsafety.api.models.InvitationResponseDto
import au.com.heightsafety.api.models.ProviderAccessTokenDto
import au.com.heightsafety.api.models.SessionResponseDto
import au.com.heightsafety.api.models.SessionRevokedResponseDto
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.ProductRole
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

class OpenApiFieldGatewayTest {
    @Test
    fun createSessionVerifiesCurrentCompanyAndRole() = runTest {
        val identityApi = FakeIdentityApi(
            sessionResponse = Response.success(sessionResponse()),
            currentResponse = Response.success(currentAuthResponse()),
        )
        val bearerTokens = mutableListOf<String>()
        val gateway = OpenApiFieldGateway(
            identityApi = identityApi,
            jobWorkflowApi = FakeJobWorkflowApi(Response.success(emptyList())),
            bearerTokenSink = bearerTokens::add,
        )

        val session = gateway.createSession("company-a", "provider-token")

        assertEquals("company-a", session.companyId)
        assertEquals("session-a", session.sessionId)
        assertEquals("inspector-a", session.userId)
        assertEquals(ProductRole.INSPECTOR, session.role)
        assertEquals(2_000L, session.expiresAtEpochMillis)
        assertEquals(listOf("session-token"), bearerTokens)
        assertEquals("company-a", identityApi.currentAuthCompanyId)
    }

    @Test
    fun listJobsMapsAndPreservesAuthoritativeFields() = runTest {
        val gateway = OpenApiFieldGateway(
            identityApi = FakeIdentityApi(
                sessionResponse = Response.success(sessionResponse()),
                currentResponse = Response.success(currentAuthResponse()),
            ),
            jobWorkflowApi = FakeJobWorkflowApi(Response.success(listOf(jobResponse()))),
            bearerTokenSink = {},
        )

        val jobs = gateway.listAuthorizedJobs(fieldSession())

        val job = jobs.single()
        assertEquals("company-a", job.companyId)
        assertEquals("job-a", job.jobId)
        assertEquals("site-a", job.siteId)
        assertEquals("QLD", job.jurisdiction.value)
        assertEquals("JOB-001", job.reference)
        assertEquals("in_progress", job.workflowStatus)
        assertEquals(7L, job.jobPackVersion)
        assertEquals("2026-09-15", job.plannedDate)
        assertEquals("inspector-a", job.assignment?.inspectorUserId)
        assertEquals("claimed", job.assignment?.assignmentType)
    }

    @Test
    fun revokeSessionClearsTheAdapterToken() = runTest {
        val bearerTokens = mutableListOf<String>()
        val gateway = OpenApiFieldGateway(
            identityApi = FakeIdentityApi(
                sessionResponse = Response.success(sessionResponse()),
                currentResponse = Response.success(currentAuthResponse()),
            ),
            jobWorkflowApi = FakeJobWorkflowApi(Response.success(emptyList())),
            bearerTokenSink = bearerTokens::add,
        )

        gateway.revokeSession(fieldSession())

        assertEquals(listOf("session-token", ""), bearerTokens)
    }

    @Test
    fun mismatchedSessionCompanyFailsClosed() = runTest {
        val gateway = OpenApiFieldGateway(
            identityApi = FakeIdentityApi(
                sessionResponse = Response.success(sessionResponse(companyId = "company-b")),
                currentResponse = Response.success(currentAuthResponse()),
            ),
            jobWorkflowApi = FakeJobWorkflowApi(Response.success(emptyList())),
            bearerTokenSink = {},
        )

        val error = try {
            gateway.createSession("company-a", "provider-token")
            error("expected tenant mismatch")
        } catch (expected: FieldGatewayException) {
            expected
        }

        assertEquals(GatewayFailureReason.TENANT_MISMATCH, error.reason)
        assertTrue(error.message!!.contains("company"))
    }

    private class FakeIdentityApi(
        private val sessionResponse: Response<SessionResponseDto>,
        private val currentResponse: Response<AuthMeResponseDto>,
    ) : IdentityApi {
        var currentAuthCompanyId: String? = null

        override suspend fun acceptInvitation(
            xCompanyId: String,
            acceptInvitationDto: AcceptInvitationDto,
        ): Response<SessionResponseDto> = error("unused")

        override suspend fun createInvitation(
            xCompanyId: String,
            createInvitationDto: CreateInvitationDto,
        ): Response<InvitationResponseDto> = error("unused")

        override suspend fun createSession(
            xCompanyId: String,
            providerAccessTokenDto: ProviderAccessTokenDto,
        ): Response<SessionResponseDto> = sessionResponse

        override suspend fun getCurrentAuth(xCompanyId: String): Response<AuthMeResponseDto> {
            currentAuthCompanyId = xCompanyId
            return currentResponse
        }

        override suspend fun revokeCurrentSession(xCompanyId: String): Response<SessionRevokedResponseDto> =
            Response.success(SessionRevokedResponseDto(revoked = true))
    }

    private class FakeJobWorkflowApi(
        private val listResponse: Response<List<JobResponseDto>>,
    ) : JobWorkflowApi {
        override suspend fun assignJob(
            xCompanyId: String,
            jobId: String,
            assignJobDto: AssignJobDto,
        ): Response<JobResponseDto> = error("unused")

        override suspend fun claimJob(
            xCompanyId: String,
            jobId: String,
        ): Response<JobResponseDto> = error("unused")

        override suspend fun createJob(
            xCompanyId: String,
            createJobDto: CreateJobDto,
        ): Response<JobResponseDto> = error("unused")

        override suspend fun getJob(
            xCompanyId: String,
            jobId: String,
        ): Response<JobResponseDto> = error("unused")

        override suspend fun listJobs(xCompanyId: String): Response<List<JobResponseDto>> = listResponse

        override suspend fun releaseJob(
            xCompanyId: String,
            jobId: String,
        ): Response<JobResponseDto> = error("unused")
    }

    private fun sessionResponse(companyId: String = "company-a") = SessionResponseDto(
        accessToken = "session-token",
        companyId = companyId,
        expiresAt = timestamp(2_000L),
        user = AuthUserResponseDto(
            email = "inspector-a@example.test",
            role = AuthUserResponseDto.Role.inspector,
            userId = "inspector-a",
        ),
    )

    private fun currentAuthResponse() = AuthMeResponseDto(
        companyId = "company-a",
        email = "inspector-a@example.test",
        mfaSatisfied = false,
        role = AuthMeResponseDto.Role.inspector,
        sessionExpiresAt = timestamp(2_000L),
        sessionId = "session-a",
        userId = "inspector-a",
    )

    private fun jobResponse() = JobResponseDto(
        companyId = "company-a",
        createdAt = timestamp(1_000L),
        jobId = "job-a",
        jobPackVersion = BigDecimal.valueOf(7L),
        jurisdiction = JobResponseDto.Jurisdiction.QLD,
        reference = "JOB-001",
        siteId = "site-a",
        updatedAt = timestamp(1_500L),
        workflowStatus = JobResponseDto.WorkflowStatus.in_progress,
        assignment = JobAssignmentResponseDto(
            assignedAt = timestamp(1_100L),
            assignmentId = "assignment-a",
            assignmentType = JobAssignmentResponseDto.AssignmentType.claimed,
            companyId = "company-a",
            inspectorUserId = "inspector-a",
            isPrimary = true,
            jobId = "job-a",
            assignedByUserId = null,
            claimedAt = timestamp(1_200L),
        ),
        plannedDate = LocalDate.parse("2026-09-15"),
    )

    private fun fieldSession() = FieldSession(
        accessToken = "session-token",
        companyId = "company-a",
        sessionId = "session-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
        mfaSatisfied = false,
        expiresAtEpochMillis = 10_000L,
    )

    private fun timestamp(epochMillis: Long): OffsetDateTime =
        OffsetDateTime.parse(
            when (epochMillis) {
                1_000L -> "1970-01-01T00:00:01Z"
                1_100L -> "1970-01-01T00:00:01.100Z"
                1_200L -> "1970-01-01T00:00:01.200Z"
                1_500L -> "1970-01-01T00:00:01.500Z"
                2_000L -> "1970-01-01T00:00:02Z"
                else -> error("unexpected test timestamp")
            },
        )
}
