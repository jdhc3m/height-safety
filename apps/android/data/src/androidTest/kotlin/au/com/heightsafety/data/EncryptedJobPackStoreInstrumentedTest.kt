package au.com.heightsafety.data

import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteException
import androidx.test.core.app.ApplicationProvider
import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.RecordedOutcome
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

    @Test
    fun replacingPackPreservesEvidenceFromPreviousPackVersion() = runBlocking<Unit> {
        val store = fixture.store()
        val first = pack("company-a", version = 1L, anchorId = "anchor-old")
        val second = pack("company-a", version = 2L, anchorId = "anchor-new")
        store.save(first, lease("company-a", "inspector-a", first.jobId), 1_000L)
        store.saveEvidence(
            AnchorInspectionDraft(
                companyId = first.companyId,
                jobId = first.jobId,
                jobPackVersion = first.jobPackVersion,
                inspectionId = "inspection-old",
                expectedAnchorId = "anchor-old",
                createdAtEpochMillis = 1_000L,
            ),
        )

        store.save(second, lease("company-a", "inspector-a", second.jobId, 2_000L), 2_000L)

        assertEquals(
            "inspection-old",
            store.loadEvidence("company-a", first.jobId, first.jobPackVersion)
                .single()
                .inspectionId,
        )
        assertTrue(store.loadEvidence("company-a", second.jobId, second.jobPackVersion).isEmpty())
    }

    @Test
    fun evidenceDraftAndPhotoAssociationSurviveStoreRestart() = runBlocking<Unit> {
        val store = fixture.store()
        val pack = pack("company-a", version = 3L)
        store.save(pack, lease("company-a", "inspector-a", pack.jobId), 1_000L)
        val draft = AnchorInspectionDraft(
            companyId = "company-a",
            jobId = pack.jobId,
            jobPackVersion = pack.jobPackVersion,
            inspectionId = "inspection-001",
            expectedAnchorId = pack.anchors.single().anchorId,
            identityConfirmed = true,
            locationConfirmed = true,
            location = "North roof",
            observations = "Recorded observation.",
            recordedOutcome = RecordedOutcome.SERVICEABLE,
            syncState = EvidenceSyncState.LOCAL,
            createdAtEpochMillis = 1_000L,
            updatedAtEpochMillis = 2_000L,
            photos = listOf(
                AnchorEvidencePhoto(
                    companyId = "company-a",
                    jobId = pack.jobId,
                    anchorInspectionId = "inspection-001",
                    localId = "photo-001",
                    storageReference = "local/photo-001.jpg",
                    capturedAtEpochMillis = 1_500L,
                    checksum = "sha256-photo-001",
                ),
            ),
        )
        store.saveEvidence(draft)

        val restarted = fixture.store()
        val loaded = restarted.loadEvidence("company-a", pack.jobId, pack.jobPackVersion)

        assertEquals(listOf(draft), loaded)
        assertEquals("inspection-001", loaded.single().photos.single().anchorInspectionId)
        assertEquals("photo-001", loaded.single().photos.single().localId)
    }

    @Test
    fun evidenceReadsAreTenantAndPackVersionScoped() = runBlocking<Unit> {
        val store = fixture.store()
        val packA = pack("company-a", version = 1L)
        val packB = pack("company-b", version = 1L)
        store.save(packA, lease("company-a", "inspector-a", packA.jobId), 1_000L)
        store.save(packB, lease("company-b", "inspector-b", packB.jobId), 1_000L)
        store.saveEvidence(
            AnchorInspectionDraft(
                companyId = "company-a",
                jobId = packA.jobId,
                jobPackVersion = 1L,
                inspectionId = "inspection-a",
                expectedAnchorId = packA.anchors.single().anchorId,
                createdAtEpochMillis = 1_000L,
            ),
        )

        assertEquals(1, store.loadEvidence("company-a", packA.jobId, 1L).size)
        assertTrue(store.loadEvidence("company-a", packA.jobId, 2L).isEmpty())
        assertTrue(store.loadEvidence("company-b", packB.jobId, 1L).isEmpty())
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
