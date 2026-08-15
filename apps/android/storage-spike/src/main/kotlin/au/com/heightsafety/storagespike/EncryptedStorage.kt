package au.com.heightsafety.storagespike

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.system.Os
import android.system.OsConstants
import androidx.room.Room
import androidx.room.RoomDatabase
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.security.MessageDigest
import java.security.ProviderException
import java.security.SecureRandom
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import net.zetetic.database.Logger
import net.zetetic.database.NoopTarget
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory

enum class StorageUnavailableReason {
    KEY_MATERIAL_MISSING,
    KEYSTORE_KEY_MISSING,
    KEY_MATERIAL_INVALID,
    KEY_ACCESS_FAILED,
    DATABASE_MISSING,
    DATABASE_OPEN_FAILED,
}

class StorageUnavailableException(
    val reason: StorageUnavailableReason,
    cause: Throwable? = null,
) : IllegalStateException("Encrypted storage unavailable: $reason", cause)

class StorageFiles(context: Context, directoryName: String) {
    val directory = File(context.noBackupFilesDir, directoryName)
    val database = File(directory, "job-pack.db")
    val keyEnvelope = File(directory, "job-pack.key-envelope")

    fun databaseFootprint(): List<File> =
        listOf(
                database,
                File(database.path + "-wal"),
                File(database.path + "-shm"),
                File(database.path + "-journal"),
            )
            .filter(File::exists)

    fun hasDatabaseFootprint(): Boolean = databaseFootprint().isNotEmpty()
}

class KeystorePassphraseStore(
    private val files: StorageFiles,
    private val alias: String,
    private val secureRandom: SecureRandom = SecureRandom(),
    private val wrappingKeyGenerator: ((String) -> SecretKey)? = null,
) {
    fun loadOrCreate(): ByteArray =
        try {
            loadOrCreateInternal()
        } catch (exception: StorageUnavailableException) {
            throw exception
        } catch (exception: ProviderException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }

    private fun loadOrCreateInternal(): ByteArray {
        if (!files.directory.isDirectory && !files.directory.mkdirs()) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED)
        }
        val envelopeExists = files.keyEnvelope.isFile
        val databaseExists = files.hasDatabaseFootprint()
        val keyStore = loadKeyStore()
        val aliasExists = containsAlias(keyStore)

        if (databaseExists && !envelopeExists) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_MISSING)
        }
        if (envelopeExists && !aliasExists) {
            throw StorageUnavailableException(StorageUnavailableReason.KEYSTORE_KEY_MISSING)
        }
        if (!envelopeExists && aliasExists) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_MISSING)
        }

        if (envelopeExists) {
            val envelope = readEnvelope()
            val passphrase = decryptEnvelope(keyStore, envelope)
            if (
                envelope.state == EnvelopeState.INITIALIZED &&
                    (!files.database.isFile || files.database.length() == 0L)
            ) {
                passphrase.fill(0)
                throw StorageUnavailableException(StorageUnavailableReason.DATABASE_MISSING)
            }
            return passphrase
        }

        val wrappingKey = generateWrappingKey()
        val passphrase = ByteArray(PASSPHRASE_BYTES).also(secureRandom::nextBytes)
        try {
            writeEnvelope(encrypt(passphrase, wrappingKey, EnvelopeState.PENDING))
        } catch (exception: Exception) {
            passphrase.fill(0)
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }
        return passphrase
    }

    fun markDatabaseInitialized(passphrase: ByteArray) {
        try {
            val keyStore = loadKeyStore()
            val envelope = readEnvelope()
            val storedPassphrase = decryptEnvelope(keyStore, envelope)
            try {
                if (!MessageDigest.isEqual(storedPassphrase, passphrase)) {
                    throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID)
                }
                if (envelope.state == EnvelopeState.PENDING) {
                    writeEnvelope(
                        encrypt(passphrase, wrappingKey(keyStore), EnvelopeState.INITIALIZED),
                    )
                }
            } finally {
                storedPassphrase.fill(0)
            }
        } catch (exception: StorageUnavailableException) {
            throw exception
        } catch (exception: ProviderException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        } catch (exception: Exception) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }
    }

    private fun loadKeyStore(): KeyStore =
        try {
            KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        } catch (exception: GeneralSecurityException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        } catch (exception: IOException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }

    private fun containsAlias(keyStore: KeyStore): Boolean =
        try {
            keyStore.containsAlias(alias)
        } catch (exception: GeneralSecurityException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }

    private fun generateWrappingKey(): SecretKey =
        try {
            wrappingKeyGenerator?.let { return it(alias) }
            val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            generator.init(
                KeyGenParameterSpec.Builder(
                        alias,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                    )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setRandomizedEncryptionRequired(true)
                    .build(),
            )
            generator.generateKey()
        } catch (exception: GeneralSecurityException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }

    private fun wrappingKey(keyStore: KeyStore): SecretKey =
        try {
            keyStore.getKey(alias, null) as? SecretKey
                ?: throw StorageUnavailableException(StorageUnavailableReason.KEYSTORE_KEY_MISSING)
        } catch (exception: StorageUnavailableException) {
            throw exception
        } catch (exception: GeneralSecurityException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }

    private fun encrypt(
        passphrase: ByteArray,
        key: SecretKey,
        state: EnvelopeState,
    ): Envelope {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        cipher.updateAAD(envelopeAad(state))
        return Envelope(state, cipher.iv, cipher.doFinal(passphrase))
    }

    private fun decryptEnvelope(keyStore: KeyStore, envelope: Envelope): ByteArray {
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, wrappingKey(keyStore), GCMParameterSpec(GCM_TAG_BITS, envelope.iv))
            cipher.updateAAD(envelopeAad(envelope.state))
            cipher.doFinal(envelope.ciphertext).also { passphrase ->
                if (passphrase.size != PASSPHRASE_BYTES) {
                    passphrase.fill(0)
                    throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID)
                }
            }
        } catch (exception: StorageUnavailableException) {
            throw exception
        } catch (exception: AEADBadTagException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID, exception)
        } catch (exception: GeneralSecurityException) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_ACCESS_FAILED, exception)
        }
    }

    private fun writeEnvelope(envelope: Envelope) {
        val bytes =
            ByteArrayOutputStream().use { buffer ->
                DataOutputStream(buffer).use { output ->
                    output.write(ENVELOPE_MAGIC)
                    output.writeInt(ENVELOPE_VERSION)
                    output.writeInt(envelope.state.value)
                    output.writeInt(envelope.iv.size)
                    output.writeInt(envelope.ciphertext.size)
                    output.write(envelope.iv)
                    output.write(envelope.ciphertext)
                }
                buffer.toByteArray()
            }
        val temporary = File.createTempFile(files.keyEnvelope.name + ".", ".new", files.directory)
        try {
            FileOutputStream(temporary).use { output ->
                output.write(bytes)
                output.fd.sync()
            }
            Os.rename(temporary.absolutePath, files.keyEnvelope.absolutePath)
            val directoryDescriptor = Os.open(files.directory.absolutePath, OsConstants.O_RDONLY, 0)
            try {
                Os.fsync(directoryDescriptor)
            } finally {
                Os.close(directoryDescriptor)
            }
        } finally {
            temporary.delete()
        }
    }

    private fun readEnvelope(): Envelope =
        try {
            if (files.keyEnvelope.length() !in MIN_ENVELOPE_BYTES..MAX_ENVELOPE_BYTES) {
                throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID)
            }
            DataInputStream(ByteArrayInputStream(files.keyEnvelope.readBytes())).use { input ->
                val magic = ByteArray(ENVELOPE_MAGIC.size).also(input::readFully)
                val version = input.readInt()
                val state = EnvelopeState.fromValue(input.readInt())
                val ivSize = input.readInt()
                val ciphertextSize = input.readInt()
                if (
                    !magic.contentEquals(ENVELOPE_MAGIC) ||
                        version != ENVELOPE_VERSION ||
                        ivSize !in 12..32 ||
                        ciphertextSize !in 1..MAX_CIPHERTEXT_BYTES ||
                        input.available() != ivSize + ciphertextSize
                ) {
                    throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID)
                }
                val iv = ByteArray(ivSize).also(input::readFully)
                val ciphertext = ByteArray(ciphertextSize).also(input::readFully)
                Envelope(state, iv, ciphertext)
            }
        } catch (exception: StorageUnavailableException) {
            throw exception
        } catch (exception: Exception) {
            throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID, exception)
        }

    private data class Envelope(
        val state: EnvelopeState,
        val iv: ByteArray,
        val ciphertext: ByteArray,
    )

    private enum class EnvelopeState(val value: Int) {
        PENDING(0),
        INITIALIZED(1),
        ;

        companion object {
            fun fromValue(value: Int): EnvelopeState =
                entries.singleOrNull { it.value == value }
                    ?: throw StorageUnavailableException(StorageUnavailableReason.KEY_MATERIAL_INVALID)
        }
    }

    private fun envelopeAad(state: EnvelopeState): ByteArray =
        ENVELOPE_AAD + byteArrayOf(state.value.toByte())

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val PASSPHRASE_BYTES = 32
        const val GCM_TAG_BITS = 128
        const val ENVELOPE_VERSION = 2
        const val MAX_CIPHERTEXT_BYTES = 128
        const val MIN_ENVELOPE_BYTES = 4L + 4 + 4 + 4 + 4 + 12 + 1
        const val MAX_ENVELOPE_BYTES = 4L + 4 + 4 + 4 + 4 + 32 + MAX_CIPHERTEXT_BYTES
        val ENVELOPE_MAGIC = byteArrayOf(0x48, 0x53, 0x4b, 0x45)
        val ENVELOPE_AAD = "height-safety:android-room-key:v2".toByteArray(Charsets.UTF_8)
    }
}

class EncryptedRoomHandle<T : RoomDatabase>(
    val database: T,
    private val passphrase: ByteArray,
) : AutoCloseable {
    override fun close() {
        try {
            database.close()
        } finally {
            passphrase.fill(0)
        }
    }
}

class EncryptedStorageOpener(
    private val context: Context,
    private val files: StorageFiles,
    private val passphraseStore: KeystorePassphraseStore,
) {
    fun openLatest(): EncryptedRoomHandle<StorageDatabase> =
        open(StorageDatabase::class.java) { builder ->
            builder.addMigrations(StorageDatabase.MIGRATION_1_2)
        }

    fun openVersion1ForMigrationProof(): EncryptedRoomHandle<StorageDatabaseV1> =
        open(StorageDatabaseV1::class.java) { }

    private fun <T : RoomDatabase> open(
        databaseClass: Class<T>,
        configure: (RoomDatabase.Builder<T>) -> Unit,
    ): EncryptedRoomHandle<T> =
        synchronized(initializationLock(files.database.absolutePath)) {
            val passphrase = passphraseStore.loadOrCreate()
            var database: T? = null
            try {
                loadSqlCipher()
                val builder =
                    Room.databaseBuilder(context.applicationContext, databaseClass, files.database.absolutePath)
                        .openHelperFactory(SupportOpenHelperFactory(passphrase, null, true))
                        .setJournalMode(RoomDatabase.JournalMode.WRITE_AHEAD_LOGGING)
                configure(builder)
                database = builder.build()
                database.openHelper.writableDatabase
                passphraseStore.markDatabaseInitialized(passphrase)
                EncryptedRoomHandle(database, passphrase)
            } catch (exception: StorageUnavailableException) {
                runCatching { database?.close() }
                passphrase.fill(0)
                throw exception
            } catch (exception: Exception) {
                runCatching { database?.close() }
                passphrase.fill(0)
                throw StorageUnavailableException(StorageUnavailableReason.DATABASE_OPEN_FAILED, exception)
            }
        }

    private fun loadSqlCipher() {
        synchronized(SQLCIPHER_LOAD_LOCK) {
            if (!sqlCipherLoaded) {
                try {
                    System.loadLibrary("sqlcipher")
                } catch (error: UnsatisfiedLinkError) {
                    throw StorageUnavailableException(StorageUnavailableReason.DATABASE_OPEN_FAILED, error)
                }
                Logger.setTarget(NoopTarget())
                sqlCipherLoaded = true
            }
        }
    }

    private companion object {
        val SQLCIPHER_LOAD_LOCK = Any()
        val INITIALIZATION_LOCKS = mutableMapOf<String, Any>()

        @Volatile var sqlCipherLoaded = false

        fun initializationLock(databasePath: String): Any =
            synchronized(INITIALIZATION_LOCKS) {
                INITIALIZATION_LOCKS[databasePath]
                    ?: Any().also { lock -> INITIALIZATION_LOCKS[databasePath] = lock }
            }
    }
}
