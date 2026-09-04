package au.com.heightsafety.domain

import java.util.concurrent.CancellationException

/** Internal queue state; the evidence model exposes pending, uploaded and failed. */
public enum class PhotoUploadQueueState(public val value: String) {
    PENDING("pending_upload"),
    UPLOADING("uploading"),
    UPLOADED("uploaded"),
    FAILED("failed"),
}

public data class PhotoUpload(
    public val companyId: String,
    public val jobId: String,
    public val jobPackVersion: Long,
    public val anchorInspectionId: String,
    public val localId: String,
    public val storageReference: String,
    public val capturedAtEpochMillis: Long,
    public val checksum: String,
    public val createdAtEpochMillis: Long,
    public val contentType: String? = null,
    public val byteSize: Long? = null,
    public val state: PhotoUploadQueueState = PhotoUploadQueueState.PENDING,
    public val uploadedBytes: Long = 0L,
    public val attemptCount: Int = 0,
    public val lastError: String? = null,
    public val updatedAtEpochMillis: Long = createdAtEpochMillis,
) {
    init {
        require(companyId.isNotBlank()) { "photo upload companyId is required" }
        require(jobId.isNotBlank()) { "photo upload jobId is required" }
        require(jobPackVersion > 0) { "photo upload jobPackVersion must be positive" }
        require(anchorInspectionId.isNotBlank()) {
            "photo upload anchorInspectionId is required"
        }
        require(localId.isNotBlank()) { "photo upload localId is required" }
        require(storageReference.isNotBlank()) {
            "photo upload storageReference is required"
        }
        require(capturedAtEpochMillis >= 0) {
            "photo upload capturedAtEpochMillis must not be negative"
        }
        require(checksum.isNotBlank()) { "photo upload checksum is required" }
        require(createdAtEpochMillis >= 0) {
            "photo upload createdAtEpochMillis must not be negative"
        }
        require(updatedAtEpochMillis >= createdAtEpochMillis) {
            "photo upload updatedAtEpochMillis must not precede creation"
        }
        require(byteSize == null || byteSize >= 0) {
            "photo upload byteSize must not be negative"
        }
        require(uploadedBytes >= 0) {
            "photo upload uploadedBytes must not be negative"
        }
        require(byteSize == null || uploadedBytes <= byteSize) {
            "photo upload uploadedBytes cannot exceed byteSize"
        }
        require(attemptCount >= 0) {
            "photo upload attemptCount must not be negative"
        }
        if (state == PhotoUploadQueueState.FAILED) {
            require(!lastError.isNullOrBlank()) {
                "failed photo upload must record an error"
            }
        }
        if (state == PhotoUploadQueueState.UPLOADED) {
            require(byteSize != null) {
                "uploaded photo must record its content size"
            }
            require(uploadedBytes == byteSize) {
                "uploaded photo must record all bytes"
            }
        }
    }

    /** Stable client media identity; retries never generate a replacement ID. */
    public val mediaId: String
        get() = localId

    public fun beginUpload(nowEpochMillis: Long): PhotoUpload {
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "photo upload start time must not precede update time"
        }
        require(
            state == PhotoUploadQueueState.PENDING ||
                state == PhotoUploadQueueState.FAILED,
        ) {
            "only pending or failed photos can upload"
        }
        require(attemptCount < Int.MAX_VALUE) {
            "photo upload attempt count exhausted"
        }
        return copy(
            state = PhotoUploadQueueState.UPLOADING,
            attemptCount = attemptCount + 1,
            lastError = null,
            updatedAtEpochMillis = nowEpochMillis,
        )
    }

    public fun withContentDescriptor(
        descriptor: PhotoUploadContentDescriptor,
        nowEpochMillis: Long,
    ): PhotoUpload {
        require(state == PhotoUploadQueueState.UPLOADING) {
            "only uploading photos can accept a content descriptor"
        }
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "photo descriptor time must not precede update time"
        }
        require(descriptor.checksum == checksum) {
            "photo content checksum does not match captured evidence"
        }
        if (contentType != null && descriptor.contentType != null) {
            require(contentType == descriptor.contentType) {
                "photo content type does not match captured evidence"
            }
        }
        require(byteSize == null || byteSize == descriptor.byteSize) {
            "photo content size changed between upload attempts"
        }
        require(uploadedBytes <= descriptor.byteSize) {
            "saved photo upload offset exceeds content size"
        }
        return copy(
            byteSize = descriptor.byteSize,
            updatedAtEpochMillis = nowEpochMillis,
        )
    }

    public fun acceptChunk(
        nowEpochMillis: Long,
        nextOffset: Long,
    ): PhotoUpload {
        require(state == PhotoUploadQueueState.UPLOADING) {
            "only uploading photos can accept a chunk"
        }
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "photo chunk time must not precede update time"
        }
        val totalBytes = byteSize ?: error("photo content size is required")
        require(nextOffset > uploadedBytes) {
            "photo upload offset must advance"
        }
        require(nextOffset <= totalBytes) {
            "photo upload offset cannot exceed content size"
        }
        return copy(
            uploadedBytes = nextOffset,
            updatedAtEpochMillis = nowEpochMillis,
        )
    }

    public fun acknowledge(nowEpochMillis: Long): PhotoUpload {
        require(state == PhotoUploadQueueState.UPLOADING) {
            "only uploading photos can be acknowledged"
        }
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "photo acknowledgement time must not precede update time"
        }
        val totalBytes = byteSize ?: error("photo content size is required")
        require(uploadedBytes == totalBytes) {
            "photo cannot be acknowledged before all bytes are accepted"
        }
        return copy(
            state = PhotoUploadQueueState.UPLOADED,
            updatedAtEpochMillis = nowEpochMillis,
            lastError = null,
        )
    }

    public fun fail(
        nowEpochMillis: Long,
        error: String,
        resumeOffset: Long = uploadedBytes,
    ): PhotoUpload {
        require(state == PhotoUploadQueueState.UPLOADING) {
            "only uploading photos can fail"
        }
        require(nowEpochMillis >= updatedAtEpochMillis) {
            "photo failure time must not precede update time"
        }
        require(resumeOffset >= 0) { "photo resume offset must not be negative" }
        require(byteSize == null || resumeOffset <= byteSize) {
            "photo resume offset cannot exceed content size"
        }
        return copy(
            state = PhotoUploadQueueState.FAILED,
            uploadedBytes = resumeOffset,
            updatedAtEpochMillis = nowEpochMillis,
            lastError = requireError(error),
        )
    }

    public fun recoverInterrupted(nowEpochMillis: Long): PhotoUpload =
        if (state == PhotoUploadQueueState.UPLOADING) {
            fail(
                nowEpochMillis = nowEpochMillis,
                error = "Photo upload interrupted before server acknowledgement.",
            )
        } else {
            this
        }

    public companion object {
        public fun fromPhoto(
            photo: AnchorEvidencePhoto,
            jobPackVersion: Long,
            createdAtEpochMillis: Long = photo.capturedAtEpochMillis,
        ): PhotoUpload = PhotoUpload(
            companyId = photo.companyId,
            jobId = photo.jobId,
            jobPackVersion = jobPackVersion,
            anchorInspectionId = photo.anchorInspectionId,
            localId = photo.localId,
            storageReference = photo.storageReference,
            capturedAtEpochMillis = photo.capturedAtEpochMillis,
            checksum = photo.checksum,
            createdAtEpochMillis = createdAtEpochMillis,
            contentType = photo.contentType,
            byteSize = photo.byteSize,
        )
    }

    private fun requireError(error: String): String = error.trim().also {
        require(it.isNotEmpty()) { "photo upload error is required" }
    }
}

public data class PhotoUploadContentDescriptor(
    public val byteSize: Long,
    public val checksum: String,
    public val contentType: String? = null,
) {
    init {
        require(byteSize > 0) { "photo content must not be empty" }
        require(checksum.isNotBlank()) { "photo content checksum is required" }
    }
}

public class PhotoUploadContentException(
    message: String,
    public val retryable: Boolean,
    cause: Throwable? = null,
) : IllegalStateException(message, cause)

public interface PhotoUploadContentSource {
    public suspend fun describe(upload: PhotoUpload): PhotoUploadContentDescriptor

    /** Reads at most [maxBytes] beginning at [offset]. */
    public suspend fun read(
        upload: PhotoUpload,
        offset: Long,
        maxBytes: Int,
    ): ByteArray
}

public data class PhotoUploadChunk(
    public val mediaId: String,
    public val companyId: String,
    public val jobId: String,
    public val jobPackVersion: Long,
    public val anchorInspectionId: String,
    public val localId: String,
    public val storageReference: String,
    public val checksum: String,
    public val contentType: String?,
    public val totalBytes: Long,
    public val offset: Long,
    public val bytes: ByteArray,
) {
    init {
        require(mediaId.isNotBlank()) { "photo chunk mediaId is required" }
        require(mediaId == localId) { "photo chunk mediaId must match localId" }
        require(companyId.isNotBlank()) { "photo chunk companyId is required" }
        require(jobId.isNotBlank()) { "photo chunk jobId is required" }
        require(jobPackVersion > 0) { "photo chunk jobPackVersion must be positive" }
        require(anchorInspectionId.isNotBlank()) {
            "photo chunk anchorInspectionId is required"
        }
        require(storageReference.isNotBlank()) {
            "photo chunk storageReference is required"
        }
        require(checksum.isNotBlank()) { "photo chunk checksum is required" }
        require(totalBytes > 0) { "photo chunk totalBytes must be positive" }
        require(offset >= 0 && offset < totalBytes) {
            "photo chunk offset must be within content"
        }
        require(bytes.isNotEmpty()) { "photo chunk bytes are required" }
        require(bytes.size.toLong() <= totalBytes - offset) {
            "photo chunk exceeds content size"
        }
    }
}

public sealed interface PhotoUploadDelivery {
    /** The provider has accepted the complete object. */
    public data object Uploaded : PhotoUploadDelivery

    /** The provider accepted this chunk and reports the next byte offset. */
    public data class ChunkAccepted(
        public val nextOffset: Long,
    ) : PhotoUploadDelivery

    /** The same media ID and the reported offset are used by a later retry. */
    public data class RetryableFailure(
        public val error: String,
        public val resumeOffset: Long? = null,
    ) : PhotoUploadDelivery {
        init {
            require(error.isNotBlank()) { "retryable photo error is required" }
        }
    }

    /** The bytes or association cannot be accepted without changing local evidence. */
    public data class PermanentFailure(
        public val error: String,
    ) : PhotoUploadDelivery {
        init {
            require(error.isNotBlank()) { "permanent photo error is required" }
        }
    }
}

public interface PhotoUploadTransport {
    /** Uploads one chunk using [chunk.mediaId] as the idempotent media identity. */
    public suspend fun upload(chunk: PhotoUploadChunk): PhotoUploadDelivery
}

public interface PhotoUploadQueueStore {
    /** Returns the oldest pending or failed photo; completed work stays visible. */
    public suspend fun loadNextEligiblePhotoUpload(): PhotoUpload?

    /** Persists queue progress and its visible evidence upload state together. */
    public suspend fun savePhotoUpload(upload: PhotoUpload)

    /** Converts interrupted work into visible failed work without deleting evidence. */
    public suspend fun recoverInterruptedPhotoUploads(nowEpochMillis: Long)

    public suspend fun loadPhotoUploads(companyId: String): List<PhotoUpload>
}

public data class PhotoUploadDrainResult(
    public val attempted: Int,
    public val uploaded: Int,
    public val failed: Int,
    public val requiresRetry: Boolean,
)

public class PhotoUploadQueueDrainer(
    private val store: PhotoUploadQueueStore,
    private val contentSource: PhotoUploadContentSource,
    private val transport: PhotoUploadTransport,
    private val nowEpochMillis: () -> Long,
    private val chunkSizeBytes: Int = DEFAULT_CHUNK_SIZE_BYTES,
) {
    init {
        require(chunkSizeBytes > 0) { "photo upload chunk size must be positive" }
    }

    public suspend fun drain(): PhotoUploadDrainResult {
        val recoveryTime = checkedNow()
        store.recoverInterruptedPhotoUploads(recoveryTime)

        var attempted = 0
        var uploaded = 0
        var failed = 0
        while (true) {
            val queued = store.loadNextEligiblePhotoUpload() ?: break
            val started = queued.beginUpload(checkedNow())
            store.savePhotoUpload(started)
            attempted += 1

            val sized = try {
                started.withContentDescriptor(
                    descriptor = contentSource.describe(started),
                    nowEpochMillis = checkedNow(),
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: PhotoUploadContentException) {
                store.savePhotoUpload(
                    started.fail(checkedNow(), error.message ?: "Photo content unavailable."),
                )
                failed += 1
                if (error.retryable) {
                    return result(attempted, uploaded, failed, requiresRetry = true)
                }
                return result(attempted, uploaded, failed, requiresRetry = false)
            } catch (error: IllegalArgumentException) {
                store.savePhotoUpload(
                    started.fail(checkedNow(), error.message ?: "Photo content is invalid."),
                )
                failed += 1
                return result(attempted, uploaded, failed, requiresRetry = false)
            } catch (error: Exception) {
                store.savePhotoUpload(
                    started.fail(checkedNow(), error.message ?: "Photo content could not be read."),
                )
                return result(attempted, uploaded, failed + 1, requiresRetry = true)
            }
            store.savePhotoUpload(sized)

            val totalBytes = sized.byteSize ?: error("photo size missing")
            if (sized.uploadedBytes >= totalBytes) {
                store.savePhotoUpload(
                    sized.fail(
                        nowEpochMillis = checkedNow(),
                        error = "Photo upload reached the recorded end without acknowledgement.",
                    ),
                )
                failed += 1
                return result(attempted, uploaded, failed, requiresRetry = false)
            }

            var current = sized
            while (current.uploadedBytes < (current.byteSize ?: error("photo size missing"))) {
                val offset = current.uploadedBytes
                val remaining = (current.byteSize ?: error("photo size missing")) - offset
                val maxBytes = minOf(chunkSizeBytes.toLong(), remaining).toInt()
                val bytes = try {
                    contentSource.read(current, offset, maxBytes)
                } catch (error: CancellationException) {
                    throw error
                } catch (error: PhotoUploadContentException) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), error.message ?: "Photo content unavailable."),
                    )
                    failed += 1
                    if (error.retryable) {
                        return result(attempted, uploaded, failed, requiresRetry = true)
                    }
                    return result(attempted, uploaded, failed, requiresRetry = false)
                } catch (error: Exception) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), error.message ?: "Photo content could not be read."),
                    )
                    return result(attempted, uploaded, failed + 1, requiresRetry = true)
                }

                if (bytes.isEmpty() || bytes.size > maxBytes) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), "Photo content ended before its recorded size."),
                    )
                    failed += 1
                    return result(attempted, uploaded, failed, requiresRetry = false)
                }

                val chunk = PhotoUploadChunk(
                    mediaId = current.mediaId,
                    companyId = current.companyId,
                    jobId = current.jobId,
                    jobPackVersion = current.jobPackVersion,
                    anchorInspectionId = current.anchorInspectionId,
                    localId = current.localId,
                    storageReference = current.storageReference,
                    checksum = current.checksum,
                    contentType = current.contentType,
                    totalBytes = current.byteSize ?: error("photo size missing"),
                    offset = offset,
                    bytes = bytes,
                )
                val delivery = try {
                    transport.upload(chunk)
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), error.message ?: "Photo upload could not reach the server."),
                    )
                    return result(attempted, uploaded, failed + 1, requiresRetry = true)
                }

                try {
                    when (delivery) {
                        PhotoUploadDelivery.Uploaded -> {
                            val totalBytes = current.byteSize ?: error("photo size missing")
                            // A retry may discover that the provider completed this media ID
                            // before the local acknowledgement was persisted.
                            val accepted = if (current.uploadedBytes == totalBytes) {
                                current
                            } else {
                                current.acceptChunk(checkedNow(), totalBytes)
                            }
                            current = verifyCompletedUpload(accepted)
                            store.savePhotoUpload(current)
                            uploaded += 1
                        }
                        is PhotoUploadDelivery.ChunkAccepted -> {
                            val totalBytes = current.byteSize ?: error("photo size missing")
                            if (
                                delivery.nextOffset <= offset ||
                                delivery.nextOffset > offset + bytes.size ||
                                delivery.nextOffset > totalBytes
                            ) {
                                store.savePhotoUpload(
                                    current.fail(
                                        checkedNow(),
                                        "Photo transport returned an invalid resume offset.",
                                    ),
                                )
                                failed += 1
                                return result(attempted, uploaded, failed, requiresRetry = false)
                            }
                            val accepted = current.acceptChunk(checkedNow(), delivery.nextOffset)
                            current = if (accepted.uploadedBytes == totalBytes) {
                                val completed = verifyCompletedUpload(accepted)
                                uploaded += 1
                                completed
                            } else {
                                accepted
                            }
                            store.savePhotoUpload(current)
                        }
                        is PhotoUploadDelivery.RetryableFailure -> {
                            val totalBytes = current.byteSize ?: error("photo size missing")
                            val resumeOffset = delivery.resumeOffset ?: offset
                            if (
                                resumeOffset < 0 ||
                                resumeOffset >= totalBytes ||
                                resumeOffset > offset + bytes.size
                            ) {
                                store.savePhotoUpload(
                                    current.fail(
                                        checkedNow(),
                                        "Photo transport returned an invalid retry offset.",
                                    ),
                                )
                                failed += 1
                                return result(attempted, uploaded, failed, requiresRetry = false)
                            }
                            store.savePhotoUpload(
                                current.fail(
                                    nowEpochMillis = checkedNow(),
                                    error = delivery.error,
                                    resumeOffset = resumeOffset,
                                ),
                            )
                            failed += 1
                            return result(attempted, uploaded, failed, requiresRetry = true)
                        }
                        is PhotoUploadDelivery.PermanentFailure -> {
                            store.savePhotoUpload(current.fail(checkedNow(), delivery.error))
                            failed += 1
                            return result(attempted, uploaded, failed, requiresRetry = false)
                        }
                    }
                } catch (error: CancellationException) {
                    throw error
                } catch (error: PhotoUploadContentException) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), error.message ?: "Photo content unavailable."),
                    )
                    failed += 1
                    return result(attempted, uploaded, failed, requiresRetry = error.retryable)
                } catch (error: IllegalArgumentException) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), error.message ?: "Photo content is invalid."),
                    )
                    failed += 1
                    return result(attempted, uploaded, failed, requiresRetry = false)
                } catch (error: Exception) {
                    store.savePhotoUpload(
                        current.fail(checkedNow(), error.message ?: "Photo content could not be verified."),
                    )
                    failed += 1
                    return result(attempted, uploaded, failed, requiresRetry = true)
                }
                if (current.state == PhotoUploadQueueState.UPLOADED) break
            }
        }
        return result(attempted, uploaded, failed, requiresRetry = false)
    }

    private suspend fun verifyCompletedUpload(upload: PhotoUpload): PhotoUpload =
        upload.withContentDescriptor(
            descriptor = contentSource.describe(upload),
            nowEpochMillis = checkedNow(),
        ).acknowledge(checkedNow())

    private fun result(
        attempted: Int,
        uploaded: Int,
        failed: Int,
        requiresRetry: Boolean,
    ) = PhotoUploadDrainResult(attempted, uploaded, failed, requiresRetry)

    private fun checkedNow(): Long = nowEpochMillis().also {
        require(it >= 0) { "current epoch time must not be negative" }
    }

    private companion object {
        const val DEFAULT_CHUNK_SIZE_BYTES = 256 * 1024
    }
}
