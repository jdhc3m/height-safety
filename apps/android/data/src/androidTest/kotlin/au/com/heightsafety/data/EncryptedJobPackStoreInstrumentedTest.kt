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
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.SupportedJurisdiction
import java.io.File
import java.security.KeyStore
import java.util.UUID
import kotlinx.coroutines.runBlocking
import net.zetetic.database.sqlcipher.SQLiteDatabase as CipherDatabase
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
    fun roomV2MigrationPreservesVersionedEvidenceAndPhotos() = runBlocking<Unit> {
        val passphraseStore = JobPackKeystorePassphraseStore(fixture.files, fixture.alias)
        val passphrase = passphraseStore.loadOrCreate()
        try {
            System.loadLibrary("sqlcipher")
            val database = CipherDatabase.openDatabase(
                fixture.files.database.absolutePath,
                passphrase,
                null,
                CipherDatabase.OPEN_READWRITE or CipherDatabase.CREATE_IF_NECESSARY,
                null,
            )
            try {
                database.setForeignKeyConstraintsEnabled(true)
                database.execSQL(
                    """
                    CREATE TABLE job_pack (
                        companyId TEXT NOT NULL,
                        jobId TEXT NOT NULL,
                        siteId TEXT NOT NULL,
                        jurisdiction TEXT NOT NULL,
                        reference TEXT NOT NULL,
                        plannedDate TEXT,
                        workflowStatus TEXT NOT NULL,
                        jobPackVersion INTEGER NOT NULL,
                        siteName TEXT NOT NULL,
                        siteAddress TEXT,
                        siteReference TEXT,
                        accessNotes TEXT,
                        downloadedAtEpochMillis INTEGER NOT NULL,
                        PRIMARY KEY(companyId, jobId)
                    )
                    """.trimIndent(),
                )
                database.execSQL(
                    """
                    CREATE TABLE job_pack_anchor (
                        jobPackId TEXT NOT NULL,
                        anchorId TEXT NOT NULL,
                        companyId TEXT NOT NULL,
                        siteId TEXT NOT NULL,
                        label TEXT,
                        registerId TEXT,
                        location TEXT,
                        anchorType TEXT NOT NULL,
                        manufacturer TEXT,
                        model TEXT,
                        installContext TEXT,
                        registerStatus TEXT NOT NULL,
                        notes TEXT,
                        createdAtEpochMillis INTEGER NOT NULL,
                        updatedAtEpochMillis INTEGER NOT NULL,
                        PRIMARY KEY(companyId, jobPackId, anchorId),
                        FOREIGN KEY(companyId, jobPackId)
                            REFERENCES job_pack(companyId, jobId)
                            ON UPDATE NO ACTION ON DELETE RESTRICT
                    )
                    """.trimIndent(),
                )
                database.execSQL(
                    """
                    CREATE TABLE offline_authorization_lease (
                        jobPackId TEXT NOT NULL,
                        companyId TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        issuedAtEpochMillis INTEGER NOT NULL,
                        expiresAtEpochMillis INTEGER NOT NULL,
                        issuedAtElapsedRealtimeMillis INTEGER NOT NULL,
                        lastObservedEpochMillis INTEGER NOT NULL,
                        PRIMARY KEY(companyId, jobPackId),
                        FOREIGN KEY(companyId, jobPackId)
                            REFERENCES job_pack(companyId, jobId)
                            ON UPDATE NO ACTION ON DELETE RESTRICT
                    )
                    """.trimIndent(),
                )
                database.execSQL(
                    """
                    CREATE TABLE anchor_inspection (
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
                database.execSQL(
                    """
                    CREATE TABLE anchor_evidence_photo (
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
                database.execSQL(
                    "CREATE INDEX index_job_pack_anchor_companyId_jobPackId " +
                        "ON job_pack_anchor(companyId, jobPackId)",
                )
                database.execSQL(
                    "CREATE INDEX index_anchor_inspection_companyId_jobId " +
                        "ON anchor_inspection(companyId, jobId)",
                )
                database.execSQL(
                    "CREATE INDEX index_anchor_evidence_photo_companyId_jobId_inspectionId " +
                        "ON anchor_evidence_photo(companyId, jobId, inspectionId)",
                )
                database.execSQL(
                    "CREATE TABLE room_master_table (id INTEGER PRIMARY KEY, identity_hash TEXT)",
                )
                database.execSQL(
                    "INSERT INTO room_master_table (id, identity_hash) VALUES (42, ?)",
                    arrayOf<Any?>("0eca3ec77ba706c2ae73483d327de00b"),
                )
                database.execSQL(
                    "INSERT INTO job_pack VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    arrayOf<Any?>(
                        "company-a",
                        "job-001",
                        "site-company-a",
                        "NSW",
                        "JOB-001-company-a",
                        "2026-09-15",
                        "released",
                        1L,
                        "Site company-a",
                        "1 Example Street",
                        "SITE-company-a",
                        SENSITIVE_NOTE,
                        1_000L,
                    ),
                )
                database.execSQL(
                    "INSERT INTO anchor_inspection VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    arrayOf<Any?>(
                        "company-a",
                        "job-001",
                        "inspection-v2",
                        1L,
                        "anchor-company-a",
                        null,
                        0,
                        0,
                        "North roof",
                        "Migrated observation",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "local",
                        1_000L,
                        1_000L,
                    ),
                )
                database.execSQL(
                    "INSERT INTO anchor_evidence_photo VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    arrayOf<Any?>(
                        "company-a",
                        "job-001",
                        "inspection-v2",
                        "photo-v2",
                        "anchor-photos/photo-v2.jpg",
                        1_000L,
                        "checksum-v2",
                        "pending_upload",
                        "image/jpeg",
                    ),
                )
                database.version = 2
            } finally {
                database.close()
            }
        } finally {
            passphrase.fill(0)
        }

        val migrated = fixture.store().loadEvidence("company-a", "job-001", 1L)

        assertEquals("inspection-v2", migrated.single().inspectionId)
        assertEquals("Migrated observation", migrated.single().observations)
        assertEquals("photo-v2", migrated.single().photos.single().localId)
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
    fun sameInspectionAndPhotoIdsRemainIsolatedByPackVersion() = runBlocking<Unit> {
        val store = fixture.store()
        val first = pack("company-a", version = 1L, anchorId = "anchor-old")
        val second = pack("company-a", version = 2L, anchorId = "anchor-new")
        store.save(first, lease("company-a", "inspector-a", first.jobId), 1_000L)
        val firstDraft = evidenceDraft(
            pack = first,
            observations = "Recorded against pack version one.",
        )
        store.saveEvidence(firstDraft)

        store.save(second, lease("company-a", "inspector-a", second.jobId, 2_000L), 2_000L)
        val secondDraft = evidenceDraft(
            pack = second,
            observations = "Recorded against pack version two.",
        )
        store.saveEvidence(secondDraft)

        assertEquals(
            listOf(firstDraft),
            store.loadEvidence("company-a", first.jobId, first.jobPackVersion),
        )
        assertEquals(
            listOf(secondDraft),
            store.loadEvidence("company-a", second.jobId, second.jobPackVersion),
        )
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
    fun queuedSubmissionAndFrozenEvidenceSurviveStoreRestart() = runBlocking<Unit> {
        val store = fixture.store()
        val pack = pack("company-a", version = 4L)
        store.save(pack, lease("company-a", "inspector-a", pack.jobId), 1_000L)
        val draft = evidenceDraft(
            pack = pack,
            observations = "Recorded before local submission.",
        ).copy(
            syncState = EvidenceSyncState.PENDING,
            submissionId = "submission-001",
        )
        val intent = InspectionSubmissionIntent(
            companyId = pack.companyId,
            jobId = pack.jobId,
            jobPackVersion = pack.jobPackVersion,
            submissionId = "submission-001",
            mutationId = "mutation-001",
            inspectorUserId = "inspector-a",
            sessionId = "session-001",
            createdAtEpochMillis = 2_000L,
        )

        store.queueSubmission(intent, listOf(draft))

        val restarted = fixture.store()
        val loadedIntent = restarted.loadSubmission(
            pack.companyId,
            pack.jobId,
            pack.jobPackVersion,
        )
        val loadedEvidence = restarted.loadEvidence(
            pack.companyId,
            pack.jobId,
            pack.jobPackVersion,
        )

        assertEquals(intent, loadedIntent)
        assertEquals(listOf(draft), loadedEvidence)
        assertEquals("submission-001", loadedEvidence.single().submissionId)
        assertEquals("photo-shared", loadedEvidence.single().photos.single().localId)

        val replayed = restarted.queueSubmission(
            intent.copy(
                submissionId = "different-submission",
                mutationId = "different-mutation",
            ),
            listOf(
                draft.copy(
                    submissionId = "different-submission",
                ),
            ),
        )
        assertEquals(intent, replayed)
        assertEquals(
            "submission-001",
            restarted.loadEvidence(pack.companyId, pack.jobId, pack.jobPackVersion)
                .single()
                .submissionId,
        )
        assertEquals(
            "Recorded before local submission.",
            restarted.loadEvidence(pack.companyId, pack.jobId, pack.jobPackVersion)
                .single()
                .observations,
        )
        assertThrows(IllegalStateException::class.java) {
            runBlocking {
                restarted.saveEvidence(
                    draft.copy(
                        submissionId = null,
                        observations = "Attempted submitted-evidence edit.",
                    ),
                )
            }
        }
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

    @Test
    fun localPhotoStorageReturnsPrivateReferenceAndChecksum() {
        val storage = LocalAnchorPhotoStorage(
            fixture.context,
            "height-safety-photo-test-${UUID.randomUUID()}",
        )
        try {
            storage.photoFile("photo-001").writeBytes(byteArrayOf(0x01, 0x02, 0x03))

            val metadata = storage.describe("photo-001", 1_500L)

            assertEquals("photo-001", metadata.localId)
            assertEquals("anchor-photos/photo-001.jpg", metadata.storageReference)
            assertEquals(
                "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
                metadata.checksum,
            )
            assertEquals("image/jpeg", metadata.contentType)
        } finally {
            storage.delete("photo-001")
        }
    }

    @Test
    fun localPhotoStorageRejectsPathTraversal() {
        val storage = LocalAnchorPhotoStorage(
            fixture.context,
            "height-safety-photo-test-${UUID.randomUUID()}",
        )

        assertThrows(IllegalArgumentException::class.java) {
            storage.photoFile("../outside")
        }
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

    private fun evidenceDraft(
        pack: FieldJobPack,
        observations: String,
    ) = AnchorInspectionDraft(
        companyId = pack.companyId,
        jobId = pack.jobId,
        jobPackVersion = pack.jobPackVersion,
        inspectionId = "inspection-shared",
        expectedAnchorId = pack.anchors.single().anchorId,
        observations = observations,
        createdAtEpochMillis = 1_000L,
        photos = listOf(
            AnchorEvidencePhoto(
                companyId = pack.companyId,
                jobId = pack.jobId,
                anchorInspectionId = "inspection-shared",
                localId = "photo-shared",
                storageReference = "anchor-photos/photo-shared.jpg",
                capturedAtEpochMillis = 1_500L,
                checksum = "checksum-${pack.jobPackVersion}",
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
