package au.com.heightsafety.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class FieldAccessTest {
    private val inspector = session(
        companyId = "company-a",
        userId = "inspector-a",
        role = ProductRole.INSPECTOR,
    )

    @Test
    fun authorisedReleasedAndAssignedJobsAreVisible() {
        val released = job("released", companyId = "company-a", jobId = "job-released")
        val assigned = job(
            "in_progress",
            companyId = "company-a",
            jobId = "job-assigned",
            assignment = assignment("company-a", "job-assigned", "inspector-a"),
        )

        assertEquals(
            listOf("job-released", "job-assigned"),
            visibleJobsForInspector(inspector, listOf(released, assigned)).map { it.jobId },
        )
    }

    @Test
    fun otherCompanyJobsAreHidden() {
        val sameCompany = job("released", companyId = "company-a", jobId = "same-company")
        val otherCompany = job("released", companyId = "company-b", jobId = "other-company")

        assertEquals(
            listOf("same-company"),
            visibleJobsForInspector(inspector, listOf(sameCompany, otherCompany)).map { it.jobId },
        )
    }

    @Test
    fun unauthorisedJobIsDenied() {
        val assignedToOtherInspector = job(
            "assigned",
            companyId = "company-a",
            jobId = "job-other-inspector",
            assignment = assignment("company-a", "job-other-inspector", "inspector-b"),
        )

        assertFailsWith<FieldAuthorizationException> {
            requireAuthorizedJob(inspector, listOf(assignedToOtherInspector), "job-other-inspector")
        }
    }

    @Test
    fun nonInspectorRoleCannotUseFieldJobAccess() {
        val officeReviewer = session(
            companyId = "company-a",
            userId = "office-a",
            role = ProductRole.OFFICE_REVIEWER,
        )

        assertFailsWith<FieldAuthorizationException> {
            visibleJobsForInspector(officeReviewer, emptyList())
        }
    }

    @Test
    fun sessionExpiresAtServerBoundary() {
        val session = session(expiresAtEpochMillis = 10_000L)

        assertEquals(false, session.isExpired(9_999L))
        assertEquals(true, session.isExpired(10_000L))
    }

    private fun session(
        companyId: String = "company-a",
        userId: String = "inspector-a",
        role: ProductRole = ProductRole.INSPECTOR,
        expiresAtEpochMillis: Long = 100_000L,
    ) = FieldSession(
        accessToken = "session-token",
        companyId = companyId,
        sessionId = "session-id",
        userId = userId,
        email = "$userId@example.test",
        role = role,
        mfaSatisfied = false,
        expiresAtEpochMillis = expiresAtEpochMillis,
    )

    private fun job(
        status: String,
        companyId: String,
        jobId: String,
        assignment: InspectorAssignment? = null,
    ) = InspectorJob(
        companyId = companyId,
        jobId = jobId,
        siteId = "site-$jobId",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "Reference $jobId",
        plannedDate = "2026-09-15",
        workflowStatus = status,
        jobPackVersion = 1L,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = assignment,
    )

    private fun assignment(
        companyId: String,
        jobId: String,
        inspectorUserId: String,
    ) = InspectorAssignment(
        companyId = companyId,
        assignmentId = "assignment-$jobId",
        jobId = jobId,
        inspectorUserId = inspectorUserId,
        assignedByUserId = "office-a",
        assignmentType = "assigned",
        isPrimary = true,
        assignedAtEpochMillis = 1L,
        claimedAtEpochMillis = null,
    )
}
