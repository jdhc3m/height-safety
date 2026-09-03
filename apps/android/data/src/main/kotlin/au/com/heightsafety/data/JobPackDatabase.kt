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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replaceInspection(inspection: AnchorInspectionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replacePhotos(photos: List<AnchorEvidencePhotoEntity>)

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
            "AND jobPackVersion = :jobPackVersion AND inspectionId = :inspectionId",
    )
    protected abstract fun deletePhotos(
        companyId: String,
        jobId: String,
        jobPackVersion: Long,
        inspectionId: String,
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
        deletePhotos(
            companyId = inspection.companyId,
            jobId = inspection.jobId,
            jobPackVersion = inspection.jobPackVersion,
            inspectionId = inspection.inspectionId,
        )
        replaceInspection(inspection)
        replacePhotos(photos)
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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract fun saveLease(lease: OfflineAuthorizationLeaseEntity)
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

@Database(
    entities = [
        JobPackEntity::class,
        JobPackAnchorEntity::class,
        OfflineAuthorizationLeaseEntity::class,
        AnchorInspectionEntity::class,
        AnchorEvidencePhotoEntity::class,
    ],
    version = 3,
    exportSchema = true,
)
internal abstract class JobPackDatabase : RoomDatabase() {
    abstract fun jobPackDao(): JobPackDao
}
