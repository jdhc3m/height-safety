package au.com.heightsafety.app

import au.com.heightsafety.api.apis.IdentityApi
import au.com.heightsafety.api.apis.JobWorkflowApi
import au.com.heightsafety.api.infrastructure.ApiClient
import au.com.heightsafety.api.models.AuthMeResponseDto
import au.com.heightsafety.api.models.AuthUserResponseDto
import au.com.heightsafety.api.models.JobAssignmentResponseDto
import au.com.heightsafety.api.models.JobPackResponseDto
import au.com.heightsafety.api.models.JobResponseDto
import au.com.heightsafety.api.models.ProviderAccessTokenDto
import au.com.heightsafety.api.models.SessionResponseDto
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackGateway
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
) : FieldGateway, JobPackGateway {
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

    override suspend fun restoreSession(session: FieldSession): FieldSession =
        apiMutex.withLock {
            guardedCall("restore session") {
                if (session.accessToken.isBlank()) {
                    throw FieldGatewayException(
                        GatewayFailureReason.UNAUTHENTICATED,
                        "stored session token is empty",
                    )
                }
                bearerTokenSink(session.accessToken)
                val current = requireBody(
                    identityApi.getCurrentAuth(session.companyId),
                    "restore session",
                )
                if (
                    current.companyId != session.companyId ||
                    current.sessionId != session.sessionId ||
                    current.userId != session.userId ||
                    current.email != session.email
                ) {
                    throw FieldGatewayException(
                        GatewayFailureReason.TENANT_MISMATCH,
                        "stored session membership does not match the server",
                    )
                }
                FieldSession(
                    accessToken = session.accessToken,
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

    override suspend fun renewSession(session: FieldSession): FieldSession =
        apiMutex.withLock {
            guardedCall("renew session") {
                if (session.accessToken.isBlank()) {
                    throw FieldGatewayException(
                        GatewayFailureReason.UNAUTHENTICATED,
                        "session token is empty",
                    )
                }
                bearerTokenSink(session.accessToken)
                val renewed = requireBody(
                    identityApi.renewSession(session.companyId),
                    "renew session",
                )
                if (
                    renewed.companyId != session.companyId ||
                    renewed.user.userId != session.userId ||
                    renewed.user.email != session.email
                ) {
                    throw FieldGatewayException(
                        GatewayFailureReason.TENANT_MISMATCH,
                        "renewed session membership does not match the signed-in user",
                    )
                }

                // The renewal response intentionally does not carry the session
                // identifier or MFA claim. Re-read /auth/me so role, account
                // status, MFA state and the expiry are all server-authoritative.
                val current = requireBody(
                    identityApi.getCurrentAuth(session.companyId),
                    "verify renewed session",
                )
                if (
                    current.companyId != session.companyId ||
                    current.sessionId != session.sessionId ||
                    current.userId != session.userId ||
                    current.email != session.email ||
                    current.role.toDomainRole() != renewed.user.role.toDomainRole()
                ) {
                    throw FieldGatewayException(
                        GatewayFailureReason.TENANT_MISMATCH,
                        "renewed session membership does not match the server",
                    )
                }
                FieldSession(
                    accessToken = renewed.accessToken,
                    companyId = current.companyId,
                    sessionId = current.sessionId,
                    userId = current.userId,
                    email = current.email,
                    role = current.role.toDomainRole(),
                    mfaSatisfied = current.mfaSatisfied,
                    expiresAtEpochMillis = maxOf(
                        renewed.expiresAt.toInstant().toEpochMilli(),
                        current.sessionExpiresAt.toInstant().toEpochMilli(),
                    ),
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

    override suspend fun claimJob(
        session: FieldSession,
        jobId: String,
    ): InspectorJob = apiMutex.withLock {
        guardedCall("claim job") {
            requireInspectorSession(session)
            bearerTokenSink(session.accessToken)
            val claimed = requireBody(
                jobWorkflowApi.claimJob(session.companyId, jobId),
                "claim job",
            ).toDomainJob()
            if (
                claimed.companyId != session.companyId ||
                claimed.jobId != jobId ||
                claimed.assignment?.inspectorUserId != session.userId
            ) {
                throw FieldGatewayException(
                    GatewayFailureReason.INVALID_RESPONSE,
                    "claimed job does not match the signed-in inspector",
                )
            }
            claimed
        }
    }

    override suspend fun downloadJobPack(
        session: FieldSession,
        jobId: String,
    ): FieldJobPack = apiMutex.withLock {
        guardedCall("download job pack") {
            requireInspectorSession(session)
            bearerTokenSink(session.accessToken)
            requireBody(
                jobWorkflowApi.downloadJobPack(session.companyId, jobId),
                "download job pack",
            ).toDomainJobPack()
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

private fun JobPackResponseDto.toDomainJobPack(): FieldJobPack {
    val domainJob = job.toDomainJob()
    return FieldJobPack(
        companyId = domainJob.companyId,
        jobId = domainJob.jobId,
        siteId = domainJob.siteId,
        jurisdiction = domainJob.jurisdiction,
        reference = domainJob.reference,
        plannedDate = domainJob.plannedDate,
        workflowStatus = domainJob.workflowStatus,
        jobPackVersion = domainJob.jobPackVersion,
        siteName = site.name,
        siteAddress = site.address,
        siteReference = site.siteReference,
        accessNotes = site.accessNotes,
        anchors = anchors.map { anchor ->
            JobPackAnchor(
                companyId = anchor.companyId,
                anchorId = anchor.anchorId,
                siteId = anchor.siteId,
                label = anchor.label,
                registerId = anchor.registerId,
                location = anchor.location,
                anchorType = anchor.anchorType.value,
                manufacturer = anchor.manufacturer,
                model = anchor.model,
                installContext = anchor.installContext,
                registerStatus = anchor.registerStatus.value,
                notes = anchor.notes,
                createdAtEpochMillis = anchor.createdAt.toInstant().toEpochMilli(),
                updatedAtEpochMillis = anchor.updatedAt.toInstant().toEpochMilli(),
            )
        },
    )
}

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
