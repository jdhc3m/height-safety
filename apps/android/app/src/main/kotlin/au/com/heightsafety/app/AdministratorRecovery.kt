package au.com.heightsafety.app

import au.com.heightsafety.domain.ProductRole

/** Provider-neutral result of authenticating an Administrator for recovery. */
data class AdministratorRecoveryIdentity(
    val companyId: String,
    val userId: String,
    val role: ProductRole,
)

/**
 * Authentication boundary for D-025 upload-only recovery.
 *
 * The identity provider remains unconfigured, so the default implementation
 * cannot grant recovery from an untrusted identifier or form field.
 */
fun interface AdministratorRecoveryAuthenticator {
    suspend fun authenticate(companyId: String): AdministratorRecoveryIdentity?
}

class UnconfiguredAdministratorRecoveryAuthenticator : AdministratorRecoveryAuthenticator {
    override suspend fun authenticate(companyId: String): AdministratorRecoveryIdentity? = null
}
