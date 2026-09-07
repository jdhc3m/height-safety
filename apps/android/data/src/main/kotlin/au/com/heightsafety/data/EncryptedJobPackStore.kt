package au.com.heightsafety.data

import android.content.Context
import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorEvidenceStore
import au.com.heightsafety.domain.AnchorEvidenceSubmissionStore
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldJobPackStore
import au.com.heightsafety.domain.FieldOfflineAccessState
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.FieldSessionStore
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.INSPECTION_SUBMISSION_ENTITY_TYPE
import au.com.heightsafety.domain.MutationOutboxStore
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.OfflineAccessStateStore
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectionSubmissionPayload
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.PhotoUpload
import au.com.heightsafety.domain.PhotoUploadQueueState
import au.com.heightsafety.domain.PhotoUploadQueueStore
import au.com.heightsafety.domain.RecordedDisposition
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.RecordedProofTest
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.SyncMutation
import au.com.heightsafety.domain.SyncMutationOperation
import au.com.heightsafety.domain.SyncMutationState
import au.com.heightsafety.domain.StoredJobPack
import au.com.heightsafety.domain.SupportedJurisdiction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

public class EncryptedJobPackStore(
    context: Context,
    directoryName: String = DEFAULT_DIRECTORY_NAME,
    keyAlias: String = DEFAULT_KEY_ALIAS,
) : FieldJobPackStore,
    AnchorEvidenceSubmissionStore,
    MutationOutboxStore,
    PhotoUploadQueueStore,
    OfflineAccessStateStore,
    FieldSessionStore {
    private val files = JobPackStorageFiles(context.applicationContext, directoryName)
    private val opener = EncryptedJobPackDatabaseOpener(
        context = context.applicationContext,
        files = files,
        passphraseStore = JobPackKeystorePassphraseStore(files, keyAlias),
    )

    override suspend fun save(
        pack: FieldJobPack,
        lease: OfflineAuthorizationLease,
        downloadedAtEpochMillis: Long,
    ) = withContext(Dispatchers.IO) {
        require(lease.companyId == pack.companyId) {
            "job pack lease companyId must match pack"
        }
        require(lease.jobId == pack.jobId) {
            "job pack lease jobId must match pack"
        }
        require(downloadedAtEpochMillis >= 0) {
            "downloadedAtEpochMillis must not be negative"
        }
        opener.open().use { handle ->
            handle.database.jobPackDao().replaceJobPack(
                pack = pack.toEntity(downloadedAtEpochMillis),
                anchors = pack.anchors.map { it.toEntity(pack.jobId) },
                lease = lease.toEntity(),
            )
        }
    }

    override suspend fun load(companyId: String, jobId: String): StoredJobPack? = withContext(Dispatchers.IO) {
        opener.open().use { handle ->
            handle.database.jobPackDao().snapshot(companyId, jobId)?.toDomain()
        }
    }

    override suspend fun updateLease(lease: OfflineAuthorizationLease) =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao().saveLease(lease.toEntity())
            }
        }

    override suspend fun loadOfflineAccessState(
        companyId: String,
        userId: String,
    ) = withContext(Dispatchers.IO) {
        require(companyId.isNotBlank()) { "companyId must not be blank" }
        require(userId.isNotBlank()) { "userId must not be blank" }
        opener.open().use { handle ->
            handle.database.jobPackDao()
                .offlineAccessState(companyId, userId)
                ?.toDomain()
        }
    }

    override suspend fun saveOfflineAccessState(state: FieldOfflineAccessState) =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao().saveOfflineAccessState(state.toEntity())
            }
        }

    override suspend fun loadSession(): FieldSession? = withContext(Dispatchers.IO) {
        opener.open().use { handle ->
            handle.database.jobPackDao().fieldSession()?.toDomain()
        }
    }

    override suspend fun saveSession(session: FieldSession) = withContext(Dispatchers.IO) {
        opener.open().use { handle ->
            handle.database.jobPackDao().saveFieldSession(session.toEntity())
        }
    }

    override suspend fun clearSession() = withContext(Dispatchers.IO) {
        opener.open().use { handle ->
            handle.database.jobPackDao().clearFieldSession()
        }
    }

    override suspend fun loadEvidence(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): List<AnchorInspectionDraft> = withContext(Dispatchers.IO) {
        require(companyId.isNotBlank()) { "companyId must not be blank" }
        require(jobId.isNotBlank()) { "jobId must not be blank" }
        require(jobPackVersion > 0) { "jobPackVersion must be positive" }
        opener.open().use { handle ->
            handle.database.jobPackDao()
                .evidenceSnapshots(companyId, jobId, jobPackVersion)
                .map(AnchorInspectionStorageSnapshot::toDomain)
        }
    }

    override suspend fun saveEvidence(draft: AnchorInspectionDraft) =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao().replaceEvidence(
                    inspection = draft.toEntity(),
                    photos = draft.photos.map { it.toEntity(draft.jobPackVersion) },
                )
            }
        }

    override suspend fun loadSubmission(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): InspectionSubmissionIntent? = withContext(Dispatchers.IO) {
        require(companyId.isNotBlank()) { "companyId must not be blank" }
        require(jobId.isNotBlank()) { "jobId must not be blank" }
        require(jobPackVersion > 0) { "jobPackVersion must be positive" }
        opener.open().use { handle ->
            handle.database.jobPackDao()
                .submission(companyId, jobId, jobPackVersion)
                ?.toDomain()
        }
    }

    override suspend fun queueSubmission(
        intent: InspectionSubmissionIntent,
        frozenEvidence: List<AnchorInspectionDraft>,
        mutation: SyncMutation,
    ): InspectionSubmissionIntent = withContext(Dispatchers.IO) {
        require(intent.syncState == EvidenceSyncState.PENDING) {
            "queued submission must start in pending state"
        }
        require(mutation.isFor(intent)) {
            "submission mutation must match submission intent"
        }
        require(frozenEvidence.all { it.isFor(intent) }) {
            "submission evidence must match submission scope"
        }
        opener.open().use { handle ->
            handle.database.jobPackDao().queueSubmission(
                submission = intent.toEntity(),
                frozenEvidence = frozenEvidence.map { it.toEntity() },
                frozenPhotos = frozenEvidence.flatMap { draft ->
                    draft.photos.map { it.toEntity(draft.jobPackVersion) }
                },
                mutation = mutation.toEntity(),
            ).toDomain()
        }
    }

    /** Compatibility overload for direct adapter tests and existing local callers. */
    public suspend fun queueSubmission(
        intent: InspectionSubmissionIntent,
        frozenEvidence: List<AnchorInspectionDraft>,
    ): InspectionSubmissionIntent = queueSubmission(
        intent = intent,
        frozenEvidence = frozenEvidence,
        mutation = intent.toMutation(),
    )

    override suspend fun enqueueMutation(mutation: SyncMutation): SyncMutation =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao()
                    .enqueueMutation(mutation.toEntity())
                    .toDomain()
            }
        }

    override suspend fun loadNextEligibleMutation(): SyncMutation? =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao()
                    .nextEligibleMutationForAnyCompany()
                    ?.toDomain()
            }
        }

    override suspend fun saveMutation(mutation: SyncMutation) = withContext(Dispatchers.IO) {
        opener.open().use { handle ->
            handle.database.jobPackDao().saveMutation(mutation.toEntity())
        }
    }

    override suspend fun recoverInterruptedMutations(nowEpochMillis: Long) =
        withContext(Dispatchers.IO) {
            require(nowEpochMillis >= 0) {
                "mutation recovery time must not be negative"
            }
            opener.open().use { handle ->
                handle.database.jobPackDao().recoverInterruptedMutations(
                    nowEpochMillis = nowEpochMillis,
                    error = "Synchronisation interrupted before server acknowledgement.",
                )
            }
        }

    override suspend fun recoverInterruptedMutationsForCompany(
        companyId: String,
        nowEpochMillis: Long,
    ) = withContext(Dispatchers.IO) {
        require(companyId.isNotBlank()) { "companyId must not be blank" }
        require(nowEpochMillis >= 0) {
            "mutation recovery time must not be negative"
        }
        opener.open().use { handle ->
            handle.database.jobPackDao().recoverInterruptedMutationsForCompany(
                companyId = companyId,
                nowEpochMillis = nowEpochMillis,
                error = "Synchronisation interrupted before server acknowledgement.",
            )
        }
    }

    override suspend fun loadMutations(companyId: String): List<SyncMutation> =
        withContext(Dispatchers.IO) {
            require(companyId.isNotBlank()) { "companyId must not be blank" }
            opener.open().use { handle ->
                handle.database.jobPackDao().mutations(companyId).map { it.toDomain() }
            }
        }

    override suspend fun loadSubmissionPayload(
        mutation: SyncMutation,
    ): InspectionSubmissionPayload? = withContext(Dispatchers.IO) {
        if (
            mutation.entityType != INSPECTION_SUBMISSION_ENTITY_TYPE ||
            mutation.operation != SyncMutationOperation.SUBMIT_INSPECTION
        ) {
            return@withContext null
        }
        opener.open().use { handle ->
            val dao = handle.database.jobPackDao()
            val submission = dao.submissionByMutation(
                companyId = mutation.companyId,
                mutationId = mutation.mutationId,
            ) ?: return@use null
            check(submission.submissionId == mutation.entityId) {
                "submission payload identity does not match mutation"
            }
            check(submission.jobPackVersion == mutation.entityVersion) {
                "submission payload version does not match mutation"
            }
            val pack = dao.pack(
                companyId = submission.companyId,
                jobId = submission.jobId,
            ) ?: return@use null
            val jurisdiction = when (pack.jurisdiction) {
                SupportedJurisdiction.NSW.value -> SupportedJurisdiction.NSW
                SupportedJurisdiction.QLD.value -> SupportedJurisdiction.QLD
                else -> error("unsupported stored site jurisdiction")
            }
            InspectionSubmissionPayload(
                companyId = submission.companyId,
                jobId = submission.jobId,
                siteId = pack.siteId,
                jurisdiction = jurisdiction,
                submissionId = submission.submissionId,
                jobPackVersion = submission.jobPackVersion,
                anchorInspections = dao
                    .evidenceSnapshots(
                        companyId = submission.companyId,
                        jobId = submission.jobId,
                        jobPackVersion = submission.jobPackVersion,
                    ).map(AnchorInspectionStorageSnapshot::toDomain),
            )
        }
    }

    override suspend fun loadNextEligiblePhotoUpload(): PhotoUpload? =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao()
                    .nextEligiblePhotoUpload()
                    ?.toDomain()
            }
        }

    override suspend fun savePhotoUpload(upload: PhotoUpload) = withContext(Dispatchers.IO) {
        require(upload.mediaId == upload.localId) {
            "photo upload media identity must match localId"
        }
        opener.open().use { handle ->
            val dao = handle.database.jobPackDao()
            val photo = dao.photo(
                companyId = upload.companyId,
                jobId = upload.jobId,
                jobPackVersion = upload.jobPackVersion,
                inspectionId = upload.anchorInspectionId,
                localId = upload.localId,
            ) ?: error("photo upload must have an associated evidence photo")
            check(
                photo.storageReference == upload.storageReference &&
                    photo.capturedAtEpochMillis == upload.capturedAtEpochMillis &&
                    photo.checksum == upload.checksum &&
                    photo.contentType == upload.contentType,
            ) {
                "photo upload metadata does not match evidence photo"
            }
            dao.savePhotoUpload(upload.toEntity())
        }
    }

    override suspend fun recoverInterruptedPhotoUploads(nowEpochMillis: Long) =
        withContext(Dispatchers.IO) {
            require(nowEpochMillis >= 0) {
                "photo upload recovery time must not be negative"
            }
            opener.open().use { handle ->
                handle.database.jobPackDao().recoverInterruptedPhotoUploads(
                    nowEpochMillis = nowEpochMillis,
                    error = "Photo upload interrupted before server acknowledgement.",
                )
            }
        }

    override suspend fun loadPhotoUploads(companyId: String): List<PhotoUpload> =
        withContext(Dispatchers.IO) {
            require(companyId.isNotBlank()) { "companyId must not be blank" }
            opener.open().use { handle ->
                handle.database.jobPackDao().photoUploads(companyId).map { it.toDomain() }
            }
        }

    private companion object {
        const val DEFAULT_DIRECTORY_NAME = "job-pack"
        const val DEFAULT_KEY_ALIAS = "height-safety-job-pack-v1"
    }
}

private fun FieldJobPack.toEntity(downloadedAtEpochMillis: Long): JobPackEntity =
    JobPackEntity(
        jobId = jobId,
        companyId = companyId,
        siteId = siteId,
        jurisdiction = jurisdiction.value,
        reference = reference,
        plannedDate = plannedDate,
        workflowStatus = workflowStatus,
        jobPackVersion = jobPackVersion,
        siteName = siteName,
        siteAddress = siteAddress,
        siteReference = siteReference,
        accessNotes = accessNotes,
        downloadedAtEpochMillis = downloadedAtEpochMillis,
    )

private fun JobPackAnchor.toEntity(jobPackId: String): JobPackAnchorEntity =
    JobPackAnchorEntity(
        jobPackId = jobPackId,
        anchorId = anchorId,
        companyId = companyId,
        siteId = siteId,
        label = label,
        registerId = registerId,
        location = location,
        anchorType = anchorType,
        manufacturer = manufacturer,
        model = model,
        installContext = installContext,
        registerStatus = registerStatus,
        notes = notes,
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
    )

private fun OfflineAuthorizationLease.toEntity(): OfflineAuthorizationLeaseEntity =
    OfflineAuthorizationLeaseEntity(
        jobPackId = jobId,
        companyId = companyId,
        userId = userId,
        issuedAtEpochMillis = issuedAtEpochMillis,
        expiresAtEpochMillis = expiresAtEpochMillis,
        issuedAtElapsedRealtimeMillis = issuedAtElapsedRealtimeMillis,
        lastObservedEpochMillis = lastObservedEpochMillis,
    )

private fun JobPackStorageSnapshot.toDomain(): StoredJobPack {
    val storedLease = lease
        ?: throw StorageUnavailableException(StorageUnavailableReason.LEASE_MISSING)
    return StoredJobPack(
        pack = FieldJobPack(
            companyId = pack.companyId,
            jobId = pack.jobId,
            siteId = pack.siteId,
            jurisdiction = when (pack.jurisdiction) {
                "NSW" -> au.com.heightsafety.domain.SupportedJurisdiction.NSW
                "QLD" -> au.com.heightsafety.domain.SupportedJurisdiction.QLD
                else -> throw StorageUnavailableException(
                    StorageUnavailableReason.DATABASE_OPEN_FAILED,
                )
            },
            reference = pack.reference,
            plannedDate = pack.plannedDate,
            workflowStatus = pack.workflowStatus,
            jobPackVersion = pack.jobPackVersion,
            siteName = pack.siteName,
            siteAddress = pack.siteAddress,
            siteReference = pack.siteReference,
            accessNotes = pack.accessNotes,
            anchors = anchors.map { it.toDomain() },
        ),
        lease = storedLease.toDomain(),
    )
}

private fun JobPackAnchorEntity.toDomain(): JobPackAnchor = JobPackAnchor(
    companyId = companyId,
    anchorId = anchorId,
    siteId = siteId,
    label = label,
    registerId = registerId,
    location = location,
    anchorType = anchorType,
    manufacturer = manufacturer,
    model = model,
    installContext = installContext,
    registerStatus = registerStatus,
    notes = notes,
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
)

private fun OfflineAuthorizationLeaseEntity.toDomain(): OfflineAuthorizationLease =
    OfflineAuthorizationLease(
        companyId = companyId,
        userId = userId,
        jobId = jobPackId,
        issuedAtEpochMillis = issuedAtEpochMillis,
        expiresAtEpochMillis = expiresAtEpochMillis,
        issuedAtElapsedRealtimeMillis = issuedAtElapsedRealtimeMillis,
        lastObservedEpochMillis = lastObservedEpochMillis,
    )

private fun AnchorInspectionDraft.toEntity(): AnchorInspectionEntity =
    AnchorInspectionEntity(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        inspectionId = inspectionId,
        expectedAnchorId = expectedAnchorId,
        provisionalAnchorId = provisionalAnchorId,
        identityConfirmed = identityConfirmed,
        locationConfirmed = locationConfirmed,
        location = location,
        observations = observations,
        recordedOutcome = recordedOutcome?.value,
        exceptionReason = exceptionReason?.value,
        reconciliationProposal = reconciliationProposal?.value,
        reconciliationReferenceId = reconciliationReferenceId,
        disposition = disposition?.value,
        notes = notes,
        defectDescription = defectDescription,
        recommendation = recommendation,
        proofTestLoad = proofTest?.load,
        proofTestHold = proofTest?.hold,
        proofTestResult = proofTest?.result,
        proofTestEquipmentReference = proofTest?.equipmentReference,
        syncState = syncState.value,
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
        submissionId = submissionId,
    )

private fun InspectionSubmissionIntent.toEntity(): InspectionSubmissionEntity =
    InspectionSubmissionEntity(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        submissionId = submissionId,
        mutationId = mutationId,
        inspectorUserId = inspectorUserId,
        sessionId = sessionId,
        syncState = syncState.value,
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
    )

private fun InspectionSubmissionIntent.toMutation(): SyncMutation = SyncMutation(
    companyId = companyId,
    mutationId = mutationId,
    idempotencyKey = mutationId,
    operation = SyncMutationOperation.SUBMIT_INSPECTION,
    entityType = INSPECTION_SUBMISSION_ENTITY_TYPE,
    entityId = submissionId,
    entityVersion = jobPackVersion,
    actorUserId = inspectorUserId,
    sessionId = sessionId,
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
    state = intentSyncStateToMutationState(syncState),
)

private fun intentSyncStateToMutationState(state: EvidenceSyncState): SyncMutationState =
    when (state) {
        EvidenceSyncState.LOCAL -> SyncMutationState.PENDING
        EvidenceSyncState.PENDING -> SyncMutationState.PENDING
        EvidenceSyncState.SYNCHRONISING -> SyncMutationState.SYNCHRONISING
        EvidenceSyncState.SYNCHRONISED -> SyncMutationState.SYNCHRONISED
        EvidenceSyncState.FAILED -> SyncMutationState.FAILED
        EvidenceSyncState.CONFLICT -> SyncMutationState.CONFLICT
    }

private fun SyncMutation.toEntity(): SyncMutationEntity =
    SyncMutationEntity(
        companyId = companyId,
        mutationId = mutationId,
        idempotencyKey = idempotencyKey,
        operation = operation.value,
        entityType = entityType,
        entityId = entityId,
        entityVersion = entityVersion,
        actorUserId = actorUserId,
        sessionId = sessionId,
        state = state.value,
        attemptCount = attemptCount,
        lastError = lastError,
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
    )

private fun SyncMutationEntity.toDomain(): SyncMutation = SyncMutation(
    companyId = companyId,
    mutationId = mutationId,
    idempotencyKey = idempotencyKey,
    operation = operation.toSyncMutationOperation(),
    entityType = entityType,
    entityId = entityId,
    entityVersion = entityVersion,
    actorUserId = actorUserId,
    sessionId = sessionId,
    state = state.toSyncMutationState(),
    attemptCount = attemptCount,
    lastError = lastError,
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
)

private fun AnchorEvidencePhoto.toEntity(jobPackVersion: Long): AnchorEvidencePhotoEntity =
    AnchorEvidencePhotoEntity(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        inspectionId = anchorInspectionId,
        localId = localId,
        storageReference = storageReference,
        capturedAtEpochMillis = capturedAtEpochMillis,
        checksum = checksum,
        uploadState = uploadState.value,
        contentType = contentType,
        byteSize = byteSize,
    )

private fun AnchorInspectionStorageSnapshot.toDomain(): AnchorInspectionDraft {
    val inspection = inspection
    return AnchorInspectionDraft(
        companyId = inspection.companyId,
        jobId = inspection.jobId,
        jobPackVersion = inspection.jobPackVersion,
        inspectionId = inspection.inspectionId,
        expectedAnchorId = inspection.expectedAnchorId,
        provisionalAnchorId = inspection.provisionalAnchorId,
        identityConfirmed = inspection.identityConfirmed,
        locationConfirmed = inspection.locationConfirmed,
        location = inspection.location,
        observations = inspection.observations,
        recordedOutcome = inspection.recordedOutcome?.toRecordedOutcome(),
        exceptionReason = inspection.exceptionReason?.toInspectionExceptionReason(),
        reconciliationProposal = inspection.reconciliationProposal?.toReconciliationProposal(),
        reconciliationReferenceId = inspection.reconciliationReferenceId,
        disposition = inspection.disposition?.toRecordedDisposition(),
        notes = inspection.notes,
        defectDescription = inspection.defectDescription,
        recommendation = inspection.recommendation,
        proofTest = if (
            inspection.proofTestLoad != null ||
            inspection.proofTestHold != null ||
            inspection.proofTestResult != null ||
            inspection.proofTestEquipmentReference != null
        ) {
            RecordedProofTest(
                load = inspection.proofTestLoad,
                hold = inspection.proofTestHold,
                result = inspection.proofTestResult,
                equipmentReference = inspection.proofTestEquipmentReference,
            )
        } else {
            null
        },
        photos = photos.map(AnchorEvidencePhotoEntity::toDomain),
        syncState = inspection.syncState.toEvidenceSyncState(),
        createdAtEpochMillis = inspection.createdAtEpochMillis,
        updatedAtEpochMillis = inspection.updatedAtEpochMillis,
        submissionId = inspection.submissionId,
    )
}

private fun InspectionSubmissionEntity.toDomain(): InspectionSubmissionIntent =
    InspectionSubmissionIntent(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        submissionId = submissionId,
        mutationId = mutationId,
        inspectorUserId = inspectorUserId,
        sessionId = sessionId,
        syncState = syncState.toEvidenceSyncState(),
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
    )

private fun AnchorEvidencePhotoEntity.toDomain(): AnchorEvidencePhoto =
    AnchorEvidencePhoto(
        companyId = companyId,
        jobId = jobId,
        anchorInspectionId = inspectionId,
        localId = localId,
        storageReference = storageReference,
        capturedAtEpochMillis = capturedAtEpochMillis,
        checksum = checksum,
        uploadState = uploadState.toPhotoUploadState(),
        contentType = contentType,
        byteSize = byteSize,
    )

private fun PhotoUpload.toEntity(): PhotoUploadEntity =
    PhotoUploadEntity(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        inspectionId = anchorInspectionId,
        localId = localId,
        mediaId = mediaId,
        state = state.value,
        byteSize = byteSize,
        uploadedBytes = uploadedBytes,
        attemptCount = attemptCount,
        lastError = lastError,
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
    )

private fun PhotoUploadStorageSnapshot.toDomain(): PhotoUpload {
    check(upload.mediaId == upload.localId) {
        "photo upload media identity is invalid"
    }
    return PhotoUpload(
        companyId = upload.companyId,
        jobId = upload.jobId,
        jobPackVersion = upload.jobPackVersion,
        anchorInspectionId = upload.inspectionId,
        localId = upload.localId,
        storageReference = photo.storageReference,
        capturedAtEpochMillis = photo.capturedAtEpochMillis,
        checksum = photo.checksum,
        createdAtEpochMillis = upload.createdAtEpochMillis,
        contentType = photo.contentType,
        byteSize = upload.byteSize,
        state = upload.state.toPhotoUploadQueueState(),
        uploadedBytes = upload.uploadedBytes,
        attemptCount = upload.attemptCount,
        lastError = upload.lastError,
        updatedAtEpochMillis = upload.updatedAtEpochMillis,
    )
}

private fun String.toRecordedOutcome(): RecordedOutcome =
    toStoredEnum(RecordedOutcome.entries, RecordedOutcome::value)

private fun String.toInspectionExceptionReason(): InspectionExceptionReason =
    toStoredEnum(InspectionExceptionReason.entries, InspectionExceptionReason::value)

private fun String.toReconciliationProposal(): ReconciliationProposal =
    toStoredEnum(ReconciliationProposal.entries, ReconciliationProposal::value)

private fun String.toRecordedDisposition(): RecordedDisposition =
    toStoredEnum(RecordedDisposition.entries, RecordedDisposition::value)

private fun String.toEvidenceSyncState(): EvidenceSyncState =
    toStoredEnum(EvidenceSyncState.entries, EvidenceSyncState::value)

private fun String.toSyncMutationOperation(): SyncMutationOperation =
    toStoredEnum(SyncMutationOperation.entries, SyncMutationOperation::value)

private fun String.toSyncMutationState(): SyncMutationState =
    toStoredEnum(SyncMutationState.entries, SyncMutationState::value)

private fun String.toPhotoUploadState(): PhotoUploadState =
    toStoredEnum(PhotoUploadState.entries, PhotoUploadState::value)

private fun String.toPhotoUploadQueueState(): PhotoUploadQueueState =
    toStoredEnum(PhotoUploadQueueState.entries, PhotoUploadQueueState::value)

private fun <T> String.toStoredEnum(
    values: Iterable<T>,
    value: (T) -> String,
): T = values.singleOrNull { value(it) == this }
        ?: throw StorageUnavailableException(StorageUnavailableReason.DATABASE_OPEN_FAILED)

private fun AnchorInspectionDraft.isFor(intent: InspectionSubmissionIntent): Boolean =
    companyId == intent.companyId &&
        jobId == intent.jobId &&
        jobPackVersion == intent.jobPackVersion &&
        submissionId == intent.submissionId &&
        syncState == EvidenceSyncState.PENDING

private fun SyncMutation.isFor(intent: InspectionSubmissionIntent): Boolean =
    companyId == intent.companyId &&
        mutationId == intent.mutationId &&
        idempotencyKey == intent.mutationId &&
        operation == SyncMutationOperation.SUBMIT_INSPECTION &&
        entityType == INSPECTION_SUBMISSION_ENTITY_TYPE &&
        entityId == intent.submissionId &&
        entityVersion == intent.jobPackVersion &&
        actorUserId == intent.inspectorUserId &&
        sessionId == intent.sessionId &&
        createdAtEpochMillis == intent.createdAtEpochMillis &&
        updatedAtEpochMillis == intent.updatedAtEpochMillis &&
        state == intentSyncStateToMutationState(intent.syncState)
