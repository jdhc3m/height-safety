package au.com.heightsafety.app

import au.com.heightsafety.domain.FieldAuthorizationException
import au.com.heightsafety.domain.FieldGateway
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.InspectorAssignment
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.JobPackGateway
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.SupportedJurisdiction

/** Synthetic debug-only gateway. It never calls the product API. */
internal class DebugDemoGateway : FieldGateway, JobPackGateway {
    override suspend fun createSession(
        companyId: String,
        providerAccessToken: String,
    ): FieldSession {
        require(companyId == DEMO_COMPANY_ID) { "debug demo company is required" }
        require(providerAccessToken == DEMO_PROVIDER_ACCESS_TOKEN) {
            "debug demo provider token is required"
        }
        return DEMO_SESSION
    }

    override suspend fun listAuthorizedJobs(session: FieldSession): List<InspectorJob> {
        requireDemoSession(session)
        return DEMO_JOBS
    }

    override suspend fun claimJob(
        session: FieldSession,
        jobId: String,
    ): InspectorJob {
        requireDemoSession(session)
        return DEMO_JOBS.firstOrNull { it.jobId == jobId }
            ?: throw FieldAuthorizationException("debug demo job is not available")
    }

    override suspend fun downloadJobPack(
        session: FieldSession,
        jobId: String,
    ): FieldJobPack {
        requireDemoSession(session)
        return DEMO_PACKS[jobId]
            ?: throw FieldAuthorizationException("debug demo job pack is not available")
    }

    override suspend fun revokeSession(session: FieldSession) = Unit

    override fun clearSession() = Unit

    private fun requireDemoSession(session: FieldSession) {
        if (session != DEMO_SESSION) {
            throw FieldAuthorizationException("debug demo session is not valid")
        }
    }

    internal companion object {
        const val DEMO_COMPANY_ID = "debug-demo-company"
        const val DEMO_PROVIDER_ACCESS_TOKEN = "debug-demo-provider-token"
        const val DEMO_DIRECTORY_NAME = "debug-demo-job-pack"
        const val DEMO_KEY_ALIAS = "height-safety-debug-demo-v1"

        private val DEMO_SESSION = FieldSession(
            accessToken = "debug-demo-session-token",
            companyId = DEMO_COMPANY_ID,
            sessionId = "debug-demo-session",
            userId = "debug-demo-inspector",
            email = "debug.inspector@example.test",
            role = ProductRole.INSPECTOR,
            mfaSatisfied = false,
            expiresAtEpochMillis = Long.MAX_VALUE,
        )

        private val DEMO_JOBS = listOf(
            demoJob(
                jobId = "debug-nsw-job-001",
                siteId = "debug-nsw-site",
                reference = "DEMO-NSW-001",
                jurisdiction = SupportedJurisdiction.NSW,
            ),
            demoJob(
                jobId = "debug-qld-job-001",
                siteId = "debug-qld-site",
                reference = "DEMO-QLD-001",
                jurisdiction = SupportedJurisdiction.QLD,
            ),
        )

        private val DEMO_PACKS = DEMO_JOBS.associate { job ->
            job.jobId to demoPack(job)
        }

        private fun demoJob(
            jobId: String,
            siteId: String,
            reference: String,
            jurisdiction: SupportedJurisdiction,
        ) = InspectorJob(
            companyId = DEMO_COMPANY_ID,
            jobId = jobId,
            siteId = siteId,
            jurisdiction = jurisdiction,
            reference = reference,
            plannedDate = "2026-09-03",
            workflowStatus = "assigned",
            jobPackVersion = 1L,
            createdAtEpochMillis = 1L,
            updatedAtEpochMillis = 2L,
            assignment = InspectorAssignment(
                companyId = DEMO_COMPANY_ID,
                assignmentId = "assignment-$jobId",
                jobId = jobId,
                inspectorUserId = DEMO_SESSION.userId,
                assignedByUserId = "debug-demo-office",
                assignmentType = "assigned",
                isPrimary = true,
                assignedAtEpochMillis = 1L,
                claimedAtEpochMillis = null,
            ),
        )

        private fun demoPack(job: InspectorJob) = FieldJobPack(
            companyId = DEMO_COMPANY_ID,
            jobId = job.jobId,
            siteId = job.siteId,
            jurisdiction = job.jurisdiction,
            reference = job.reference,
            plannedDate = job.plannedDate,
            workflowStatus = job.workflowStatus,
            jobPackVersion = job.jobPackVersion,
            siteName = "Synthetic ${job.jurisdiction.value} roof site",
            siteAddress = "1 Debug Street",
            siteReference = "DEBUG-${job.jurisdiction.value}",
            accessNotes = "Synthetic debug data only.",
            anchors = listOf(
                JobPackAnchor(
                    companyId = DEMO_COMPANY_ID,
                    anchorId = "${job.jobId}-anchor-001",
                    siteId = job.siteId,
                    label = "A-001",
                    registerId = "DEBUG-${job.jobId}-A-001",
                    location = "North roof, grid A-1",
                    anchorType = "single_point",
                    manufacturer = "Synthetic manufacturer",
                    model = "Synthetic model",
                    installContext = "Installed roof anchor; debug data only",
                    registerStatus = "active",
                    notes = "Use this record for field-capture validation.",
                    createdAtEpochMillis = 1L,
                    updatedAtEpochMillis = 2L,
                ),
            ),
        )
    }
}
