package au.com.heightsafety.domain

public enum class RecordedOutcome(public val value: String) {
    SERVICEABLE("serviceable"),
    DEFECTIVE("defective"),
    NOT_INSPECTED("not_inspected"),
    FURTHER_ASSESSMENT_REQUIRED("further_assessment_required"),
}

public enum class InspectionExceptionReason(public val value: String) {
    INACCESSIBLE("inaccessible"),
    UNABLE_TO_LOCATE("unable_to_locate"),
}

public enum class ReconciliationProposal(public val value: String) {
    NEWLY_DISCOVERED("newly_discovered"),
    REPLACEMENT("replacement"),
    DUPLICATE("duplicate"),
}

public enum class RecordedDisposition(public val value: String) {
    REMOVED_FROM_SERVICE("removed_from_service"),
}

public enum class EvidenceSyncState(public val value: String) {
    LOCAL("local"),
    PENDING("pending"),
    SYNCHRONISING("synchronising"),
    SYNCHRONISED("synchronised"),
    FAILED("failed"),
    CONFLICT("conflict"),
}

public enum class PhotoUploadState(public val value: String) {
    PENDING_UPLOAD("pending_upload"),
    UPLOADED("uploaded"),
    FAILED("failed"),
}

public data class RecordedProofTest(
    public val load: String? = null,
    public val hold: String? = null,
    public val result: String? = null,
    public val equipmentReference: String? = null,
) {
    public val hasEnteredValue: Boolean
        get() = listOf(load, hold, result, equipmentReference).any(::hasText)

    public val isComplete: Boolean
        get() = listOf(load, hold, result, equipmentReference).all(::hasText)
}

public data class AnchorEvidencePhoto(
    public val companyId: String,
    public val jobId: String,
    public val anchorInspectionId: String,
    public val localId: String,
    public val storageReference: String,
    public val capturedAtEpochMillis: Long,
    public val checksum: String,
    public val uploadState: PhotoUploadState = PhotoUploadState.PENDING_UPLOAD,
    public val contentType: String? = null,
) {
    init {
        require(companyId.isNotBlank()) { "photo companyId is required" }
        require(jobId.isNotBlank()) { "photo jobId is required" }
        require(anchorInspectionId.isNotBlank()) {
            "photo anchorInspectionId is required"
        }
        require(localId.isNotBlank()) { "photo localId is required" }
        require(storageReference.isNotBlank()) { "photo storageReference is required" }
        require(capturedAtEpochMillis >= 0) {
            "photo capturedAtEpochMillis must not be negative"
        }
        require(checksum.isNotBlank()) { "photo checksum is required" }
    }
}

public enum class CaptureValidationCode {
    PACK_IDENTITY_MISMATCH,
    MISSING_ANCHOR_REFERENCE,
    UNKNOWN_EXPECTED_ANCHOR,
    INVALID_RECONCILIATION,
    MISSING_PROVISIONAL_ANCHOR_ID,
    MISSING_RECONCILIATION_REFERENCE,
    MISSING_LOCATION_CONTEXT,
    MISSING_SEARCH_CONTEXT,
    MISSING_OUTCOME,
    MISSING_IDENTITY_CONFIRMATION,
    MISSING_LOCATION_CONFIRMATION,
    INVALID_EXCEPTION,
    MISSING_EXCEPTION_REASON,
    MISSING_OBSERVATIONS,
    MISSING_DEFECT_DESCRIPTION,
    MISSING_FOLLOW_UP,
    INCOMPLETE_PROOF_TEST,
}

public data class CaptureValidationIssue(
    public val code: CaptureValidationCode,
    public val message: String,
)

public data class AnchorInspectionDraft(
    public val companyId: String,
    public val jobId: String,
    public val jobPackVersion: Long,
    public val inspectionId: String,
    public val expectedAnchorId: String? = null,
    public val provisionalAnchorId: String? = null,
    public val identityConfirmed: Boolean = false,
    public val locationConfirmed: Boolean = false,
    public val location: String? = null,
    public val observations: String? = null,
    public val recordedOutcome: RecordedOutcome? = null,
    public val exceptionReason: InspectionExceptionReason? = null,
    public val reconciliationProposal: ReconciliationProposal? = null,
    public val reconciliationReferenceId: String? = null,
    public val disposition: RecordedDisposition? = null,
    public val notes: String? = null,
    public val defectDescription: String? = null,
    public val recommendation: String? = null,
    public val proofTest: RecordedProofTest? = null,
    public val photos: List<AnchorEvidencePhoto> = emptyList(),
    public val syncState: EvidenceSyncState = EvidenceSyncState.LOCAL,
    public val createdAtEpochMillis: Long,
    public val updatedAtEpochMillis: Long = createdAtEpochMillis,
    public val submissionId: String? = null,
) {
    init {
        require(companyId.isNotBlank()) { "evidence companyId is required" }
        require(jobId.isNotBlank()) { "evidence jobId is required" }
        require(jobPackVersion > 0) { "evidence jobPackVersion must be positive" }
        require(inspectionId.isNotBlank()) { "evidence inspectionId is required" }
        require(createdAtEpochMillis >= 0) {
            "evidence createdAtEpochMillis must not be negative"
        }
        require(updatedAtEpochMillis >= createdAtEpochMillis) {
            "evidence updatedAtEpochMillis must not precede creation"
        }
        require(photos.map(AnchorEvidencePhoto::localId).distinct().size == photos.size) {
            "evidence photo local IDs must be unique"
        }
        require(
            photos.all {
                it.companyId == companyId &&
                    it.jobId == jobId &&
                    it.anchorInspectionId == inspectionId
            },
        ) {
            "evidence photos must belong to the same inspection"
        }
    }

    /** Full Stage 2B capture gate. Local drafts may remain incomplete. */
    public fun validationIssues(pack: FieldJobPack): List<CaptureValidationIssue> {
        val issues = identityIssues(pack).toMutableList()
        issues += reconciliationIdentityIssues(pack)
        when (reconciliationProposal) {
            ReconciliationProposal.NEWLY_DISCOVERED -> {
                if (!hasText(location)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_LOCATION_CONTEXT,
                        "Record location context for the newly discovered anchor.",
                    )
                }
            }
            ReconciliationProposal.REPLACEMENT -> {
                if (!hasText(location)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_LOCATION_CONTEXT,
                        "Record location context for the replacement proposal.",
                    )
                }
            }
            ReconciliationProposal.DUPLICATE -> {
                if (!hasText(reconciliationReferenceId)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_RECONCILIATION_REFERENCE,
                        "Record the related anchor reference for review.",
                    )
                }
            }
            null -> Unit
        }
        when (recordedOutcome) {
            null -> issues += issue(
                CaptureValidationCode.MISSING_OUTCOME,
                "Select a recorded outcome.",
            )
            RecordedOutcome.SERVICEABLE -> {
                requireIdentityAndLocation(issues)
                if (!hasText(observations)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_OBSERVATIONS,
                        "Record observations supporting the recorded outcome.",
                    )
                }
            }
            RecordedOutcome.DEFECTIVE -> {
                requireIdentityAndLocation(issues)
                if (!hasText(observations)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_OBSERVATIONS,
                        "Record observations supporting the recorded outcome.",
                    )
                }
                if (!hasText(defectDescription)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_DEFECT_DESCRIPTION,
                        "Record at least one defect description.",
                    )
                }
            }
            RecordedOutcome.NOT_INSPECTED -> {
                if (exceptionReason == null) {
                    issues += issue(
                        CaptureValidationCode.MISSING_EXCEPTION_REASON,
                        "Select why the anchor was not inspected.",
                    )
                } else if (
                    exceptionReason == InspectionExceptionReason.UNABLE_TO_LOCATE &&
                    !hasText(observations) &&
                    !hasText(notes)
                ) {
                    issues += issue(
                        CaptureValidationCode.MISSING_SEARCH_CONTEXT,
                        "Record the search or location context for an anchor that could not be located.",
                    )
                }
            }
            RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED -> {
                requireIdentityAndLocation(issues)
                if (!hasText(observations)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_OBSERVATIONS,
                        "Record why further assessment is required.",
                    )
                }
                if (!hasText(notes) && !hasText(recommendation)) {
                    issues += issue(
                        CaptureValidationCode.MISSING_FOLLOW_UP,
                        "Record a follow-up or review note.",
                    )
                }
            }
        }

        if (recordedOutcome != RecordedOutcome.NOT_INSPECTED && exceptionReason != null) {
            issues += issue(
                CaptureValidationCode.INVALID_EXCEPTION,
                "An exception reason is only recorded with Not inspected.",
            )
        }
        if (proofTest != null && !proofTest.isComplete) {
            issues += issue(
                CaptureValidationCode.INCOMPLETE_PROOF_TEST,
                "Complete the entered proof-test fields or remove the partial test.",
            )
        }
        return issues.distinctBy(CaptureValidationIssue::code)
    }

    /** Safe-to-save gate: identity and evidence association only. */
    public fun localSaveIssues(pack: FieldJobPack): List<CaptureValidationIssue> =
        (identityIssues(pack) + reconciliationIdentityIssues(pack))
            .distinctBy(CaptureValidationIssue::code)

    private fun identityIssues(pack: FieldJobPack): List<CaptureValidationIssue> {
        val issues = mutableListOf<CaptureValidationIssue>()
        if (
            companyId != pack.companyId ||
            jobId != pack.jobId ||
            jobPackVersion != pack.jobPackVersion
        ) {
            issues += issue(
                CaptureValidationCode.PACK_IDENTITY_MISMATCH,
                "Evidence does not match the opened job-pack snapshot.",
            )
        }

        val hasExpectedAnchor = hasText(expectedAnchorId)
        val hasProvisionalAnchor = hasText(provisionalAnchorId)
        if (!hasExpectedAnchor && !hasProvisionalAnchor) {
            issues += issue(
                CaptureValidationCode.MISSING_ANCHOR_REFERENCE,
                "Select an expected anchor or record a provisional anchor ID.",
            )
        }
        if (hasExpectedAnchor && pack.anchors.none { it.anchorId == expectedAnchorId }) {
            issues += issue(
                CaptureValidationCode.UNKNOWN_EXPECTED_ANCHOR,
                "The expected anchor is not in this job-pack snapshot.",
            )
        }

        return issues
    }

    private fun reconciliationIdentityIssues(
        pack: FieldJobPack,
    ): List<CaptureValidationIssue> {
        val issues = mutableListOf<CaptureValidationIssue>()
        val hasExpectedAnchor = hasText(expectedAnchorId)
        val hasProvisionalAnchor = hasText(provisionalAnchorId)
        when (reconciliationProposal) {
            null -> if (hasProvisionalAnchor) {
                issues += issue(
                    CaptureValidationCode.INVALID_RECONCILIATION,
                    "A provisional anchor ID needs a reconciliation proposal.",
                )
            }
            ReconciliationProposal.NEWLY_DISCOVERED -> {
                if (hasExpectedAnchor) {
                    issues += issue(
                        CaptureValidationCode.INVALID_RECONCILIATION,
                        "A newly discovered anchor cannot replace an expected ID silently.",
                    )
                }
                if (!hasProvisionalAnchor) {
                    issues += issue(
                        CaptureValidationCode.MISSING_PROVISIONAL_ANCHOR_ID,
                        "Record a stable provisional anchor ID.",
                    )
                }
                if (pack.anchors.any { it.anchorId == provisionalAnchorId }) {
                    issues += issue(
                        CaptureValidationCode.INVALID_RECONCILIATION,
                        "A newly discovered anchor needs an ID distinct from the expected register.",
                    )
                }
            }
            ReconciliationProposal.REPLACEMENT -> {
                if (!hasExpectedAnchor || !hasProvisionalAnchor) {
                    issues += issue(
                        CaptureValidationCode.MISSING_PROVISIONAL_ANCHOR_ID,
                        "Record the existing and provisional replacement identities.",
                    )
                }
                if (pack.anchors.any { it.anchorId == provisionalAnchorId }) {
                    issues += issue(
                        CaptureValidationCode.INVALID_RECONCILIATION,
                        "A replacement needs an identity distinct from the expected register.",
                    )
                }
            }
            ReconciliationProposal.DUPLICATE -> {
                if (!hasExpectedAnchor) {
                    issues += issue(
                        CaptureValidationCode.UNKNOWN_EXPECTED_ANCHOR,
                        "Record the existing anchor identity for the duplicate proposal.",
                    )
                }
            }
        }
        return issues
    }

    private fun requireIdentityAndLocation(issues: MutableList<CaptureValidationIssue>) {
        if (!identityConfirmed) {
            issues += issue(
                CaptureValidationCode.MISSING_IDENTITY_CONFIRMATION,
                "Confirm the anchor identity before recording this outcome.",
            )
        }
        if (!locationConfirmed) {
            issues += issue(
                CaptureValidationCode.MISSING_LOCATION_CONFIRMATION,
                "Confirm the anchor location before recording this outcome.",
            )
        }
    }

    private fun issue(
        code: CaptureValidationCode,
        message: String,
    ) = CaptureValidationIssue(code, message)
}

public interface AnchorEvidenceStore {
    public suspend fun loadEvidence(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): List<AnchorInspectionDraft>

    public suspend fun saveEvidence(draft: AnchorInspectionDraft)
}

public class AnchorEvidenceValidationException(
    public val issues: List<CaptureValidationIssue>,
) : IllegalArgumentException(
    issues.joinToString(separator = " ") { it.message },
)

public class AnchorEvidenceService(
    private val store: AnchorEvidenceStore,
    private val nowEpochMillis: () -> Long,
    private val elapsedRealtimeMillis: () -> Long,
) {
    public suspend fun loadDrafts(
        session: FieldSession,
        opened: OpenedJobPack,
    ): List<AnchorInspectionDraft> {
        requirePackAccess(session, opened)
        return store.loadEvidence(
            companyId = opened.stored.pack.companyId,
            jobId = opened.stored.pack.jobId,
            jobPackVersion = opened.stored.pack.jobPackVersion,
        )
    }

    public fun newExpectedDraft(
        session: FieldSession,
        opened: OpenedJobPack,
        anchor: JobPackAnchor,
        inspectionId: String,
    ): AnchorInspectionDraft {
        val now = requirePackAccess(session, opened)
        val canonicalAnchor = opened.stored.pack.anchors.singleOrNull {
            it.anchorId == anchor.anchorId
        } ?: throw IllegalArgumentException(
            "anchor is not in the opened job-pack snapshot",
        )
        return AnchorInspectionDraft(
            companyId = opened.stored.pack.companyId,
            jobId = opened.stored.pack.jobId,
            jobPackVersion = opened.stored.pack.jobPackVersion,
            inspectionId = inspectionId,
            expectedAnchorId = canonicalAnchor.anchorId,
            location = canonicalAnchor.location,
            createdAtEpochMillis = now,
        )
    }

    public fun newProvisionalDraft(
        session: FieldSession,
        opened: OpenedJobPack,
        inspectionId: String,
        provisionalAnchorId: String,
    ): AnchorInspectionDraft {
        val now = requirePackAccess(session, opened)
        require(inspectionId.isNotBlank()) { "inspectionId is required" }
        require(provisionalAnchorId.isNotBlank()) {
            "provisionalAnchorId is required"
        }
        require(opened.stored.pack.anchors.none { it.anchorId == provisionalAnchorId }) {
            "provisionalAnchorId must not match an expected anchor"
        }
        return AnchorInspectionDraft(
            companyId = opened.stored.pack.companyId,
            jobId = opened.stored.pack.jobId,
            jobPackVersion = opened.stored.pack.jobPackVersion,
            inspectionId = inspectionId,
            provisionalAnchorId = provisionalAnchorId,
            reconciliationProposal = ReconciliationProposal.NEWLY_DISCOVERED,
            createdAtEpochMillis = now,
        )
    }

    public suspend fun saveDraft(
        session: FieldSession,
        opened: OpenedJobPack,
        draft: AnchorInspectionDraft,
    ): AnchorInspectionDraft {
        val accessNow = requirePackAccess(session, opened)
        requireSubmissionIsOpen(opened)
        if (draft.submissionId != null) {
            throw AnchorEvidenceSubmittedException()
        }
        val existing = store.loadEvidence(
            companyId = opened.stored.pack.companyId,
            jobId = opened.stored.pack.jobId,
            jobPackVersion = opened.stored.pack.jobPackVersion,
        ).singleOrNull { it.inspectionId == draft.inspectionId }
        if (existing?.submissionId != null) {
            throw AnchorEvidenceSubmittedException()
        }
        val localIssues = draft.localSaveIssues(opened.stored.pack)
        if (localIssues.isNotEmpty()) {
            throw AnchorEvidenceValidationException(localIssues)
        }
        val saved = draft.copy(
            syncState = EvidenceSyncState.LOCAL,
            updatedAtEpochMillis = maxOf(draft.updatedAtEpochMillis, accessNow),
        )
        store.saveEvidence(saved)
        return saved
    }

    private suspend fun requireSubmissionIsOpen(opened: OpenedJobPack) {
        val submissionStore = store as? AnchorEvidenceSubmissionStore ?: return
        if (
            submissionStore.loadSubmission(
                companyId = opened.stored.pack.companyId,
                jobId = opened.stored.pack.jobId,
                jobPackVersion = opened.stored.pack.jobPackVersion,
            ) != null
        ) {
            throw AnchorEvidenceSubmittedException()
        }
    }

    public fun validateForCompletion(
        session: FieldSession,
        opened: OpenedJobPack,
        draft: AnchorInspectionDraft,
    ): List<CaptureValidationIssue> {
        requirePackAccess(session, opened)
        return draft.validationIssues(opened.stored.pack)
    }

    private fun requirePackAccess(
        session: FieldSession,
        opened: OpenedJobPack,
    ): Long {
        requireInspectorSession(session)
        val stored = opened.stored
        if (
            session.companyId != stored.pack.companyId ||
            session.userId != stored.lease.userId ||
            session.companyId != stored.lease.companyId ||
            session.userId.isBlank()
        ) {
            throw FieldAuthorizationException(
                "evidence access does not match the opened inspector job pack",
            )
        }
        val now = checkedNow()
        if (session.isExpired(now)) {
            throw FieldSessionExpiredException()
        }
        when (stored.lease.lockReason(now, checkedElapsed())) {
            null -> Unit
            OfflineLeaseLockReason.WALL_CLOCK_EXPIRED -> throw JobPackAccessException(
                JobPackAccessFailure.LEASE_EXPIRED,
                "offline job-pack lease expired; local evidence is preserved",
            )
            OfflineLeaseLockReason.ELAPSED_RUNTIME_EXPIRED ->
                throw JobPackAccessException(
                    JobPackAccessFailure.ELAPSED_RUNTIME_EXPIRED,
                    "offline job-pack lease expired; local evidence is preserved",
                )
            OfflineLeaseLockReason.CLOCK_ROLLBACK -> throw JobPackAccessException(
                JobPackAccessFailure.CLOCK_ROLLBACK,
                "offline job-pack access locked after clock rollback; local evidence is preserved",
            )
        }
        return now
    }

    private fun checkedNow(): Long = nowEpochMillis().also {
        require(it >= 0) { "current epoch time must not be negative" }
    }

    private fun checkedElapsed(): Long = elapsedRealtimeMillis().also {
        require(it >= 0) { "current elapsed time must not be negative" }
    }
}

public class AnchorEvidenceSubmittedException : IllegalStateException(
    "submitted local evidence is immutable",
)

private fun hasText(value: String?): Boolean = !value.isNullOrBlank()
