package au.com.heightsafety.api.infrastructure

import au.com.heightsafety.api.apis.SystemApi
import io.kotlintest.shouldThrow
import io.kotlintest.specs.ShouldSpec

class ApiClientBaseUrlTest : ShouldSpec() {
    init {
        should("accept an injected absolute API base URL") {
            ApiClient("https://api.example.invalid/api/v1/")
                .createService(SystemApi::class.java)
        }

        should("reject the generated relative default URL") {
            shouldThrow<IllegalArgumentException> {
                ApiClient().createService(SystemApi::class.java)
            }
        }
    }
}
