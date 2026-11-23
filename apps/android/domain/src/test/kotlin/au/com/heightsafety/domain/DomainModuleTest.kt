package au.com.heightsafety.domain

import kotlin.test.Test
import kotlin.test.assertEquals

class DomainModuleTest {
    @Test
    fun exposesJvmDomainBoundary() {
        assertEquals("android-field-domain", DomainModule.name)
    }
}
