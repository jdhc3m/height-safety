package au.com.heightsafety.app

import au.com.heightsafety.domain.SupportedJurisdiction
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class DebugDemoGatewayTest {
    @Test
    fun exposesSyntheticJobsForBothSupportedJurisdictions() = runTest {
        val gateway = DebugDemoGateway()
        val session = gateway.createSession(
            companyId = DebugDemoGateway.DEMO_COMPANY_ID,
            providerAccessToken = DebugDemoGateway.DEMO_PROVIDER_ACCESS_TOKEN,
        )

        val jobs = gateway.listAuthorizedJobs(session)

        assertEquals(
            setOf(SupportedJurisdiction.NSW, SupportedJurisdiction.QLD),
            jobs.map { it.jurisdiction }.toSet(),
        )
        jobs.forEach { job ->
            assertEquals(job, gateway.claimJob(session, job.jobId))
            assertEquals(job.jobPackVersion, gateway.downloadJobPack(session, job.jobId).jobPackVersion)
        }
    }

    @Test
    fun rejectsNonDemoCompany() {
        val gateway = DebugDemoGateway()

        assertThrows(IllegalArgumentException::class.java) {
            runBlocking {
                gateway.createSession(
                    companyId = "real-company",
                    providerAccessToken = DebugDemoGateway.DEMO_PROVIDER_ACCESS_TOKEN,
                )
            }
        }
    }
}
