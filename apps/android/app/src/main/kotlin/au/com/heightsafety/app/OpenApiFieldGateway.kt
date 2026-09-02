package au.com.heightsafety.app

import au.com.heightsafety.api.apis.IdentityApi
import au.com.heightsafety.api.apis.JobWorkflowApi
import au.com.heightsafety.api.infrastructure.ApiClient
import au.com.heightsafety.api.models.AuthMeResponseDto
import au.com.heightsafety.api.models.AuthUserResponseDto
import au.com.heightsafety.api.models.JobAssignmentResponseDto
import au.com.heightsafety.api.models.JobResponseDto
import au.com.heightsafety.api.models.ProviderAccessTokenDto
import au.com.heightsafety.api.models.SessionResponseDto
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldAuthorizationException
import au.com.heightsafety.domain.FieldGatewayException
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.GatewayFailureReason
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.requireInspectorSession
import au.com.heightsafety.domain.SupportedJurisdiction
import java.io.IOException
import java.util.concurrent.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.Response

/** Maps the generated OpenAPI client at the Android adapter boundary. */
class OpenApiFieldGateway(
    private val identityApi: IdentityApi,
    private val jobWorkflowApi: JobWorkflowApi,
    private val bearerTokenSink: (String) -> Unit,
) : FieldGateway {
    private val apiMutex = Mutex()

    constructor(apiClient: ApiClient) : this(
        identityApi = apiClient.createService(IdentityApi::class.java),
        jobWorkflowApi = apiClient.createService(JobWorkflowApi::class.java),
        bearerTokenSink = apiClient::setBearerToken,
    )

    override suspend fun createSession(
        companyId: String,
        providerAccessToken: String,
    ): FieldSession = apiMutex.withLock {
        guardedCall("create session") {
            if (companyId.isBlank() || providerAccessToken.isBlank()) {
                throw FieldGatewayException(
                    GatewayFailureReason.INVALID_RESPONSE,
                    "session input is invalid",
                )
            }

            val created = requireBody(
                identityApi.createSession(
                    xCompanyId = companyId,
                    providerAccessTokenDto = ProviderAccessTokenDto(providerAccessToken),
                ),
                "create session",
            )
            if (created.companyId != companyId || created.user.userId.isBlank()) {
                throw FieldGatewayException(
                    GatewayFailureReason.TENANT_MISMATCH,
                    "session company does not match requested company",
                )
            }

            bearerTokenSink(created.accessToken)
            val current = requireBody(
                identityApi.getCurrentAuth(companyId),
                "verify session",
            )
            if (
                current.companyId != companyId ||
                current.userId != created.user.userId ||
                current.email != created.user.email ||
                current.role.toDomainRole() != created.user.role.toDomainRole()
            ) {
                throw FieldGatewayException(
                    GatewayFailureReason.TENANT_MISMATCH,
                    "current session membership does not match sign-in",
                )
            }

            FieldSession(
                accessToken = created.accessToken,
                companyId = current.companyId,
                sessionId = current.sessionId,
                userId = current.userId,
                email = current.email,
                role = current.role.toDomainRole(),
                mfaSatisfied = current.mfaSatisfied,
                expiresAtEpochMillis = current.sessionExpiresAt.toInstant().toEpochMilli(),
            )
        }
    }

    override suspend fun listAuthorizedJobs(session: FieldSession): List<InspectorJob> =
        apiMutex.withLock {
            guardedCall("list jobs") {
                requireInspectorSession(session)
                bearerTokenSink(session.accessToken)
                requireBody(
                    jobWorkflowApi.listJobs(session.companyId),
                    "list jobs",
                ).map(JobResponseDto::toDomainJob)
            }
        }

    override suspend fun revokeSession(session: FieldSession) {
        apiMutex.withLock {
            try {
                guardedCall("revoke session") {
                    bearerTokenSink(session.accessToken)
                    requireBody(
                        identityApi.revokeCurrentSession(session.companyId),
                        "revoke session",
                    )
                }
            } finally {
                clearSession()
            }
        }
    }

    override fun clearSession() {
        bearerTokenSink("")
    }

    private suspend fun <T> guardedCall(
        operation: String,
        block: suspend () -> T,
    ): T = try {
        block()
    } catch (error: CancellationException) {
        throw error
    } catch (error: FieldGatewayException) {
        throw error
    } catch (error: FieldAuthorizationException) {
        throw error
    } catch (error: IOException) {
        throw FieldGatewayException(
            GatewayFailureReason.NETWORK,
            "$operation could not reach the server",
        )
    } catch (_: Throwable) {
        throw FieldGatewayException(
            GatewayFailureReason.INVALID_RESPONSE,
            "$operation returned an invalid response",
        )
    }

    private fun <T> requireBody(response: Response<T>, operation: String): T {
        if (response.isSuccessful) {
            return response.body() ?: throw FieldGatewayException(
                GatewayFailureReason.INVALID_RESPONSE,
                "$operation returned no response body",
            )
        }

        val reason = when (response.code()) {
            401 -> GatewayFailureReason.UNAUTHENTICATED
            403 -> GatewayFailureReason.FORBIDDEN
            in 500..599 -> GatewayFailureReason.UNAVAILABLE
            else -> GatewayFailureReason.UNKNOWN
        }
        throw FieldGatewayException(reason, "$operation failed")
    }
}

private fun AuthMeResponseDto.Role.toDomainRole(): ProductRole = when (this) {
    AuthMeResponseDto.Role.administrator -> ProductRole.ADMINISTRATOR
    AuthMeResponseDto.Role.office_reviewer -> ProductRole.OFFICE_REVIEWER
    AuthMeResponseDto.Role.inspector -> ProductRole.INSPECTOR
}

private fun AuthUserResponseDto.Role.toDomainRole(): ProductRole = when (this) {
    AuthUserResponseDto.Role.administrator -> ProductRole.ADMINISTRATOR
    AuthUserResponseDto.Role.office_reviewer -> ProductRole.OFFICE_REVIEWER
    AuthUserResponseDto.Role.inspector -> ProductRole.INSPECTOR
}

private fun JobResponseDto.toDomainJob(): InspectorJob = InspectorJob(
    companyId = companyId,
    jobId = jobId,
    siteId = siteId,
    jurisdiction = jurisdiction.toDomainJurisdiction(),
    reference = reference,
    plannedDate = plannedDate?.toString(),
    workflowStatus = workflowStatus.value,
    jobPackVersion = jobPackVersion.longValueExact(),
    createdAtEpochMillis = createdAt.toInstant().toEpochMilli(),
    updatedAtEpochMillis = updatedAt.toInstant().toEpochMilli(),
    assignment = assignment?.toDomainAssignment(),
)

private fun JobResponseDto.Jurisdiction.toDomainJurisdiction(): SupportedJurisdiction = when (this) {
    JobResponseDto.Jurisdiction.NSW -> SupportedJurisdiction.NSW
    JobResponseDto.Jurisdiction.QLD -> SupportedJurisdiction.QLD
}

private fun JobAssignmentResponseDto.toDomainAssignment(): InspectorAssignment =
    InspectorAssignment(
        companyId = companyId,
        assignmentId = assignmentId,
        jobId = jobId,
        inspectorUserId = inspectorUserId,
        assignedByUserId = assignedByUserId,
        assignmentType = assignmentType.value,
        isPrimary = isPrimary,
        assignedAtEpochMillis = assignedAt.toInstant().toEpochMilli(),
        claimedAtEpochMillis = claimedAt?.toInstant()?.toEpochMilli(),
    )
