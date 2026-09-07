package au.com.heightsafety.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProviderAccessTokenSourcesTest {
    @Test
    fun auth0AdapterRequiresAllPublicRuntimeValues() {
        assertFalse(hasAuth0Configuration("", "client-id", "audience"))
        assertFalse(hasAuth0Configuration("tenant.au.auth0.com", "", "audience"))
        assertFalse(hasAuth0Configuration("tenant.au.auth0.com", "client-id", ""))
        assertTrue(
            hasAuth0Configuration(
                "tenant.au.auth0.com",
                "client-id",
                "https://api.example.test",
            ),
        )
    }
}
