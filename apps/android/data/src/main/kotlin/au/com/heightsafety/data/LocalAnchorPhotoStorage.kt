package au.com.heightsafety.data

import android.content.Context
import java.io.File
import java.security.MessageDigest

/** Private, no-backup storage for camera bytes before media upload exists. */
public class LocalAnchorPhotoStorage(
    context: Context,
    directoryName: String = DEFAULT_DIRECTORY_NAME,
) {
    init {
        require(isSafeLocalId(directoryName)) { "photo directory name is not safe" }
    }

    private val directory = File(context.applicationContext.noBackupFilesDir, directoryName)

    public fun photoFile(localId: String): File {
        require(isSafeLocalId(localId)) { "photo localId is not a safe file name" }
        val photosDirectory = File(directory, PHOTOS_DIRECTORY)
        if (!photosDirectory.isDirectory && !photosDirectory.mkdirs()) {
            throw IllegalStateException("unable to create private photo directory")
        }
        return File(photosDirectory, "$localId.jpg")
    }

    public fun describe(
        localId: String,
        capturedAtEpochMillis: Long,
    ): LocalAnchorPhotoMetadata {
        require(capturedAtEpochMillis >= 0) {
            "capturedAtEpochMillis must not be negative"
        }
        val file = photoFile(localId)
        require(file.isFile && file.length() > 0L) {
            "captured photo file is missing or empty"
        }
        val checksum = MessageDigest.getInstance("SHA-256").digest(file.readBytes())
            .joinToString(separator = "") { byte -> "%02x".format(byte) }
        return LocalAnchorPhotoMetadata(
            localId = localId,
            storageReference = "$PHOTOS_DIRECTORY/$localId.jpg",
            capturedAtEpochMillis = capturedAtEpochMillis,
            checksum = checksum,
            contentType = "image/jpeg",
        )
    }

    public fun delete(localId: String) {
        photoFile(localId).delete()
    }

    private companion object {
        const val DEFAULT_DIRECTORY_NAME = "job-pack"
        const val PHOTOS_DIRECTORY = "anchor-photos"

        fun isSafeLocalId(localId: String): Boolean =
            localId.length in 1..80 && localId.all { character ->
                character.isLetterOrDigit() || character == '-' || character == '_'
            }
    }
}

public data class LocalAnchorPhotoMetadata(
    public val localId: String,
    public val storageReference: String,
    public val capturedAtEpochMillis: Long,
    public val checksum: String,
    public val contentType: String,
)
