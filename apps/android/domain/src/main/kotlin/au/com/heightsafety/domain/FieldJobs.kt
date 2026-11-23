package au.com.heightsafety.domain

public enum class SupportedJurisdiction(public val value: String) {
    NSW("NSW"),
    QLD("QLD"),
}

public data class InspectorAssignment(
    public val companyId: String,
    public val assignmentId: String,
    public val jobId: String,
    public val inspectorUserId: String,
    public val assignedByUserId: String?,
    public val assignmentType: String,
    public val isPrimary: Boolean,
    public val assignedAtEpochMillis: Long,
    public val claimedAtEpochMillis: Long?,
)

public data class InspectorJob(
    public val companyId: String,
    public val jobId: String,
    public val siteId: String,
    public val jurisdiction: SupportedJurisdiction,
    public val reference: String,
    public val plannedDate: String?,
    public val workflowStatus: String,
    public val jobPackVersion: Long,
    public val createdAtEpochMillis: Long,
    public val updatedAtEpochMillis: Long,
    public val assignment: InspectorAssignment?,
)

public fun visibleJobsForInspector(
    session: FieldSession,
    jobs: Iterable<InspectorJob>,
): List<InspectorJob> {
    requireInspectorSession(session)
    return jobs.filter { it.isVisibleTo(session) }
}

public fun requireAuthorizedJob(
    session: FieldSession,
    jobs: Iterable<InspectorJob>,
    jobId: String,
): InspectorJob {
    requireInspectorSession(session)
    return jobs.firstOrNull { it.jobId == jobId && it.isVisibleTo(session) }
        ?: throw FieldAuthorizationException("job is not authorised for this inspector")
}

private fun InspectorJob.isVisibleTo(session: FieldSession): Boolean {
    if (companyId != session.companyId) {
        return false
    }

    val assignment = assignment
    val assignedToThisInspector =
        assignment != null &&
            assignment.companyId == session.companyId &&
            assignment.jobId == jobId &&
            assignment.inspectorUserId == session.userId &&
            assignment.isPrimary

    val releasedAndUnassigned = workflowStatus == "released" && assignment == null
    return releasedAndUnassigned || assignedToThisInspector
}
