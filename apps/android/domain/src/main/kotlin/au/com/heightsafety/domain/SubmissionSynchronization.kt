package au.com.heightsafety.domain

public enum class SubmissionSynchronizationBlocker {
    SERVER_ACKNOWLEDGEMENT_REQUIRED,
    SERVER_CONFLICT,
    PHOTO_UPLOAD_PENDING,
    PHOTO_UPLOAD_FAILED,
}

/** Immutable evidence snapshot carried with one queued submission mutation. */
public data class InspectionSubmissionPayload(
    public val companyId: String,
    public val jobId: String,
    public val siteId: String,
    public val jurisdiction: SupportedJurisdiction,
    public val submissionId: String,
    public val jobPackVersion: Long,
    public val anchorInspections: List<AnchorInspectionDraft>,
) {
    init {
        require(companyId.isNotBlank()) { "payload companyId is required" }
        require(jobId.isNotBlank()) { "payload jobId is required" }
        require(siteId.isNotBlank()) { "payload siteId is required" }
        require(submissionId.isNotBlank()) { "payload submissionId is required" }
        require(jobPackVersion > 0) { "payload jobPackVersion must be positive" }
        require(anchorInspections.all { inspection ->
            inspection.companyId == companyId &&
                inspection.jobId == jobId &&
                inspection.jobPackVersion == jobPackVersion &&
                inspection.submissionId == submissionId
        }) {
            "payload inspections must belong to the submitted revision"
        }
    }
}

/**
 * Local gate for connected review/report work. A mutation acknowledgement and
 * every required photo upload are independent prerequisites.
 */
public data class SubmissionSynchronization(
    public val mutationState: SyncMutationState,
    public val photoStates: List<PhotoUploadQueueState>,
) {
    public val blockers: List<SubmissionSynchronizationBlocker>
        get() = buildList {
            when (mutationState) {
                SyncMutationState.SYNCHRONISED -> Unit
                SyncMutationState.CONFLICT ->
                    add(SubmissionSynchronizationBlocker.SERVER_CONFLICT)
                SyncMutationState.PENDING,
                SyncMutationState.SYNCHRONISING,
                SyncMutationState.FAILED,
                -> add(SubmissionSynchronizationBlocker.SERVER_ACKNOWLEDGEMENT_REQUIRED)
            }
            photoStates.forEach { state ->
                when (state) {
                    PhotoUploadQueueState.UPLOADED -> Unit
                    PhotoUploadQueueState.FAILED ->
                        add(SubmissionSynchronizationBlocker.PHOTO_UPLOAD_FAILED)
                    PhotoUploadQueueState.PENDING,
                    PhotoUploadQueueState.UPLOADING,
                    -> add(SubmissionSynchronizationBlocker.PHOTO_UPLOAD_PENDING)
                }
            }
        }.distinct()

    public val isReadyForReview: Boolean
        get() = blockers.isEmpty()
}
