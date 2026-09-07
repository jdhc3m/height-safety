package au.com.heightsafety.domain

public enum class ProductRole {
    ADMINISTRATOR,
    OFFICE_REVIEWER,
    INSPECTOR,
}

public data class FieldSession(
    public val accessToken: String,
    public val companyId: String,
    public val sessionId: String,
    public val userId: String,
    public val email: String,
    public val role: ProductRole,
    public val mfaSatisfied: Boolean,
    public val expiresAtEpochMillis: Long,
) {
    init {
        require(accessToken.isNotBlank()) { "accessToken is required" }
        require(companyId.isNotBlank()) { "companyId is required" }
        require(sessionId.isNotBlank()) { "sessionId is required" }
        require(userId.isNotBlank()) { "userId is required" }
        require(email.isNotBlank()) { "email is required" }
    }

    public fun isExpired(nowEpochMillis: Long): Boolean =
        nowEpochMillis >= expiresAtEpochMillis
}

public fun interface ProviderAccessTokenSource {
    public suspend fun requestAccessToken(): String
}

public interface FieldGateway {
    public suspend fun createSession(
        companyId: String,
        providerAccessToken: String,
    ): FieldSession

    /** Revalidate a previously persisted application session with the server. */
    public suspend fun restoreSession(session: FieldSession): FieldSession = session

    public suspend fun listAuthorizedJobs(session: FieldSession): List<InspectorJob>

    public suspend fun claimJob(
        session: FieldSession,
        jobId: String,
    ): InspectorJob

    public suspend fun revokeSession(session: FieldSession)

    /** Remove the current application token from the adapter without network I/O. */
    public fun clearSession() {}
}

public enum class GatewayFailureReason {
    NETWORK,
    UNAUTHENTICATED,
    FORBIDDEN,
    UNAVAILABLE,
    INVALID_RESPONSE,
    TENANT_MISMATCH,
    UNKNOWN,
}

public class FieldGatewayException(
    public val reason: GatewayFailureReason,
    message: String,
) : RuntimeException(message)

public class ProviderAccessTokenException(
    message: String = "identity provider access token is unavailable",
) : RuntimeException(message)

public class FieldAuthorizationException(
    message: String = "field access is not authorised",
) : RuntimeException(message)

public class FieldSessionExpiredException(
    message: String = "field session has expired",
) : RuntimeException(message)

public fun requireInspectorSession(session: FieldSession) {
    if (session.role != ProductRole.INSPECTOR) {
        throw FieldAuthorizationException("Inspector role is required")
    }
}
