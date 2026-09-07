package au.com.heightsafety.app

import android.content.Context
import au.com.heightsafety.domain.ProviderAccessTokenException
import au.com.heightsafety.domain.ProviderAccessTokenSource
import com.auth0.android.Auth0
import com.auth0.android.authentication.AuthenticationAPIClient
import com.auth0.android.authentication.storage.SecureCredentialsManager
import com.auth0.android.authentication.storage.SharedPreferencesStorage
import com.auth0.android.provider.WebAuthProvider
import kotlinx.coroutines.CancellationException

internal fun hasAuth0Configuration(
    domain: String,
    clientId: String,
    apiAudience: String,
): Boolean =
    domain.isNotBlank() && clientId.isNotBlank() && apiAudience.isNotBlank()

/** Provider adapter stays unconfigured when local Auth0 values are absent. */
class UnconfiguredProviderAccessTokenSource : ProviderAccessTokenSource {
    override suspend fun requestAccessToken(): String {
        throw ProviderAccessTokenException()
    }
}

/**
 * Auth0 is deliberately kept in the Android adapter. The Kotlin/JVM field
 * domain receives only the provider token needed for the API exchange.
 */
class Auth0ProviderAccessTokenSource(
    private val authenticationContext: Context,
) : ProviderAccessTokenSource {
    private val applicationContext = authenticationContext.applicationContext
    private val auth0 = Auth0.getInstance(applicationContext)
    private val credentialsManager = SecureCredentialsManager(
        AuthenticationAPIClient(auth0),
        applicationContext,
        SharedPreferencesStorage(applicationContext),
    )

    override suspend fun requestAccessToken(): String {
        try {
            val credentials = if (credentialsManager.hasValidCredentials()) {
                credentialsManager.awaitCredentials()
            } else {
                WebAuthProvider
                    .login(auth0)
                    .withScheme("https")
                    .withAudience(applicationContext.getString(R.string.auth0_api_audience))
                    .withScope("openid profile email offline_access")
                    .await(authenticationContext)
                    .also(credentialsManager::saveCredentials)
            }
            return credentials.accessToken.takeIf(String::isNotBlank)
                ?: throw ProviderAccessTokenException()
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            // Do not expose provider error bodies, tokens or browser details in
            // the field UI or logs. The view model maps this to a retryable
            // provider-access failure.
            throw ProviderAccessTokenException()
        }
    }
}
