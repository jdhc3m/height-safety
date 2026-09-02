package au.com.heightsafety.app

import au.com.heightsafety.domain.ProviderAccessTokenException
import au.com.heightsafety.domain.ProviderAccessTokenSource

/** Provider adapter stays unconfigured until authentication vendor selection. */
class UnconfiguredProviderAccessTokenSource : ProviderAccessTokenSource {
    override suspend fun requestAccessToken(): String {
        throw ProviderAccessTokenException()
    }
}
