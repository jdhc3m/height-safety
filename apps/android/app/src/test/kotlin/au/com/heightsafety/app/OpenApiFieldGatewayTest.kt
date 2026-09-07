package au.com.heightsafety.app

import au.com.heightsafety.api.apis.IdentityApi
import au.com.heightsafety.api.apis.JobWorkflowApi
import au.com.heightsafety.api.models.AcceptInvitationDto
import au.com.heightsafety.api.models.AssignJobDto
import au.com.heightsafety.api.models.AuthMeResponseDto
import au.com.heightsafety.api.models.AuthUserResponseDto
import au.com.heightsafety.api.models.AnchorResponseDto
import au.com.heightsafety.api.models.CreateInvitationDto
import au.com.heightsafety.api.models.CreateJobDto
import au.com.heightsafety.api.models.JobAssignmentResponseDto
import au.com.heightsafety.api.models.JobResponseDto
import au.com.heightsafety.api.models.InvitationResponseDto
import au.com.heightsafety.api.models.JobPackResponseDto
import au.com.heightsafety.api.models.ProviderAccessTokenDto
import au.com.heightsafety.api.models.SessionResponseDto
import au.com.heightsafety.api.models.SessionRevokedResponseDto
import au.com.heightsafety.api.models.SiteResponseDto
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
    fun restoreSessionRevalidatesMembershipAndRefreshesServerFields() = runTest {
        val identityApi = FakeIdentityApi(
            sessionResponse = Response.success(sessionResponse()),
            currentResponse = Response.success(currentAuthResponse().copy(mfaSatisfied = true)),
        )
        val bearerTokens = mutableListOf<String>()
        val gateway = OpenApiFieldGateway(
            identityApi = identityApi,
            jobWorkflowApi = FakeJobWorkflowApi(Response.success(emptyList())),
            bearerTokenSink = bearerTokens::add,
        )

        val restored = gateway.restoreSession(fieldSession())

        assertEquals(fieldSession().copy(mfaSatisfied = true, expiresAtEpochMillis = 2_000L), restored)
        assertEquals("company-a", identityApi.currentAuthCompanyId)
        assertEquals(listOf("session-token"), bearerTokens)
    }

    @Test
    fun restoreSessionRejectsChangedMembership() = runTest {
        val gateway = OpenApiFieldGateway(
            identityApi = FakeIdentityApi(
                sessionResponse = Response.success(sessionResponse()),
                currentResponse = Response.success(currentAuthResponse().copy(sessionId = "other-session")),
            ),
            jobWorkflowApi = FakeJobWorkflowApi(Response.success(emptyList())),
            bearerTokenSink = {},
        )

        val error = try {
            gateway.restoreSession(fieldSession())
            error("expected membership mismatch")
        } catch (expected: FieldGatewayException) {
            expected
        }

        assertEquals(GatewayFailureReason.TENANT_MISMATCH, error.reason)
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
    fun downloadJobPackMapsSiteAndAnchorRegister() = runTest {
        val gateway = OpenApiFieldGateway(
            identityApi = FakeIdentityApi(
                sessionResponse = Response.success(sessionResponse()),
                currentResponse = Response.success(currentAuthResponse()),
            ),
            jobWorkflowApi = FakeJobWorkflowApi(
                listResponse = Response.success(emptyList()),
                packResponse = Response.success(jobPackResponse()),
            ),
            bearerTokenSink = {},
        )

        val pack = gateway.downloadJobPack(fieldSession(), "job-a")

        assertEquals("company-a", pack.companyId)
        assertEquals("job-a", pack.jobId)
        assertEquals("QLD", pack.jurisdiction.value)
        assertEquals(7L, pack.jobPackVersion)
        assertEquals("Site A", pack.siteName)
        assertEquals("A-001", pack.anchors.single().registerId)
        assertEquals("single_point", pack.anchors.single().anchorType)
    }

    @Test
    fun claimJobMapsTheServerAssignment() = runTest {
        val gateway = OpenApiFieldGateway(
            identityApi = FakeIdentityApi(
                sessionResponse = Response.success(sessionResponse()),
                currentResponse = Response.success(currentAuthResponse()),
            ),
            jobWorkflowApi = FakeJobWorkflowApi(
                listResponse = Response.success(emptyList()),
                claimResponse = Response.success(jobResponse()),
            ),
            bearerTokenSink = {},
        )

        val claimed = gateway.claimJob(fieldSession(), "job-a")

        assertEquals("job-a", claimed.jobId)
        assertEquals("inspector-a", claimed.assignment?.inspectorUserId)
        assertEquals("claimed", claimed.assignment?.assignmentType)
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
        private val packResponse: Response<JobPackResponseDto>? = null,
        private val claimResponse: Response<JobResponseDto>? = null,
    ) : JobWorkflowApi {
        override suspend fun assignJob(
            xCompanyId: String,
            jobId: String,
            assignJobDto: AssignJobDto,
        ): Response<JobResponseDto> = error("unused")

        override suspend fun claimJob(
            xCompanyId: String,
            jobId: String,
        ): Response<JobResponseDto> = claimResponse ?: error("unused")

        override suspend fun createJob(
            xCompanyId: String,
            createJobDto: CreateJobDto,
        ): Response<JobResponseDto> = error("unused")

        override suspend fun downloadJobPack(
            xCompanyId: String,
            jobId: String,
        ): Response<JobPackResponseDto> = packResponse ?: error("unused")

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

    private fun jobPackResponse() = JobPackResponseDto(
        anchors = listOf(
            AnchorResponseDto(
                anchorId = "anchor-a",
                anchorType = AnchorResponseDto.AnchorType.single_point,
                companyId = "company-a",
                createdAt = timestamp(1_000L),
                registerStatus = AnchorResponseDto.RegisterStatus.active,
                siteId = "site-a",
                updatedAt = timestamp(1_500L),
                label = "A-001",
                location = "North roof",
                registerId = "A-001",
            ),
        ),
        job = jobResponse(),
        site = SiteResponseDto(
            clientId = "client-a",
            companyId = "company-a",
            createdAt = timestamp(1_000L),
            jurisdiction = SiteResponseDto.Jurisdiction.QLD,
            name = "Site A",
            siteId = "site-a",
            updatedAt = timestamp(1_500L),
            accessNotes = "North access",
            address = "1 Example Street",
            siteReference = "SITE-A",
        ),
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
