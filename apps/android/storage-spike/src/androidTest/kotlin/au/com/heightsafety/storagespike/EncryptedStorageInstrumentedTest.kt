package au.com.heightsafety.storagespike

import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteException
import androidx.test.core.app.ApplicationProvider
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import java.security.ProviderException
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class EncryptedStorageInstrumentedTest {
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
    fun encryptedJobPackAndOutboxSurviveProcessStyleRestart() {
        fixture.opener().openLatest().use { handle ->
            handle.database.runInTransaction {
                handle.database.storageDao().insertJobPack(fixture.jobPack())
                handle.database.storageDao().insertOutbox(fixture.outbox())
            }
        }

        fixture.opener().openLatest().use { restarted ->
            assertEquals(fixture.jobPack(), restarted.database.storageDao().jobPack(JOB_ID))
            assertEquals(fixture.outbox(), restarted.database.storageDao().outbox(MUTATION_ID))
        }
    }

    @Test
    fun encryptedRoomMigrationPreservesJobPackAndPendingOutbox() {
        fixture.opener().openVersion1ForMigrationProof().use { version1 ->
            version1.database.runInTransaction {
                version1.database.storageDao().insertJobPack(
                    JobPackV1(JOB_ID, "NSW", SENSITIVE_NOTE, 7),
                )
                version1.database.storageDao().insertOutbox(
                    OutboxMutationV1(MUTATION_ID, JOB_ID, "pending", 1_775_000_000_000),
                )
            }
        }

        fixture.opener().openLatest().use { migrated ->
            val jobPack = migrated.database.storageDao().jobPack(JOB_ID)
            assertNotNull(jobPack)
            assertEquals("NSW", jobPack!!.jurisdiction)
            assertEquals(SENSITIVE_NOTE, jobPack.note)
            assertEquals(7, jobPack.packVersion)
            assertNull(jobPack.recordedOutcome)
            assertEquals(fixture.outbox(), migrated.database.storageDao().outbox(MUTATION_ID))
        }
    }

    @Test
    fun databaseFileIsCiphertextAndFrameworkSqliteCannotQueryIt() {
        fixture.opener().openLatest().use { handle ->
            handle.database.storageDao().insertJobPack(fixture.jobPack())
        }

        val bytes = fixture.files.databaseFootprint().map(File::readBytes).toByteArray()
        assertFalse(bytes.startsWith("SQLite format 3\u0000".toByteArray()))
        assertFalse(bytes.containsSubsequence(SENSITIVE_NOTE.toByteArray()))

        assertThrows(SQLiteException::class.java) {
            SQLiteDatabase.openDatabase(
                    fixture.files.database.absolutePath,
                    null,
                    SQLiteDatabase.OPEN_READONLY,
                )
                .use { database ->
                    database.rawQuery("SELECT count(*) FROM sqlite_master", null).use { cursor -> cursor.moveToFirst() }
                }
        }
    }

    @Test
    fun missingKeystoreKeyFailsClosedWithoutChangingEncryptedEvidence() {
        fixture.createEvidence()
        val before = fixture.databaseHashes()
        fixture.deleteKeystoreKey()

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.KEYSTORE_KEY_MISSING, exception.reason)
        assertHashesEqual(before, fixture.databaseHashes())
        assertTrue(fixture.files.database.exists())
    }

    @Test
    fun missingEnvelopeFailsClosedWithoutChangingEncryptedEvidence() {
        fixture.createEvidence()
        val before = fixture.databaseHashes()
        assertTrue(fixture.files.keyEnvelope.delete())

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.KEY_MATERIAL_MISSING, exception.reason)
        assertHashesEqual(before, fixture.databaseHashes())
        assertTrue(fixture.files.database.exists())
    }

    @Test
    fun corruptEnvelopeFailsClosedWithoutChangingEncryptedEvidence() {
        fixture.createEvidence()
        val before = fixture.databaseHashes()
        fixture.files.keyEnvelope.writeBytes(byteArrayOf(1, 2, 3, 4))

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.KEY_MATERIAL_INVALID, exception.reason)
        assertHashesEqual(before, fixture.databaseHashes())
        assertTrue(fixture.files.database.exists())
    }

    @Test
    fun replacingLostKeystoreKeyCannotSilentlyCreateOrOpenDatabase() {
        fixture.createEvidence()
        val before = fixture.databaseHashes()
        fixture.deleteKeystoreKey()
        val replacementFiles = fixture.createStorageFiles("replacement-${UUID.randomUUID()}")
        KeystorePassphraseStore(replacementFiles, fixture.alias).loadOrCreate().fill(0)

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.KEY_MATERIAL_INVALID, exception.reason)
        assertHashesEqual(before, fixture.databaseHashes())
    }

    @Test
    fun keystoreProviderFailureReturnsTypedUnavailableReason() {
        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                KeystorePassphraseStore(
                        fixture.files,
                        fixture.alias,
                        wrappingKeyGenerator = { throw ProviderException("injected Keystore failure") },
                    )
                    .loadOrCreate()
            }

        assertEquals(StorageUnavailableReason.KEY_ACCESS_FAILED, exception.reason)
        assertTrue(exception.cause is ProviderException)
        assertFalse(fixture.files.hasDatabaseFootprint())
        assertFalse(fixture.files.keyEnvelope.exists())
    }

    @Test
    fun interruptedEnvelopeInstallReusesOrphanedKeyForEmptyStore() {
        assertTrue(fixture.files.keyEnvelope.mkdirs())

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                KeystorePassphraseStore(fixture.files, fixture.alias).loadOrCreate()
            }

        assertEquals(StorageUnavailableReason.KEY_ACCESS_FAILED, exception.reason)
        assertFalse(fixture.files.hasDatabaseFootprint())
        assertTrue(fixture.keystoreContainsAlias())
        assertTrue(fixture.files.keyEnvelope.delete())

        fixture.opener().openLatest().use { handle ->
            handle.database.storageDao().insertJobPack(fixture.jobPack())
        }
        fixture.opener().openLatest().use { restarted ->
            assertEquals(fixture.jobPack(), restarted.database.storageDao().jobPack(JOB_ID))
        }
    }

    @Test
    fun missingInitializedDatabaseWithRemainingSidecarFailsClosed() {
        fixture.createEvidence()
        val envelopeHash = fixture.sha256(fixture.files.keyEnvelope)
        fixture.files.databaseFootprint().forEach { file ->
            assertTrue("Could not remove fictional database file ${file.name}", file.delete())
        }
        val remainingSidecar = File(fixture.files.database.path + "-wal")
        remainingSidecar.writeBytes(byteArrayOf(1, 2, 3, 4))
        val sidecarHash = fixture.sha256(remainingSidecar)

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.DATABASE_MISSING, exception.reason)
        assertFalse(fixture.files.database.exists())
        assertArrayEquals(envelopeHash, fixture.sha256(fixture.files.keyEnvelope))
        assertArrayEquals(sidecarHash, fixture.sha256(remainingSidecar))
    }

    @Test
    fun zeroLengthInitializedDatabaseFailsClosedWithoutModification() {
        fixture.createEvidence()
        val envelopeHash = fixture.sha256(fixture.files.keyEnvelope)
        fixture.files.databaseFootprint().forEach { file ->
            assertTrue("Could not remove fictional database file ${file.name}", file.delete())
        }
        assertTrue(fixture.files.database.createNewFile())

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.DATABASE_MISSING, exception.reason)
        assertTrue(fixture.files.database.isFile)
        assertEquals(0L, fixture.files.database.length())
        assertArrayEquals(envelopeHash, fixture.sha256(fixture.files.keyEnvelope))
    }

    @Test
    fun tamperedInitializationStateIsRejectedBeforeDatabaseStateCheck() {
        KeystorePassphraseStore(fixture.files, fixture.alias).loadOrCreate().fill(0)
        val bytes = fixture.files.keyEnvelope.readBytes()
        bytes[ENVELOPE_STATE_LAST_BYTE_OFFSET] = 1
        fixture.files.keyEnvelope.writeBytes(bytes)
        val tamperedEnvelopeHash = fixture.sha256(fixture.files.keyEnvelope)

        val exception =
            assertThrows(StorageUnavailableException::class.java) {
                fixture.opener().openLatest()
            }

        assertEquals(StorageUnavailableReason.KEY_MATERIAL_INVALID, exception.reason)
        assertFalse(fixture.files.hasDatabaseFootprint())
        assertArrayEquals(tamperedEnvelopeHash, fixture.sha256(fixture.files.keyEnvelope))
    }

    @Test
    fun concurrentFirstOpenProducesOneRestartableEncryptedStore() {
        val ready = CountDownLatch(2)
        val start = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)
        try {
            val opens =
                List(2) {
                    executor.submit {
                        ready.countDown()
                        assertTrue(start.await(10, TimeUnit.SECONDS))
                        fixture.opener().openLatest().use { }
                    }
                }
            assertTrue(ready.await(10, TimeUnit.SECONDS))
            start.countDown()
            opens.forEach { it.get(30, TimeUnit.SECONDS) }
        } finally {
            executor.shutdownNow()
            assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS))
        }

        fixture.opener().openLatest().use { handle ->
            handle.database.runInTransaction {
                handle.database.storageDao().insertJobPack(fixture.jobPack())
                handle.database.storageDao().insertOutbox(fixture.outbox())
            }
        }
        fixture.opener().openLatest().use { restarted ->
            assertEquals(fixture.jobPack(), restarted.database.storageDao().jobPack(JOB_ID))
            assertEquals(fixture.outbox(), restarted.database.storageDao().outbox(MUTATION_ID))
        }
    }

    private class Fixture : AutoCloseable {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val alias = "height-safety-storage-spike-test-${UUID.randomUUID()}"
        private val createdDirectories = mutableListOf<File>()
        val files = createStorageFiles("height-safety-storage-spike-test-${UUID.randomUUID()}")

        fun createStorageFiles(directoryName: String): StorageFiles =
            StorageFiles(context, directoryName).also { createdDirectories.add(it.directory) }

        fun opener() =
            EncryptedStorageOpener(
                context,
                files,
                KeystorePassphraseStore(files, alias),
            )

        fun jobPack() = JobPack(JOB_ID, "Queensland", SENSITIVE_NOTE, 7, "Recorded outcome")

        fun outbox() = OutboxMutation(MUTATION_ID, JOB_ID, "pending", 1_775_000_000_000)

        fun createEvidence() {
            opener().openLatest().use { handle ->
                handle.database.runInTransaction {
                    handle.database.storageDao().insertJobPack(jobPack())
                    handle.database.storageDao().insertOutbox(outbox())
                }
            }
        }

        fun databaseHashes(): Map<String, ByteArray> =
            files.databaseFootprint().associate { file -> file.name to sha256(file) }

        fun deleteKeystoreKey() {
            KeyStore.getInstance("AndroidKeyStore").apply {
                load(null)
                deleteEntry(alias)
            }
        }

        fun keystoreContainsAlias(): Boolean =
            KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.containsAlias(alias)

        override fun close() {
            runCatching { deleteKeystoreKey() }
            createdDirectories.forEach { directory ->
                runCatching { check(directory.deleteRecursively() || !directory.exists()) }
            }
        }

        fun sha256(file: File): ByteArray =
            MessageDigest.getInstance("SHA-256").digest(file.readBytes())
    }

    private companion object {
        const val JOB_ID = "job-pack-01"
        const val MUTATION_ID = "mutation-01"
        const val SENSITIVE_NOTE = "fictional anchor note that must not appear in plaintext"
        const val ENVELOPE_STATE_LAST_BYTE_OFFSET = 11
    }
}

private fun ByteArray.startsWith(prefix: ByteArray): Boolean =
    size >= prefix.size && copyOfRange(0, prefix.size).contentEquals(prefix)

private fun ByteArray.containsSubsequence(candidate: ByteArray): Boolean =
    candidate.isNotEmpty() && indices.any { index ->
        index + candidate.size <= size &&
            copyOfRange(index, index + candidate.size).contentEquals(candidate)
    }

private fun Iterable<ByteArray>.toByteArray(): ByteArray {
    val output = mutableListOf<Byte>()
    forEach { bytes -> output.addAll(bytes.toList()) }
    return output.toByteArray()
}

private fun assertHashesEqual(expected: Map<String, ByteArray>, actual: Map<String, ByteArray>) {
    assertEquals(expected.keys, actual.keys)
    expected.forEach { (name, hash) -> assertArrayEquals(hash, actual.getValue(name)) }
}
