package au.com.heightsafety.storagespike

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Insert
import androidx.room.Index
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Entity(tableName = "job_pack")
data class JobPackV1(
    @androidx.room.PrimaryKey val id: String,
    val jurisdiction: String,
    val note: String,
    val packVersion: Long,
)

@Entity(
    tableName = "outbox",
    indices = [Index("jobPackId")],
    foreignKeys = [
        ForeignKey(
            entity = JobPackV1::class,
            parentColumns = ["id"],
            childColumns = ["jobPackId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
)
data class OutboxMutationV1(
    @androidx.room.PrimaryKey val mutationId: String,
    val jobPackId: String,
    val state: String,
    val createdAtEpochMillis: Long,
)

@Dao
interface StorageV1Dao {
    @Insert
    fun insertJobPack(jobPack: JobPackV1)

    @Insert
    fun insertOutbox(mutation: OutboxMutationV1)
}

@Database(entities = [JobPackV1::class, OutboxMutationV1::class], version = 1, exportSchema = true)
abstract class StorageDatabaseV1 : RoomDatabase() {
    abstract fun storageDao(): StorageV1Dao
}

@Entity(tableName = "job_pack")
data class JobPack(
    @androidx.room.PrimaryKey val id: String,
    val jurisdiction: String,
    val note: String,
    val packVersion: Long,
    val recordedOutcome: String?,
)

@Entity(
    tableName = "outbox",
    indices = [Index("jobPackId")],
    foreignKeys = [
        ForeignKey(
            entity = JobPack::class,
            parentColumns = ["id"],
            childColumns = ["jobPackId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
)
data class OutboxMutation(
    @androidx.room.PrimaryKey val mutationId: String,
    val jobPackId: String,
    val state: String,
    val createdAtEpochMillis: Long,
)

@Dao
interface StorageDao {
    @Insert
    fun insertJobPack(jobPack: JobPack)

    @Insert
    fun insertOutbox(mutation: OutboxMutation)

    @Query("SELECT * FROM job_pack WHERE id = :id")
    fun jobPack(id: String): JobPack?

    @Query("SELECT * FROM outbox WHERE mutationId = :mutationId")
    fun outbox(mutationId: String): OutboxMutation?
}

@Database(entities = [JobPack::class, OutboxMutation::class], version = 2, exportSchema = true)
abstract class StorageDatabase : RoomDatabase() {
    abstract fun storageDao(): StorageDao

    companion object {
        val MIGRATION_1_2 =
            object : Migration(1, 2) {
                override fun migrate(db: SupportSQLiteDatabase) {
                    db.execSQL("ALTER TABLE job_pack ADD COLUMN recordedOutcome TEXT")
                }
            }
    }
}
