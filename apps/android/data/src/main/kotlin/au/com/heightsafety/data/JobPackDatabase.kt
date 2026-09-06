package au.com.heightsafety.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Update
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import au.com.heightsafety.domain.INSPECTION_SUBMISSION_ENTITY_TYPE
import au.com.heightsafety.domain.SyncMutationOperation

@Entity(
    tableName = "job_pack",
    primaryKeys = ["companyId", "jobId"],
)
internal data class JobPackEntity(
    val companyId: String,
    val jobId: String,
    val siteId: String,
    val jurisdiction: String,
    val reference: String,
    val plannedDate: String?,
    val workflowStatus: String,
    val jobPackVersion: Long,
    val siteName: String,
    val siteAddress: String?,
    val siteReference: String?,
    val accessNotes: String?,
    val downloadedAtEpochMillis: Long,
)

@Entity(
    tableName = "job_pack_anchor",
    primaryKeys = ["companyId", "jobPackId", "anchorId"],
    indices = [Index(value = ["companyId", "jobPackId"])],
    foreignKeys = [
        ForeignKey(
            entity = JobPackEntity::class,
            parentColumns = ["companyId", "jobId"],
            childColumns = ["companyId", "jobPackId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
)
internal data class JobPackAnchorEntity(
    val jobPackId: String,
    val anchorId: String,
    val companyId: String,
    val siteId: String,
    val label: String?,
    val registerId: String?,
    val location: String?,
    val anchorType: String,
    val manufacturer: String?,
    val model: String?,
    val installContext: String?,
    val registerStatus: String,
    val notes: String?,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
)

@Entity(
    tableName = "offline_authorization_lease",
    primaryKeys = ["companyId", "jobPackId"],
    foreignKeys = [
        ForeignKey(
            entity = JobPackEntity::class,
            parentColumns = ["companyId", "jobId"],
            childColumns = ["companyId", "jobPackId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
)
internal data class OfflineAuthorizationLeaseEntity(
    val jobPackId: String,
    val companyId: String,
    val userId: String,
    val issuedAtEpochMillis: Long,
    val expiresAtEpochMillis: Long,
    val issuedAtElapsedRealtimeMillis: Long,
    val lastObservedEpochMillis: Long,
)

@Entity(
    tableName = "anchor_inspection",
    primaryKeys = ["companyId", "jobId", "jobPackVersion", "inspectionId"],
    indices = [Index(value = ["companyId", "jobId", "jobPackVersion"])],
    foreignKeys = [
        ForeignKey(
            entity = JobPackEntity::class,
            parentColumns = ["companyId", "jobId"],
            childColumns = ["companyId", "jobId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
)
internal data class AnchorInspectionEntity(
    val companyId: String,
    val jobId: String,
    val jobPackVersion: Long,
    val inspectionId: String,
    val expectedAnchorId: String?,
    val provisionalAnchorId: String?,
    val identityConfirmed: Boolean,
    val locationConfirmed: Boolean,
    val location: String?,
    val observations: String?,
    val recordedOutcome: String?,
    val exceptionReason: String?,
    val reconciliationProposal: String?,
    val reconciliationReferenceId: String?,
    val disposition: String?,
    val notes: String?,
    val defectDescription: String?,
    val recommendation: String?,
    val proofTestLoad: String?,
    val proofTestHold: String?,
    val proofTestResult: String?,
    val proofTestEquipmentReference: String?,
    val syncState: String,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
    val submissionId: String?,
)

@Entity(
    tableName = "anchor_evidence_photo",
    primaryKeys = ["companyId", "jobId", "jobPackVersion", "inspectionId", "localId"],
    indices = [Index(value = ["companyId", "jobId", "jobPackVersion", "inspectionId"])],
    foreignKeys = [
        ForeignKey(
            entity = AnchorInspectionEntity::class,
            parentColumns = ["companyId", "jobId", "jobPackVersion", "inspectionId"],
            childColumns = ["companyId", "jobId", "jobPackVersion", "inspectionId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
internal data class AnchorEvidencePhotoEntity(
    val companyId: String,
    val jobId: String,
    val jobPackVersion: Long,
    val inspectionId: String,
    val localId: String,
    val storageReference: String,
    val capturedAtEpochMillis: Long,
    val checksum: String,
    val uploadState: String,
    val contentType: String?,
    val byteSize: Long?,
)

@Entity(
    tableName = "photo_upload",
    primaryKeys = ["companyId", "jobId", "jobPackVersion", "inspectionId", "localId"],
    indices = [Index(value = ["companyId", "state", "createdAtEpochMillis"])],
    foreignKeys = [
        ForeignKey(
            entity = AnchorEvidencePhotoEntity::class,
            parentColumns = [
                "companyId",
                "jobId",
                "jobPackVersion",
                "inspectionId",
                "localId",
            ],
            childColumns = [
                "companyId",
                "jobId",
                "jobPackVersion",
                "inspectionId",
                "localId",
            ],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
internal data class PhotoUploadEntity(
    val companyId: String,
    val jobId: String,
    val jobPackVersion: Long,
    val inspectionId: String,
    val localId: String,
    val mediaId: String,
    val state: String,
    val byteSize: Long?,
    val uploadedBytes: Long,
    val attemptCount: Int,
    val lastError: String?,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
)

@Entity(
    tableName = "inspection_submission",
    primaryKeys = ["companyId", "jobId", "jobPackVersion"],
    indices = [Index(value = ["companyId", "mutationId"], unique = true)],
    foreignKeys = [
        ForeignKey(
            entity = JobPackEntity::class,
            parentColumns = ["companyId", "jobId"],
            childColumns = ["companyId", "jobId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
)
internal data class InspectionSubmissionEntity(
    val companyId: String,
    val jobId: String,
    val jobPackVersion: Long,
    val submissionId: String,
    val mutationId: String,
    val inspectorUserId: String,
    val sessionId: String,
    val syncState: String,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
)

@Entity(
    tableName = "sync_mutation",
    primaryKeys = ["companyId", "mutationId"],
    indices = [
        Index(value = ["companyId", "idempotencyKey"], unique = true),
        Index(value = ["companyId", "state", "createdAtEpochMillis"]),
    ],
)
internal data class SyncMutationEntity(
    val companyId: String,
    val mutationId: String,
    val idempotencyKey: String,
    val operation: String,
    val entityType: String,
    val entityId: String,
    val entityVersion: Long,
    val actorUserId: String,
    val sessionId: String,
    val state: String,
    val attemptCount: Int,
    val lastError: String?,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
)

internal data class JobPackStorageSnapshot(
    val pack: JobPackEntity,
    val anchors: List<JobPackAnchorEntity>,
    val lease: OfflineAuthorizationLeaseEntity?,
)

internal data class AnchorInspectionStorageSnapshot(
    val inspection: AnchorInspectionEntity,
    val photos: List<AnchorEvidencePhotoEntity>,
)

internal data class PhotoUploadStorageSnapshot(
    val upload: PhotoUploadEntity,
    val photo: AnchorEvidencePhotoEntity,
)

@Dao
internal abstract class JobPackDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract fun insertPackIfMissing(pack: JobPackEntity)

    @Update
    protected abstract fun updatePack(pack: JobPackEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replaceAnchors(anchors: List<JobPackAnchorEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replaceLease(lease: OfflineAuthorizationLeaseEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract fun insertInspectionIfMissing(inspection: AnchorInspectionEntity): Long

    @Update
    protected abstract fun updateInspection(inspection: AnchorInspectionEntity): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract fun insertPhotoIfMissing(photo: AnchorEvidencePhotoEntity): Long

    @Update
    protected abstract fun updatePhoto(photo: AnchorEvidencePhotoEntity): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract fun insertPhotoUploadIfMissing(upload: PhotoUploadEntity): Long

    @Update
    protected abstract fun updatePhotoUpload(upload: PhotoUploadEntity): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract fun insertSubmissionIfMissing(
        submission: InspectionSubmissionEntity,
    ): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract fun insertMutationIfMissing(mutation: SyncMutationEntity): Long

    @Update
    protected abstract fun updateMutation(mutation: SyncMutationEntity): Int

    @Query(
        "DELETE FROM job_pack_anchor " +
            "WHERE companyId = :companyId AND jobPackId = :jobId",
    )
    protected abstract fun deleteAnchors(companyId: String, jobId: String)

    @Query(
        "DELETE FROM offline_authorization_lease " +
            "WHERE companyId = :companyId AND jobPackId = :jobId",
    )
    protected abstract fun deleteLease(companyId: String, jobId: String)

    @Query(
        "DELETE FROM anchor_evidence_photo " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId " +
            "AND localId = :localId",
    )
    protected abstract fun deletePhoto(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
        localId: String,
    )

    @Query("SELECT * FROM job_pack WHERE companyId = :companyId AND jobId = :jobId")
    protected abstract fun findPack(companyId: String, jobId: String): JobPackEntity?

    @Query(
        "SELECT * FROM job_pack_anchor " +
            "WHERE companyId = :companyId AND jobPackId = :jobId ORDER BY anchorId",
    )
    protected abstract fun findAnchors(companyId: String, jobId: String): List<JobPackAnchorEntity>

    @Query(
        "SELECT * FROM offline_authorization_lease " +
            "WHERE companyId = :companyId AND jobPackId = :jobId",
    )
    protected abstract fun findLease(companyId: String, jobId: String): OfflineAuthorizationLeaseEntity?

    @Query(
        "SELECT * FROM anchor_inspection " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion ORDER BY inspectionId",
    )
    protected abstract fun findInspections(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): List<AnchorInspectionEntity>

    @Query(
        "SELECT * FROM anchor_evidence_photo " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId " +
            "ORDER BY localId",
    )
    protected abstract fun findPhotos(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
    ): List<AnchorEvidencePhotoEntity>

    @Query(
        "SELECT * FROM anchor_evidence_photo " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId " +
            "AND localId = :localId",
    )
    protected abstract fun findPhoto(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
        localId: String,
    ): AnchorEvidencePhotoEntity?

    @Query(
        "SELECT * FROM anchor_inspection " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId",
    )
    protected abstract fun findInspection(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
    ): AnchorInspectionEntity?

    @Query(
        "SELECT * FROM inspection_submission " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion",
    )
    protected abstract fun findSubmission(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): InspectionSubmissionEntity?

    @Query(
        "SELECT * FROM inspection_submission " +
            "WHERE companyId = :companyId AND mutationId = :mutationId",
    )
    protected abstract fun findSubmissionByMutation(
        companyId: String,
        mutationId: String,
    ): InspectionSubmissionEntity?

    @Query(
        "SELECT * FROM sync_mutation " +
            "WHERE companyId = :companyId AND mutationId = :mutationId",
    )
    protected abstract fun findMutation(
        companyId: String,
        mutationId: String,
    ): SyncMutationEntity?

    @Query(
        "SELECT * FROM sync_mutation " +
            "WHERE companyId = :companyId AND state IN ('pending', 'failed') " +
            "ORDER BY createdAtEpochMillis, mutationId LIMIT 1",
    )
    protected abstract fun findNextEligibleMutation(companyId: String): SyncMutationEntity?

    @Query(
        "SELECT * FROM sync_mutation " +
            "WHERE state IN ('pending', 'failed') " +
            "ORDER BY createdAtEpochMillis, companyId, mutationId LIMIT 1",
    )
    protected abstract fun findNextEligibleMutationForAnyCompany(): SyncMutationEntity?

    @Query(
        "SELECT * FROM sync_mutation " +
            "WHERE companyId = :companyId ORDER BY createdAtEpochMillis, mutationId",
    )
    protected abstract fun findMutations(companyId: String): List<SyncMutationEntity>

    @Query(
        "SELECT * FROM sync_mutation " +
            "WHERE state = 'synchronising' ORDER BY companyId, mutationId",
    )
    protected abstract fun findInterruptedMutations(): List<SyncMutationEntity>

    @Query(
        "SELECT * FROM sync_mutation " +
            "WHERE companyId = :companyId AND state = 'synchronising' " +
            "ORDER BY mutationId",
    )
    protected abstract fun findInterruptedMutationsForCompany(
        companyId: String,
    ): List<SyncMutationEntity>

    @Query(
        "SELECT * FROM photo_upload " +
            "WHERE state IN ('pending_upload', 'failed') " +
            "ORDER BY createdAtEpochMillis, companyId, jobId, jobPackVersion, inspectionId, localId " +
            "LIMIT 1",
    )
    protected abstract fun findNextEligiblePhotoUpload(): PhotoUploadEntity?

    @Query(
        "SELECT * FROM photo_upload " +
            "WHERE companyId = :companyId " +
            "ORDER BY createdAtEpochMillis, jobId, jobPackVersion, inspectionId, localId",
    )
    protected abstract fun findPhotoUploads(companyId: String): List<PhotoUploadEntity>

    @Query("SELECT * FROM photo_upload WHERE state = 'uploading'")
    protected abstract fun findInterruptedPhotoUploads(): List<PhotoUploadEntity>

    @Query(
        "SELECT * FROM photo_upload " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId " +
            "AND localId = :localId",
    )
    protected abstract fun findPhotoUpload(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
        localId: String,
    ): PhotoUploadEntity?

    @Query(
        "UPDATE anchor_evidence_photo SET uploadState = :uploadState, byteSize = :byteSize " +
            "WHERE companyId = :companyId AND jobId = :jobId " +
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId " +
            "AND localId = :localId",
    )
    protected abstract fun updateVisiblePhotoUploadState(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
        localId: String,
        uploadState: String,
        byteSize: Long?,
    ): Int

    @Query(
        "UPDATE inspection_submission SET syncState = :state, " +
            "updatedAtEpochMillis = :updatedAtEpochMillis " +
            "WHERE companyId = :companyId AND mutationId = :mutationId",
    )
    protected abstract fun updateSubmissionSyncState(
        companyId: String,
        mutationId: String,
        state: String,
        updatedAtEpochMillis: Long,
    )

    @Query(
        "UPDATE anchor_inspection SET syncState = :state, " +
            "updatedAtEpochMillis = :updatedAtEpochMillis " +
            "WHERE companyId = :companyId AND submissionId = " +
            "(SELECT submissionId FROM inspection_submission " +
            "WHERE companyId = :companyId AND mutationId = :mutationId)",
    )
    protected abstract fun updateEvidenceSyncState(
        companyId: String,
        mutationId: String,
        state: String,
        updatedAtEpochMillis: Long,
    )

    fun submission(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): InspectionSubmissionEntity? = findSubmission(companyId, jobId, jobPackVersion)

    fun submissionByMutation(
        companyId: String,
        mutationId: String,
    ): InspectionSubmissionEntity? = findSubmissionByMutation(companyId, mutationId)

    fun pack(companyId: String, jobId: String): JobPackEntity? =
        findPack(companyId, jobId)

    fun nextEligibleMutation(companyId: String): SyncMutationEntity? =
        findNextEligibleMutation(companyId)

    fun nextEligibleMutationForAnyCompany(): SyncMutationEntity? =
        findNextEligibleMutationForAnyCompany()

    fun mutation(companyId: String, mutationId: String): SyncMutationEntity? =
        findMutation(companyId, mutationId)

    fun mutations(companyId: String): List<SyncMutationEntity> = findMutations(companyId)

    @Transaction
    open fun nextEligiblePhotoUpload(): PhotoUploadStorageSnapshot? {
        val upload = findNextEligiblePhotoUpload() ?: return null
        val photo = findPhoto(
            companyId = upload.companyId,
            jobId = upload.jobId,
            jobPackVersion = upload.jobPackVersion,
            inspectionId = upload.inspectionId,
            localId = upload.localId,
        ) ?: error("photo upload has no associated evidence photo")
        return PhotoUploadStorageSnapshot(upload = upload, photo = photo)
    }

    fun photo(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
        localId: String,
    ): AnchorEvidencePhotoEntity? = findPhoto(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        inspectionId = inspectionId,
        localId = localId,
    )

    @Transaction
    open fun photoUploads(companyId: String): List<PhotoUploadStorageSnapshot> =
        findPhotoUploads(companyId).map { upload ->
            val photo = findPhoto(
                companyId = upload.companyId,
                jobId = upload.jobId,
                jobPackVersion = upload.jobPackVersion,
                inspectionId = upload.inspectionId,
                localId = upload.localId,
            ) ?: error("photo upload has no associated evidence photo")
            PhotoUploadStorageSnapshot(upload = upload, photo = photo)
        }

    @Transaction
    open fun recoverInterruptedPhotoUploads(
        nowEpochMillis: Long,
        error: String,
    ) {
        findInterruptedPhotoUploads().forEach { upload ->
            val recovered = upload.copy(
                state = "failed",
                lastError = error,
                updatedAtEpochMillis = nowEpochMillis,
            )
            updatePhotoUpload(recovered)
            updateVisiblePhotoUploadState(
                companyId = recovered.companyId,
                jobId = recovered.jobId,
                jobPackVersion = recovered.jobPackVersion,
                inspectionId = recovered.inspectionId,
                localId = recovered.localId,
                uploadState = recovered.state.toVisiblePhotoUploadState(),
                byteSize = recovered.byteSize ?: findPhoto(
                    companyId = recovered.companyId,
                    jobId = recovered.jobId,
                    jobPackVersion = recovered.jobPackVersion,
                    inspectionId = recovered.inspectionId,
                    localId = recovered.localId,
                )?.byteSize,
            )
        }
    }

    @Transaction
    open fun savePhotoUpload(upload: PhotoUploadEntity) {
        val photo = findPhoto(
            companyId = upload.companyId,
            jobId = upload.jobId,
            jobPackVersion = upload.jobPackVersion,
            inspectionId = upload.inspectionId,
            localId = upload.localId,
        ) ?: error("photo upload must have an associated evidence photo")
        check(upload.mediaId == photo.localId) {
            "photo upload media identity does not match evidence photo"
        }
        val existing = findPhotoUpload(
            companyId = upload.companyId,
            jobId = upload.jobId,
            jobPackVersion = upload.jobPackVersion,
            inspectionId = upload.inspectionId,
            localId = upload.localId,
        )
        if (existing == null) {
            insertPhotoUploadIfMissing(upload)
        } else {
            check(existing.sameIdentityAs(upload)) {
                "photo upload identity collision"
            }
            check(updatePhotoUpload(upload) == 1) {
                "photo upload update was not applied"
            }
        }
        val stored = findPhotoUpload(
            companyId = upload.companyId,
            jobId = upload.jobId,
            jobPackVersion = upload.jobPackVersion,
            inspectionId = upload.inspectionId,
            localId = upload.localId,
        ) ?: error("photo upload was not stored")
        check(stored.sameIdentityAs(upload)) {
            "photo upload identity collision"
        }
        updateVisiblePhotoUploadState(
            companyId = stored.companyId,
            jobId = stored.jobId,
            jobPackVersion = stored.jobPackVersion,
            inspectionId = stored.inspectionId,
            localId = stored.localId,
            uploadState = stored.state.toVisiblePhotoUploadState(),
            byteSize = stored.byteSize ?: photo.byteSize,
        )
    }

    @Transaction
    open fun enqueueMutation(mutation: SyncMutationEntity): SyncMutationEntity {
        findMutation(mutation.companyId, mutation.mutationId)?.let { existing ->
            check(existing.sameIdentityAs(mutation)) {
                "mutation identity collision"
            }
            return existing
        }
        insertMutationIfMissing(mutation)
        val stored = findMutation(mutation.companyId, mutation.mutationId)
            ?: error("mutation was not stored")
        check(stored.sameIdentityAs(mutation)) {
            "mutation identity collision"
        }
        updateVisibleMutationState(stored)
        return stored
    }

    @Transaction
    open fun recoverInterruptedMutations(
        nowEpochMillis: Long,
        error: String,
    ) {
        findInterruptedMutations().forEach { mutation ->
            val recovered = mutation.copy(
                state = "failed",
                lastError = error,
                updatedAtEpochMillis = nowEpochMillis,
            )
            updateMutation(recovered)
            updateVisibleMutationState(recovered)
        }
    }

    @Transaction
    open fun recoverInterruptedMutationsForCompany(
        companyId: String,
        nowEpochMillis: Long,
        error: String,
    ) {
        findInterruptedMutationsForCompany(companyId).forEach { mutation ->
            val recovered = mutation.copy(
                state = "failed",
                lastError = error,
                updatedAtEpochMillis = nowEpochMillis,
            )
            updateMutation(recovered)
            updateVisibleMutationState(recovered)
        }
    }

    @Transaction
    open fun saveMutation(mutation: SyncMutationEntity) {
        val existing = findMutation(mutation.companyId, mutation.mutationId)
        if (existing == null) {
            insertMutationIfMissing(mutation)
        } else {
            check(existing.sameIdentityAs(mutation)) {
                "mutation identity collision"
            }
            check(updateMutation(mutation) == 1) {
                "mutation update was not applied"
            }
        }
        val stored = findMutation(mutation.companyId, mutation.mutationId)
            ?: error("mutation was not stored")
        check(stored.sameIdentityAs(mutation)) {
            "mutation identity collision"
        }
        updateVisibleMutationState(stored)
    }

    private fun updateVisibleMutationState(mutation: SyncMutationEntity) {
        if (
            mutation.entityType == INSPECTION_SUBMISSION_ENTITY_TYPE &&
            mutation.operation == SyncMutationOperation.SUBMIT_INSPECTION.value
        ) {
            updateSubmissionSyncState(
                companyId = mutation.companyId,
                mutationId = mutation.mutationId,
                state = mutation.state,
                updatedAtEpochMillis = mutation.updatedAtEpochMillis,
            )
            updateEvidenceSyncState(
                companyId = mutation.companyId,
                mutationId = mutation.mutationId,
                state = mutation.state,
                updatedAtEpochMillis = mutation.updatedAtEpochMillis,
            )
        }
    }

    @Transaction
    open fun replaceJobPack(
        pack: JobPackEntity,
        anchors: List<JobPackAnchorEntity>,
        lease: OfflineAuthorizationLeaseEntity,
    ) {
        deleteLease(pack.companyId, pack.jobId)
        deleteAnchors(pack.companyId, pack.jobId)
        insertPackIfMissing(pack)
        updatePack(pack)
        replaceAnchors(anchors)
        replaceLease(lease)
    }

    @Transaction
    open fun snapshot(companyId: String, jobId: String): JobPackStorageSnapshot? {
        val pack = findPack(companyId, jobId) ?: return null
        return JobPackStorageSnapshot(
            pack = pack,
            anchors = findAnchors(companyId, jobId),
            lease = findLease(companyId, jobId),
        )
    }

    @Transaction
    open fun replaceEvidence(
        inspection: AnchorInspectionEntity,
        photos: List<AnchorEvidencePhotoEntity>,
    ) {
        if (
            findInspection(
                companyId = inspection.companyId,
                jobId = inspection.jobId,
                jobPackVersion = inspection.jobPackVersion,
                inspectionId = inspection.inspectionId,
            )?.submissionId != null
        ) {
            error("submitted local evidence is immutable")
        }
        saveInspection(inspection)
        val incomingKeys = photos.map { it.photoKey() }.toSet()
        findPhotos(
            companyId = inspection.companyId,
            jobId = inspection.jobId,
            jobPackVersion = inspection.jobPackVersion,
            inspectionId = inspection.inspectionId,
        ).filterNot { it.photoKey() in incomingKeys }.forEach { photo ->
            deletePhoto(
                companyId = photo.companyId,
                jobId = photo.jobId,
                jobPackVersion = photo.jobPackVersion,
                inspectionId = photo.inspectionId,
                localId = photo.localId,
            )
        }
        photos.forEach(::saveEvidencePhoto)
    }

    @Transaction
    open fun evidenceSnapshots(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
    ): List<AnchorInspectionStorageSnapshot> = findInspections(
        companyId = companyId,
        jobId = jobId,
        jobPackVersion = jobPackVersion,
        ).map { inspection ->
        AnchorInspectionStorageSnapshot(
            inspection = inspection,
            photos = findPhotos(
                companyId,
                jobId,
                inspection.jobPackVersion,
                inspection.inspectionId,
            ),
        )
    }

    @Transaction
    open fun queueSubmission(
        submission: InspectionSubmissionEntity,
        frozenEvidence: List<AnchorInspectionEntity>,
        frozenPhotos: List<AnchorEvidencePhotoEntity>,
        mutation: SyncMutationEntity,
    ): InspectionSubmissionEntity {
        findSubmission(
            companyId = submission.companyId,
            jobId = submission.jobId,
            jobPackVersion = submission.jobPackVersion,
        )?.let { return it }
        insertSubmissionIfMissing(submission)
        val stored = findSubmission(
            companyId = submission.companyId,
            jobId = submission.jobId,
            jobPackVersion = submission.jobPackVersion,
        ) ?: error("queued submission was not stored")
        if (
            stored.submissionId == submission.submissionId &&
            stored.mutationId == submission.mutationId
        ) {
            insertMutationIfMissing(mutation)
            val storedMutation = findMutation(mutation.companyId, mutation.mutationId)
                ?: error("queued mutation was not stored")
            check(storedMutation.sameIdentityAs(mutation)) {
                "mutation identity collision"
            }
            frozenEvidence.forEach(::saveInspection)
            frozenPhotos.groupBy { it.photoKey() }.values.forEach { photoVersions ->
                saveEvidencePhoto(photoVersions.single())
            }
        }
        return stored
    }

    private fun saveInspection(inspection: AnchorInspectionEntity) {
        val existing = findInspection(
            companyId = inspection.companyId,
            jobId = inspection.jobId,
            jobPackVersion = inspection.jobPackVersion,
            inspectionId = inspection.inspectionId,
        )
        if (existing == null) {
            insertInspectionIfMissing(inspection)
        } else {
            check(updateInspection(inspection) == 1) {
                "inspection update was not applied"
            }
        }
    }

    private fun saveEvidencePhoto(photo: AnchorEvidencePhotoEntity) {
        val existing = findPhoto(
            companyId = photo.companyId,
            jobId = photo.jobId,
            jobPackVersion = photo.jobPackVersion,
            inspectionId = photo.inspectionId,
            localId = photo.localId,
        )
        val upload = findPhotoUpload(
            companyId = photo.companyId,
            jobId = photo.jobId,
            jobPackVersion = photo.jobPackVersion,
            inspectionId = photo.inspectionId,
            localId = photo.localId,
        )
        val visiblePhoto = photo.copy(
            uploadState = upload?.state.toVisiblePhotoUploadState(),
            byteSize = upload?.byteSize ?: photo.byteSize,
        )
        if (existing == null) {
            insertPhotoIfMissing(visiblePhoto)
        } else {
            check(existing.sameIdentityAs(photo)) {
                "photo identity collision"
            }
            check(updatePhoto(visiblePhoto) == 1) {
                "photo update was not applied"
            }
        }
        if (upload == null) {
            savePhotoUpload(
                PhotoUploadEntity(
                    companyId = photo.companyId,
                    jobId = photo.jobId,
                    jobPackVersion = photo.jobPackVersion,
                    inspectionId = photo.inspectionId,
                    localId = photo.localId,
                    mediaId = photo.localId,
                    state = "pending_upload",
                    byteSize = photo.byteSize,
                    uploadedBytes = 0L,
                    attemptCount = 0,
                    lastError = null,
                    createdAtEpochMillis = photo.capturedAtEpochMillis,
                    updatedAtEpochMillis = photo.capturedAtEpochMillis,
                ),
            )
        } else {
            if (photo.byteSize != null && upload.byteSize != null) {
                check(photo.byteSize == upload.byteSize) {
                    "photo content size changed for stable media identity"
                }
            }
            updateVisiblePhotoUploadState(
                companyId = upload.companyId,
                jobId = upload.jobId,
                jobPackVersion = upload.jobPackVersion,
                inspectionId = upload.inspectionId,
                localId = upload.localId,
                uploadState = upload.state.toVisiblePhotoUploadState(),
                byteSize = upload.byteSize ?: photo.byteSize,
            )
        }
    }

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract fun saveLease(lease: OfflineAuthorizationLeaseEntity)
}

private fun SyncMutationEntity.sameIdentityAs(other: SyncMutationEntity): Boolean =
    companyId == other.companyId &&
        mutationId == other.mutationId &&
        idempotencyKey == other.idempotencyKey &&
        operation == other.operation &&
        entityType == other.entityType &&
        entityId == other.entityId &&
        entityVersion == other.entityVersion &&
        actorUserId == other.actorUserId &&
        sessionId == other.sessionId

private fun PhotoUploadEntity.sameIdentityAs(other: PhotoUploadEntity): Boolean =
    companyId == other.companyId &&
        jobId == other.jobId &&
        jobPackVersion == other.jobPackVersion &&
        inspectionId == other.inspectionId &&
        localId == other.localId &&
        mediaId == other.mediaId

private fun AnchorEvidencePhotoEntity.photoKey(): String =
    listOf(companyId, jobId, jobPackVersion, inspectionId, localId).joinToString("\u0000")

private fun AnchorEvidencePhotoEntity.sameIdentityAs(
    other: AnchorEvidencePhotoEntity,
): Boolean =
    companyId == other.companyId &&
        jobId == other.jobId &&
        jobPackVersion == other.jobPackVersion &&
        inspectionId == other.inspectionId &&
        localId == other.localId &&
        storageReference == other.storageReference &&
        capturedAtEpochMillis == other.capturedAtEpochMillis &&
        checksum == other.checksum &&
        contentType == other.contentType

private fun String?.toVisiblePhotoUploadState(): String = when (this) {
    "uploaded" -> "uploaded"
    "failed" -> "failed"
    else -> "pending_upload"
}

internal val JOB_PACK_MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS anchor_inspection (
                companyId TEXT NOT NULL,
                jobId TEXT NOT NULL,
                inspectionId TEXT NOT NULL,
                jobPackVersion INTEGER NOT NULL,
                expectedAnchorId TEXT,
                provisionalAnchorId TEXT,
                identityConfirmed INTEGER NOT NULL,
                locationConfirmed INTEGER NOT NULL,
                location TEXT,
                observations TEXT,
                recordedOutcome TEXT,
                exceptionReason TEXT,
                reconciliationProposal TEXT,
                reconciliationReferenceId TEXT,
                disposition TEXT,
                notes TEXT,
                defectDescription TEXT,
                recommendation TEXT,
                proofTestLoad TEXT,
                proofTestHold TEXT,
                proofTestResult TEXT,
                proofTestEquipmentReference TEXT,
                syncState TEXT NOT NULL,
                createdAtEpochMillis INTEGER NOT NULL,
                updatedAtEpochMillis INTEGER NOT NULL,
                PRIMARY KEY(companyId, jobId, inspectionId),
                FOREIGN KEY(companyId, jobId)
                    REFERENCES job_pack(companyId, jobId)
                    ON UPDATE NO ACTION ON DELETE RESTRICT
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS index_anchor_inspection_companyId_jobId " +
                "ON anchor_inspection(companyId, jobId)",
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS anchor_evidence_photo (
                companyId TEXT NOT NULL,
                jobId TEXT NOT NULL,
                inspectionId TEXT NOT NULL,
                localId TEXT NOT NULL,
                storageReference TEXT NOT NULL,
                capturedAtEpochMillis INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                uploadState TEXT NOT NULL,
                contentType TEXT,
                PRIMARY KEY(companyId, jobId, inspectionId, localId),
                FOREIGN KEY(companyId, jobId, inspectionId)
                    REFERENCES anchor_inspection(companyId, jobId, inspectionId)
                    ON UPDATE NO ACTION ON DELETE CASCADE
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS index_anchor_evidence_photo_companyId_jobId_inspectionId " +
                "ON anchor_evidence_photo(companyId, jobId, inspectionId)",
        )
    }
}

internal val JOB_PACK_MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE anchor_inspection_v3 (
                companyId TEXT NOT NULL,
                jobId TEXT NOT NULL,
                jobPackVersion INTEGER NOT NULL,
                inspectionId TEXT NOT NULL,
                expectedAnchorId TEXT,
                provisionalAnchorId TEXT,
                identityConfirmed INTEGER NOT NULL,
                locationConfirmed INTEGER NOT NULL,
                location TEXT,
                observations TEXT,
                recordedOutcome TEXT,
                exceptionReason TEXT,
                reconciliationProposal TEXT,
                reconciliationReferenceId TEXT,
                disposition TEXT,
                notes TEXT,
                defectDescription TEXT,
                recommendation TEXT,
                proofTestLoad TEXT,
                proofTestHold TEXT,
                proofTestResult TEXT,
                proofTestEquipmentReference TEXT,
                syncState TEXT NOT NULL,
                createdAtEpochMillis INTEGER NOT NULL,
                updatedAtEpochMillis INTEGER NOT NULL,
                PRIMARY KEY(companyId, jobId, jobPackVersion, inspectionId),
                FOREIGN KEY(companyId, jobId)
                    REFERENCES job_pack(companyId, jobId)
                    ON UPDATE NO ACTION ON DELETE RESTRICT
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            INSERT INTO anchor_inspection_v3 (
                companyId,
                jobId,
                jobPackVersion,
                inspectionId,
                expectedAnchorId,
                provisionalAnchorId,
                identityConfirmed,
                locationConfirmed,
                location,
                observations,
                recordedOutcome,
                exceptionReason,
                reconciliationProposal,
                reconciliationReferenceId,
                disposition,
                notes,
                defectDescription,
                recommendation,
                proofTestLoad,
                proofTestHold,
                proofTestResult,
                proofTestEquipmentReference,
                syncState,
                createdAtEpochMillis,
                updatedAtEpochMillis
            )
            SELECT
                companyId,
                jobId,
                jobPackVersion,
                inspectionId,
                expectedAnchorId,
                provisionalAnchorId,
                identityConfirmed,
                locationConfirmed,
                location,
                observations,
                recordedOutcome,
                exceptionReason,
                reconciliationProposal,
                reconciliationReferenceId,
                disposition,
                notes,
                defectDescription,
                recommendation,
                proofTestLoad,
                proofTestHold,
                proofTestResult,
                proofTestEquipmentReference,
                syncState,
                createdAtEpochMillis,
                updatedAtEpochMillis
            FROM anchor_inspection
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE anchor_evidence_photo_v3 (
                companyId TEXT NOT NULL,
                jobId TEXT NOT NULL,
                jobPackVersion INTEGER NOT NULL,
                inspectionId TEXT NOT NULL,
                localId TEXT NOT NULL,
                storageReference TEXT NOT NULL,
                capturedAtEpochMillis INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                uploadState TEXT NOT NULL,
                contentType TEXT,
                PRIMARY KEY(companyId, jobId, jobPackVersion, inspectionId, localId),
                FOREIGN KEY(companyId, jobId, jobPackVersion, inspectionId)
                    REFERENCES anchor_inspection_v3(
                        companyId,
                        jobId,
                        jobPackVersion,
                        inspectionId
                    )
                    ON UPDATE NO ACTION ON DELETE CASCADE
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            INSERT INTO anchor_evidence_photo_v3 (
                companyId,
                jobId,
                jobPackVersion,
                inspectionId,
                localId,
                storageReference,
                capturedAtEpochMillis,
                checksum,
                uploadState,
                contentType
            )
            SELECT
                photo.companyId,
                photo.jobId,
                inspection.jobPackVersion,
                photo.inspectionId,
                photo.localId,
                photo.storageReference,
                photo.capturedAtEpochMillis,
                photo.checksum,
                photo.uploadState,
                photo.contentType
            FROM anchor_evidence_photo AS photo
            INNER JOIN anchor_inspection AS inspection
                ON inspection.companyId = photo.companyId
                AND inspection.jobId = photo.jobId
                AND inspection.inspectionId = photo.inspectionId
            """.trimIndent(),
        )
        db.execSQL("DROP TABLE anchor_evidence_photo")
        db.execSQL("DROP TABLE anchor_inspection")
        db.execSQL("ALTER TABLE anchor_inspection_v3 RENAME TO anchor_inspection")
        db.execSQL("ALTER TABLE anchor_evidence_photo_v3 RENAME TO anchor_evidence_photo")
        db.execSQL(
            "CREATE INDEX index_anchor_inspection_companyId_jobId_jobPackVersion " +
                "ON anchor_inspection(companyId, jobId, jobPackVersion)",
        )
        db.execSQL(
            "CREATE INDEX index_anchor_evidence_photo_companyId_jobId_jobPackVersion_inspectionId " +
                "ON anchor_evidence_photo(companyId, jobId, jobPackVersion, inspectionId)",
        )
    }
}

internal val JOB_PACK_MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE anchor_inspection ADD COLUMN submissionId TEXT")
        db.execSQL(
            """
            CREATE TABLE inspection_submission (
                companyId TEXT NOT NULL,
                jobId TEXT NOT NULL,
                jobPackVersion INTEGER NOT NULL,
                submissionId TEXT NOT NULL,
                mutationId TEXT NOT NULL,
                inspectorUserId TEXT NOT NULL,
                sessionId TEXT NOT NULL,
                syncState TEXT NOT NULL,
                createdAtEpochMillis INTEGER NOT NULL,
                updatedAtEpochMillis INTEGER NOT NULL,
                PRIMARY KEY(companyId, jobId, jobPackVersion),
                FOREIGN KEY(companyId, jobId)
                    REFERENCES job_pack(companyId, jobId)
                    ON UPDATE NO ACTION ON DELETE RESTRICT
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE UNIQUE INDEX index_inspection_submission_companyId_mutationId " +
                "ON inspection_submission(companyId, mutationId)",
        )
    }
}

internal val JOB_PACK_MIGRATION_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE sync_mutation (
                companyId TEXT NOT NULL,
                mutationId TEXT NOT NULL,
                idempotencyKey TEXT NOT NULL,
                operation TEXT NOT NULL,
                entityType TEXT NOT NULL,
                entityId TEXT NOT NULL,
                entityVersion INTEGER NOT NULL,
                actorUserId TEXT NOT NULL,
                sessionId TEXT NOT NULL,
                state TEXT NOT NULL,
                attemptCount INTEGER NOT NULL,
                lastError TEXT,
                createdAtEpochMillis INTEGER NOT NULL,
                updatedAtEpochMillis INTEGER NOT NULL,
                PRIMARY KEY(companyId, mutationId)
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE UNIQUE INDEX index_sync_mutation_companyId_idempotencyKey " +
                "ON sync_mutation(companyId, idempotencyKey)",
        )
        db.execSQL(
            "CREATE INDEX index_sync_mutation_companyId_state_createdAtEpochMillis " +
                "ON sync_mutation(companyId, state, createdAtEpochMillis)",
        )
        db.execSQL(
            """
            INSERT INTO sync_mutation (
                companyId,
                mutationId,
                idempotencyKey,
                operation,
                entityType,
                entityId,
                entityVersion,
                actorUserId,
                sessionId,
                state,
                attemptCount,
                lastError,
                createdAtEpochMillis,
                updatedAtEpochMillis
            )
            SELECT
                companyId,
                mutationId,
                mutationId,
                'submit_inspection',
                'inspection_submission',
                submissionId,
                jobPackVersion,
                inspectorUserId,
                sessionId,
                syncState,
                0,
                NULL,
                createdAtEpochMillis,
                updatedAtEpochMillis
            FROM inspection_submission
            """.trimIndent(),
        )
    }
}

internal val JOB_PACK_MIGRATION_5_6 = object : Migration(5, 6) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE anchor_evidence_photo ADD COLUMN byteSize INTEGER")
        db.execSQL(
            """
            CREATE TABLE photo_upload (
                companyId TEXT NOT NULL,
                jobId TEXT NOT NULL,
                jobPackVersion INTEGER NOT NULL,
                inspectionId TEXT NOT NULL,
                localId TEXT NOT NULL,
                mediaId TEXT NOT NULL,
                state TEXT NOT NULL,
                byteSize INTEGER,
                uploadedBytes INTEGER NOT NULL,
                attemptCount INTEGER NOT NULL,
                lastError TEXT,
                createdAtEpochMillis INTEGER NOT NULL,
                updatedAtEpochMillis INTEGER NOT NULL,
                PRIMARY KEY(companyId, jobId, jobPackVersion, inspectionId, localId),
                FOREIGN KEY(
                    companyId,
                    jobId,
                    jobPackVersion,
                    inspectionId,
                    localId
                ) REFERENCES anchor_evidence_photo(
                    companyId,
                    jobId,
                    jobPackVersion,
                    inspectionId,
                    localId
                ) ON UPDATE NO ACTION ON DELETE CASCADE
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX index_photo_upload_companyId_state_createdAtEpochMillis " +
                "ON photo_upload(companyId, state, createdAtEpochMillis)",
        )
        db.execSQL(
            "UPDATE anchor_evidence_photo SET uploadState = " +
                "CASE WHEN uploadState = 'failed' THEN 'failed' ELSE 'pending_upload' END",
        )
        db.execSQL(
            """
            INSERT INTO photo_upload (
                companyId,
                jobId,
                jobPackVersion,
                inspectionId,
                localId,
                mediaId,
                state,
                byteSize,
                uploadedBytes,
                attemptCount,
                lastError,
                createdAtEpochMillis,
                updatedAtEpochMillis
            )
            SELECT
                companyId,
                jobId,
                jobPackVersion,
                inspectionId,
                localId,
                localId,
                CASE WHEN uploadState = 'failed' THEN 'failed' ELSE 'pending_upload' END,
                byteSize,
                0,
                0,
                CASE
                    WHEN uploadState = 'failed'
                        THEN 'Photo upload state migrated before retry metadata existed.'
                    ELSE NULL
                END,
                capturedAtEpochMillis,
                capturedAtEpochMillis
            FROM anchor_evidence_photo
            """.trimIndent(),
        )
    }
}

@Database(
    entities = [
        JobPackEntity::class,
        JobPackAnchorEntity::class,
        OfflineAuthorizationLeaseEntity::class,
        AnchorInspectionEntity::class,
        AnchorEvidencePhotoEntity::class,
        InspectionSubmissionEntity::class,
        SyncMutationEntity::class,
        PhotoUploadEntity::class,
    ],
    version = 6,
    exportSchema = true,
)
internal abstract class JobPackDatabase : RoomDatabase() {
    abstract fun jobPackDao(): JobPackDao
}
