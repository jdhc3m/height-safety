package au.com.heightsafety.data

import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteException
import androidx.test.core.app.ApplicationProvider
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.SupportedJurisdiction
import java.io.File
import java.security.KeyStore
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class EncryptedJobPackStoreInstrumentedTest {
    private lateinit var fixture: Fixture

    @Before
    fun setUp() {
        fixture = Fixture()
    }

    @After
    fun tearDown() {
        fixture.close()
    }

    @Test
    fun encryptedPackAndLeaseSurviveStoreRestart() = runBlocking<Unit> {
        val store = fixture.store()
        val pack = pack("company-a", version = 1L)
        store.save(pack, lease("company-a", "inspector-a", pack.jobId), 1_000L)

        val restarted = fixture.store()
        val loaded = restarted.load("company-a", pack.jobId)

        assertNotNull(loaded)
        assertEquals(pack, loaded!!.pack)
        assertEquals("inspector-a", loaded.lease.userId)
        assertFalse(fixture.databaseBytes().startsWith(SQLITE_HEADER))
        assertFalse(fixture.databaseBytes().containsSequence(SENSITIVE_NOTE_BYTES))
        assertThrows(SQLiteException::class.java) {
            SQLiteDatabase.openDatabase(
                fixture.files.database.absolutePath,
                null,
                SQLiteDatabase.OPEN_READONLY,
            ).use { database ->
                database.rawQuery("SELECT count(*) FROM sqlite_master", null).use { cursor ->
                    cursor.moveToFirst()
                }
            }
        }
    }

    @Test
    fun localPackKeysIncludeCompanyAndKeepTenantsSeparate() = runBlocking<Unit> {
        val store = fixture.store()
        val companyA = pack("company-a")
        val companyB = pack("company-b")
        store.save(companyA, lease("company-a", "inspector-a", companyA.jobId), 1_000L)
        store.save(companyB, lease("company-b", "inspector-b", companyB.jobId), 2_000L)

        assertEquals(companyA, store.load("company-a", companyA.jobId)!!.pack)
        assertEquals(companyB, store.load("company-b", companyB.jobId)!!.pack)
        assertNull(store.load("company-c", companyA.jobId))
    }

    @Test
    fun replacingPackReplacesAnchorSnapshotAndLeaseTogether() = runBlocking<Unit> {
        val store = fixture.store()
        val first = pack("company-a", version = 1L, anchorId = "anchor-old")
        val second = pack("company-a", version = 2L, anchorId = "anchor-new")
        store.save(first, lease("company-a", "inspector-a", first.jobId), 1_000L)
        store.save(second, lease("company-a", "inspector-a", second.jobId, 2_000L), 2_000L)

        val loaded = store.load("company-a", second.jobId)!!
        assertEquals(second, loaded.pack)
        assertEquals("anchor-new", loaded.pack.anchors.single().anchorId)
        assertEquals(2_000L, loaded.lease.issuedAtEpochMillis)
    }

    private class Fixture : AutoCloseable {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val directoryName = "height-safety-job-pack-test-${UUID.randomUUID()}"
        val alias = "height-safety-job-pack-test-${UUID.randomUUID()}"
        val files = JobPackStorageFiles(context, directoryName)

        fun store(): EncryptedJobPackStore =
            EncryptedJobPackStore(context, directoryName, alias)

        fun databaseBytes(): ByteArray =
            files.databaseFootprint().flatMap { it.readBytes().asIterable() }.toByteArray()

        override fun close() {
            runCatching {
                KeyStore.getInstance("AndroidKeyStore").apply {
                    load(null)
                    if (containsAlias(alias)) deleteEntry(alias)
                }
            }
            runCatching { check(files.directory.deleteRecursively() || !files.directory.exists()) }
        }
    }

    private fun lease(
        companyId: String,
        userId: String,
        jobId: String,
        issuedAtEpochMillis: Long = 1_000L,
    ): OfflineAuthorizationLease =
        OfflineAuthorizationLease.issue(
            session = FieldSession(
                accessToken = "session-token",
                companyId = companyId,
                sessionId = "session-$companyId",
                userId = userId,
                email = "$userId@example.test",
                role = ProductRole.INSPECTOR,
                mfaSatisfied = false,
                expiresAtEpochMillis = Long.MAX_VALUE,
            ),
            jobId = jobId,
            issuedAtEpochMillis = issuedAtEpochMillis,
            issuedAtElapsedRealtimeMillis = issuedAtEpochMillis,
        )

    private fun pack(
        companyId: String,
        version: Long = 1L,
        anchorId: String = "anchor-$companyId",
    ): FieldJobPack = FieldJobPack(
        companyId = companyId,
        jobId = "job-001",
        siteId = "site-$companyId",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001-$companyId",
        plannedDate = "2026-09-15",
        workflowStatus = "released",
        jobPackVersion = version,
        siteName = "Site $companyId",
        siteAddress = "1 Example Street",
        siteReference = "SITE-$companyId",
        accessNotes = SENSITIVE_NOTE,
        anchors = listOf(
            JobPackAnchor(
                companyId = companyId,
                anchorId = anchorId,
                siteId = "site-$companyId",
                label = "A-001",
                registerId = "REG-001",
                location = SENSITIVE_NOTE,
                anchorType = "single_point",
                manufacturer = "Example manufacturer",
                model = "Example model",
                installContext = "Installed roof anchor",
                registerStatus = "active",
                notes = SENSITIVE_NOTE,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            ),
        ),
    )

    private companion object {
        const val SENSITIVE_NOTE = "Restricted north roof access"
        val SQLITE_HEADER = "SQLite format 3\u0000".toByteArray()
        val SENSITIVE_NOTE_BYTES = SENSITIVE_NOTE.toByteArray()
    }
}

private fun ByteArray.startsWith(prefix: ByteArray): Boolean =
    size >= prefix.size && prefix.indices.all { this[it] == prefix[it] }

private fun ByteArray.containsSequence(needle: ByteArray): Boolean =
    needle.isNotEmpty() &&
        size >= needle.size &&
        (0..(size - needle.size)).any { start ->
            needle.indices.all { offset -> this[start + offset] == needle[offset] }
        }
