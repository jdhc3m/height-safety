package au.com.heightsafety.domain

public enum class SubmissionReviewCode {
    MISSING_EXPECTED_ANCHOR_COVERAGE,
    DUPLICATE_EXPECTED_ANCHOR_COVERAGE,
    CAPTURE_VALIDATION,
    MISSING_PHOTOGRAPH,
    INCOMPLETE_REGISTER_CONTEXT,
    RECONCILIATION_REQUIRES_REVIEW,
}

public data class SubmissionReviewIssue(
    public val code: SubmissionReviewCode,
    public val message: String,
    public val inspectionId: String? = null,
    public val anchorReference: String? = null,
    public val captureValidationCode: CaptureValidationCode? = null,
)

public data class SubmissionReadiness(
    public val blockers: List<SubmissionReviewIssue>,
    public val warnings: List<SubmissionReviewIssue>,
) {
    public val isReadyForQueue: Boolean
        get() = blockers.isEmpty()

    public companion object {
        public fun evaluate(
            pack: FieldJobPack,
            evidence: List<AnchorInspectionDraft>,
        ): SubmissionReadiness {
            val blockers = mutableListOf<SubmissionReviewIssue>()
            val warnings = mutableListOf<SubmissionReviewIssue>()

            pack.anchors.forEach { anchor ->
                val anchorEvidence = evidence.filter {
                    it.expectedAnchorId == anchor.anchorId
                }
                when {
                    anchorEvidence.isEmpty() -> blockers += SubmissionReviewIssue(
                        code = SubmissionReviewCode.MISSING_EXPECTED_ANCHOR_COVERAGE,
                        message = "Record an outcome or Not inspected exception for expected anchor ${anchor.reference()}.",
                        anchorReference = anchor.reference(),
                    )
                    anchorEvidence.size > 1 -> blockers += SubmissionReviewIssue(
                        code = SubmissionReviewCode.DUPLICATE_EXPECTED_ANCHOR_COVERAGE,
                        message = "Resolve multiple coverage records for expected anchor ${anchor.reference()} before submission.",
                        anchorReference = anchor.reference(),
                    )
                }
            }

            evidence.forEach { draft ->
                val anchorReference = draft.anchorReference()
                draft.validationIssues(pack).forEach { issue ->
                    blockers += SubmissionReviewIssue(
                        code = SubmissionReviewCode.CAPTURE_VALIDATION,
                        message = issue.message,
                        inspectionId = draft.inspectionId,
                        anchorReference = anchorReference,
                        captureValidationCode = issue.code,
                    )
                }

                if (
                    draft.recordedOutcome != null &&
                    draft.recordedOutcome != RecordedOutcome.NOT_INSPECTED &&
                    draft.photos.isEmpty()
                ) {
                    warnings += SubmissionReviewIssue(
                        code = SubmissionReviewCode.MISSING_PHOTOGRAPH,
                        message = "No photograph is associated with inspected anchor $anchorReference.",
                        inspectionId = draft.inspectionId,
                        anchorReference = anchorReference,
                    )
                }

                if (draft.reconciliationProposal != null) {
                    warnings += SubmissionReviewIssue(
                        code = SubmissionReviewCode.RECONCILIATION_REQUIRES_REVIEW,
                        message = "Register reconciliation proposal for $anchorReference remains for office review.",
                        inspectionId = draft.inspectionId,
                        anchorReference = anchorReference,
                    )
                }

                val expectedAnchor = draft.expectedAnchorId?.let { expectedId ->
                    pack.anchors.singleOrNull { it.anchorId == expectedId }
                }
                if (
                    expectedAnchor != null &&
                    listOf(
                        expectedAnchor.label,
                        expectedAnchor.manufacturer,
                        expectedAnchor.model,
                        expectedAnchor.installContext,
                    ).any { it.isNullOrBlank() }
                ) {
                    warnings += SubmissionReviewIssue(
                        code = SubmissionReviewCode.INCOMPLETE_REGISTER_CONTEXT,
                        message = "Register context for anchor $anchorReference is incomplete; office review may need more information.",
                        inspectionId = draft.inspectionId,
                        anchorReference = anchorReference,
                    )
                }
            }

            return SubmissionReadiness(
                blockers = blockers,
                warnings = warnings,
            )
        }
    }
}

public data class InspectionSubmissionIntent(
    public val companyId: String,
    public val jobId: String,
    public val jobPackVersion: Long,
    public val submissionId: String,
    public val mutationId: String,
    public val inspectorUserId: String,
    public val sessionId: String,
    public val createdAtEpochMillis: Long,
    public val updatedAtEpochMillis: Long = createdAtEpochMillis,
    public val syncState: EvidenceSyncState = EvidenceSyncState.PENDING,
) {
    init {
        require(companyId.isNotBlank()) { "submission companyId is required" }
        require(jobId.isNotBlank()) { "submission jobId is required" }
        require(jobPackVersion > 0) { "submission jobPackVersion must be positive" }
        require(submissionId.isNotBlank()) { "submission submissionId is required" }
        require(mutationId.isNotBlank()) { "submission mutationId is required" }
        require(inspectorUserId.isNotBlank()) { "submission inspectorUserId is required" }
        require(sessionId.isNotBlank()) { "submission sessionId is required" }
        require(createdAtEpochMillis >= 0) {
            "submission createdAtEpochMillis must not be negative"
        }
        require(updatedAtEpochMillis >= createdAtEpochMillis) {
            "submission updatedAtEpochMillis must not precede creation"
        }
    }
}

public data class SubmissionReviewResult(
    public val evidence: List<AnchorInspectionDraft>,
    public val readiness: SubmissionReadiness,
    public val intent: InspectionSubmissionIntent?,
)

public interface AnchorEvidenceSubmissionStore : AnchorEvidenceStore {
    public suspend fun loadSubmission(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): InspectionSubmissionIntent?

    /** Stores submission intent and freezes supplied evidence in one adapter transaction. */
    public suspend fun queueSubmission(
        intent: InspectionSubmissionIntent,
        frozenEvidence: List<AnchorInspectionDraft>,
        mutation: SyncMutation,
    ): InspectionSubmissionIntent
}

public class SubmissionNotReadyException(
    public val readiness: SubmissionReadiness,
) : IllegalArgumentException(
    readiness.blockers.joinToString(separator = " ") { it.message },
)

public class AnchorSubmissionService(
    private val evidenceService: AnchorEvidenceService,
    private val store: AnchorEvidenceSubmissionStore,
    private val nowEpochMillis: () -> Long,
    private val submissionIdGenerator: () -> String,
    private val mutationIdGenerator: () -> String,
) {
    public suspend fun review(
        session: FieldSession,
        opened: OpenedJobPack,
    ): SubmissionReviewResult {
        val evidence = evidenceService.loadDrafts(session, opened)
        val intent = store.loadSubmission(
            companyId = opened.stored.pack.companyId,
            jobId = opened.stored.pack.jobId,
            jobPackVersion = opened.stored.pack.jobPackVersion,
        )
        return SubmissionReviewResult(
            evidence = evidence,
            readiness = SubmissionReadiness.evaluate(opened.stored.pack, evidence),
            intent = intent,
        )
    }

    public suspend fun queue(
        session: FieldSession,
        opened: OpenedJobPack,
    ): InspectionSubmissionIntent {
        val review = review(session, opened)
        review.intent?.let { return it }
        if (!review.readiness.isReadyForQueue) {
            throw SubmissionNotReadyException(review.readiness)
        }

        requireInspectorSession(session)
        val now = nowEpochMillis().also {
            require(it >= 0) { "submission time must not be negative" }
        }
        val intent = InspectionSubmissionIntent(
            companyId = opened.stored.pack.companyId,
            jobId = opened.stored.pack.jobId,
            jobPackVersion = opened.stored.pack.jobPackVersion,
            submissionId = submissionIdGenerator(),
            mutationId = mutationIdGenerator(),
            inspectorUserId = session.userId,
            sessionId = session.sessionId,
            createdAtEpochMillis = now,
        )
        val mutation = SyncMutation(
            companyId = intent.companyId,
            mutationId = intent.mutationId,
            idempotencyKey = intent.mutationId,
            operation = SyncMutationOperation.SUBMIT_INSPECTION,
            entityType = INSPECTION_SUBMISSION_ENTITY_TYPE,
            entityId = intent.submissionId,
            entityVersion = intent.jobPackVersion,
            actorUserId = intent.inspectorUserId,
            sessionId = intent.sessionId,
            createdAtEpochMillis = intent.createdAtEpochMillis,
        )
        val frozenEvidence = review.evidence.map { draft ->
            draft.copy(
                submissionId = intent.submissionId,
                syncState = EvidenceSyncState.PENDING,
                updatedAtEpochMillis = maxOf(draft.updatedAtEpochMillis, now),
            )
        }
        return store.queueSubmission(intent, frozenEvidence, mutation)
    }
}

private fun JobPackAnchor.reference(): String = label ?: registerId ?: anchorId

private fun AnchorInspectionDraft.anchorReference(): String =
    expectedAnchorId ?: provisionalAnchorId ?: inspectionId
