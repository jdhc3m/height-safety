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

internal data class JobPackStorageSnapshot(
    val pack: JobPackEntity,
    val anchors: List<JobPackAnchorEntity>,
    val lease: OfflineAuthorizationLeaseEntity?,
)

@Dao
internal abstract class JobPackDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replacePack(pack: JobPackEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replaceAnchors(anchors: List<JobPackAnchorEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract fun replaceLease(lease: OfflineAuthorizationLeaseEntity)

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

    @Transaction
    open fun replaceJobPack(
        pack: JobPackEntity,
        anchors: List<JobPackAnchorEntity>,
        lease: OfflineAuthorizationLeaseEntity,
    ) {
        deleteLease(pack.companyId, pack.jobId)
        deleteAnchors(pack.companyId, pack.jobId)
        replacePack(pack)
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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract fun saveLease(lease: OfflineAuthorizationLeaseEntity)
}

@Database(
    entities = [
        JobPackEntity::class,
        JobPackAnchorEntity::class,
        OfflineAuthorizationLeaseEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
internal abstract class JobPackDatabase : RoomDatabase() {
    abstract fun jobPackDao(): JobPackDao
}
