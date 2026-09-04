package au.com.heightsafety.data

import android.content.Context
import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorEvidenceStore
import au.com.heightsafety.domain.AnchorEvidenceSubmissionStore
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldJobPackStore
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.InspectionExceptionReason
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.RecordedDisposition
import au.com.heightsafety.domain.RecordedOutcome
import au.com.heightsafety.domain.RecordedProofTest
import au.com.heightsafety.domain.ReconciliationProposal
import au.com.heightsafety.domain.StoredJobPack
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

public class EncryptedJobPackStore(
    context: Context,
    directoryName: String = DEFAULT_DIRECTORY_NAME,
    keyAlias: String = DEFAULT_KEY_ALIAS,
) : FieldJobPackStore, AnchorEvidenceSubmissionStore {
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
    ): InspectionSubmissionIntent = withContext(Dispatchers.IO) {
        require(intent.syncState == EvidenceSyncState.PENDING) {
            "queued submission must start in pending state"
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
            ).toDomain()
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
    )

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

private fun String.toPhotoUploadState(): PhotoUploadState =
    toStoredEnum(PhotoUploadState.entries, PhotoUploadState::value)

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
