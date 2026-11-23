package au.com.heightsafety.data

import au.com.heightsafety.domain.PhotoUpload
import au.com.heightsafety.domain.PhotoUploadContentDescriptor
import au.com.heightsafety.domain.PhotoUploadContentException
import au.com.heightsafety.domain.PhotoUploadContentSource
import java.io.IOException
import java.io.RandomAccessFile

/** Reads the durable private camera file without moving it into the upload queue. */
public class LocalAnchorPhotoUploadContentSource(
    private val storage: LocalAnchorPhotoStorage,
) : PhotoUploadContentSource {
    override suspend fun describe(upload: PhotoUpload): PhotoUploadContentDescriptor {
        requireExpectedReference(upload)
        val metadata = try {
            storage.describe(
                localId = upload.localId,
                capturedAtEpochMillis = upload.capturedAtEpochMillis,
            )
        } catch (error: IllegalArgumentException) {
            throw PhotoUploadContentException(
                message = error.message ?: "Captured photo content is invalid.",
                retryable = false,
                cause = error,
            )
        } catch (error: IOException) {
            throw PhotoUploadContentException(
                message = error.message ?: "Captured photo content is temporarily unavailable.",
                retryable = true,
                cause = error,
            )
        } catch (error: Exception) {
            throw PhotoUploadContentException(
                message = error.message ?: "Captured photo content could not be read.",
                retryable = true,
                cause = error,
            )
        }
        return PhotoUploadContentDescriptor(
            byteSize = metadata.byteSize,
            checksum = metadata.checksum,
            contentType = metadata.contentType,
        )
    }

    override suspend fun read(
        upload: PhotoUpload,
        offset: Long,
        maxBytes: Int,
    ): ByteArray {
        requireExpectedReference(upload)
        require(offset >= 0) { "photo read offset must not be negative" }
        require(maxBytes > 0) { "photo read maxBytes must be positive" }
        val file = try {
            storage.photoFile(upload.localId)
        } catch (error: IllegalArgumentException) {
            throw PhotoUploadContentException(
                message = error.message ?: "Captured photo content is invalid.",
                retryable = false,
                cause = error,
            )
        }
        try {
            RandomAccessFile(file, "r").use { input ->
                val fileLength = input.length()
                if (offset >= fileLength) {
                    return if (offset == fileLength) {
                        ByteArray(0)
                    } else {
                        throw PhotoUploadContentException(
                            message = "Saved photo upload offset exceeds local content.",
                            retryable = false,
                        )
                    }
                }
                input.seek(offset)
                val requested = minOf(maxBytes.toLong(), fileLength - offset).toInt()
                val bytes = ByteArray(requested)
                var read = 0
                while (read < requested) {
                    val count = input.read(bytes, read, requested - read)
                    if (count < 0) break
                    read += count
                }
                return if (read == requested) bytes else bytes.copyOf(read)
            }
        } catch (error: PhotoUploadContentException) {
            throw error
        } catch (error: IOException) {
            throw PhotoUploadContentException(
                message = error.message ?: "Captured photo content is temporarily unavailable.",
                retryable = true,
                cause = error,
            )
        }
    }

    private fun requireExpectedReference(upload: PhotoUpload) {
        val expected = storage.storageReference(upload.localId)
        if (upload.storageReference != expected) {
            throw PhotoUploadContentException(
                message = "Photo storage reference does not match its local media identity.",
                retryable = false,
            )
        }
    }
}
