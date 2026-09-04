package au.com.heightsafety.domain

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldMediaTest {
    @Test
    fun retryReusesMediaIdentityAndSavedOffset() = runTest {
        val store = InMemoryPhotoUploadStore(upload())
        val transport = ScriptedPhotoTransport(
            PhotoUploadDelivery.ChunkAccepted(nextOffset = 3L),
            PhotoUploadDelivery.RetryableFailure(
                error = "connection lost",
                resumeOffset = 3L,
            ),
            PhotoUploadDelivery.Uploaded,
        )
        val drainer = drainer(store, transport, content = byteArrayOf(1, 2, 3, 4, 5))

        val first = drainer.drain()

        assertTrue(first.requiresRetry)
        assertEquals(1, first.attempted)
        assertEquals(PhotoUploadQueueState.FAILED, store.upload.state)
        assertEquals(3L, store.upload.uploadedBytes)
        assertEquals("media-001", transport.chunks.map(PhotoUploadChunk::mediaId).first())

        val second = drainer.drain()

        assertFalse(second.requiresRetry)
        assertEquals(1, second.uploaded)
        assertEquals(PhotoUploadQueueState.UPLOADED, store.upload.state)
        assertEquals(2, store.upload.attemptCount)
        assertEquals(listOf(0L, 3L, 3L), transport.chunks.map(PhotoUploadChunk::offset))
        assertTrue(transport.chunks.all { it.companyId == "company-a" && it.jobId == "job-a" })
    }

    @Test
    fun permanentFailureIsVisibleWithoutSpinningOnSameQueueItem() = runTest {
        val store = InMemoryPhotoUploadStore(upload())
        val transport = ScriptedPhotoTransport(
            PhotoUploadDelivery.PermanentFailure("checksum rejected"),
        )

        val result = drainer(store, transport).drain()

        assertFalse(result.requiresRetry)
        assertEquals(1, result.attempted)
        assertEquals(1, result.failed)
        assertEquals(PhotoUploadQueueState.FAILED, store.upload.state)
        assertEquals(1, transport.chunks.size)
    }

    @Test
    fun checksumDriftPreventsLocalUploadAcknowledgement() = runTest {
        val store = InMemoryPhotoUploadStore(upload())
        val transport = ScriptedPhotoTransport(PhotoUploadDelivery.Uploaded)
        val drainer = PhotoUploadQueueDrainer(
            store = store,
            contentSource = ChangingChecksumPhotoContentSource(),
            transport = transport,
            nowEpochMillis = { 2_000L },
            chunkSizeBytes = 3,
        )

        val result = drainer.drain()

        assertFalse(result.requiresRetry)
        assertEquals(1, result.failed)
        assertEquals(PhotoUploadQueueState.FAILED, store.upload.state)
        assertEquals(0L, store.upload.uploadedBytes)
    }

    @Test
    fun savedEndOffsetWithoutAcknowledgementDoesNotSpin() = runTest {
        val store = InMemoryPhotoUploadStore(
            upload().copy(
                byteSize = 5L,
                state = PhotoUploadQueueState.FAILED,
                uploadedBytes = 5L,
                lastError = "previous interruption",
            ),
        )

        val result = drainer(store, ScriptedPhotoTransport()).drain()

        assertFalse(result.requiresRetry)
        assertEquals(1, result.attempted)
        assertEquals(1, result.failed)
        assertEquals(PhotoUploadQueueState.FAILED, store.upload.state)
    }

    @Test
    fun interruptedUploadIsRecoveredBeforeRetry() = runTest {
        val interrupted = upload()
            .beginUpload(nowEpochMillis = 1_000L)
            .withContentDescriptor(
                descriptor = PhotoUploadContentDescriptor(
                    byteSize = 5L,
                    checksum = "checksum-001",
                    contentType = "image/jpeg",
                ),
                nowEpochMillis = 1_000L,
            )
            .acceptChunk(nowEpochMillis = 1_000L, nextOffset = 2L)
        val store = InMemoryPhotoUploadStore(interrupted)
        val transport = ScriptedPhotoTransport(PhotoUploadDelivery.Uploaded)

        val result = drainer(store, transport, content = byteArrayOf(1, 2, 3, 4, 5)).drain()

        assertEquals(1, result.uploaded)
        assertEquals(PhotoUploadQueueState.UPLOADED, store.upload.state)
        assertEquals(2, store.upload.attemptCount)
        assertEquals(2L, transport.chunks.single().offset)
    }

    @Test
    fun completedProviderResponseCanRecoverFromAnUnpersistedLocalOffset() = runTest {
        val store = InMemoryPhotoUploadStore(upload())
        val transport = ScriptedPhotoTransport(PhotoUploadDelivery.Uploaded)

        val result = drainer(store, transport).drain()

        assertEquals(1, result.uploaded)
        assertEquals(PhotoUploadQueueState.UPLOADED, store.upload.state)
        assertEquals(5L, store.upload.uploadedBytes)
        assertEquals(0L, transport.chunks.single().offset)
    }

    private fun drainer(
        store: InMemoryPhotoUploadStore,
        transport: ScriptedPhotoTransport,
        content: ByteArray = byteArrayOf(1, 2, 3, 4, 5),
    ) = PhotoUploadQueueDrainer(
        store = store,
        contentSource = InMemoryPhotoContentSource(content),
        transport = transport,
        nowEpochMillis = { 2_000L },
        chunkSizeBytes = 3,
    )

    private fun upload() = PhotoUpload(
        companyId = "company-a",
        jobId = "job-a",
        jobPackVersion = 1L,
        anchorInspectionId = "inspection-a",
        localId = "media-001",
        storageReference = "anchor-photos/media-001.jpg",
        capturedAtEpochMillis = 100L,
        checksum = "checksum-001",
        createdAtEpochMillis = 100L,
        contentType = "image/jpeg",
    )

    private class InMemoryPhotoUploadStore(
        var upload: PhotoUpload,
    ) : PhotoUploadQueueStore {
        override suspend fun loadNextEligiblePhotoUpload(): PhotoUpload? =
            upload.takeIf {
                it.state == PhotoUploadQueueState.PENDING ||
                    it.state == PhotoUploadQueueState.FAILED
            }

        override suspend fun savePhotoUpload(upload: PhotoUpload) {
            check(upload.mediaId == this.upload.mediaId)
            this.upload = upload
        }

        override suspend fun recoverInterruptedPhotoUploads(nowEpochMillis: Long) {
            upload = upload.recoverInterrupted(nowEpochMillis)
        }

        override suspend fun loadPhotoUploads(companyId: String): List<PhotoUpload> =
            listOf(upload).filter { it.companyId == companyId }
    }

    private class InMemoryPhotoContentSource(
        private val content: ByteArray,
    ) : PhotoUploadContentSource {
        override suspend fun describe(upload: PhotoUpload) = PhotoUploadContentDescriptor(
            byteSize = content.size.toLong(),
            checksum = upload.checksum,
            contentType = upload.contentType,
        )

        override suspend fun read(
            upload: PhotoUpload,
            offset: Long,
            maxBytes: Int,
        ): ByteArray = content.copyOfRange(
            offset.toInt(),
            minOf(content.size, offset.toInt() + maxBytes),
        )
    }

    private class ChangingChecksumPhotoContentSource : PhotoUploadContentSource {
        private val delegate = InMemoryPhotoContentSource(byteArrayOf(1, 2, 3, 4, 5))
        private var describeCount = 0

        override suspend fun describe(upload: PhotoUpload): PhotoUploadContentDescriptor {
            val descriptor = delegate.describe(upload)
            return if (describeCount++ == 0) {
                descriptor
            } else {
                descriptor.copy(checksum = "changed-after-upload-start")
            }
        }

        override suspend fun read(
            upload: PhotoUpload,
            offset: Long,
            maxBytes: Int,
        ): ByteArray = delegate.read(upload, offset, maxBytes)
    }

    private class ScriptedPhotoTransport(
        private vararg val deliveries: PhotoUploadDelivery,
    ) : PhotoUploadTransport {
        val chunks = mutableListOf<PhotoUploadChunk>()
        private var index = 0

        override suspend fun upload(chunk: PhotoUploadChunk): PhotoUploadDelivery {
            chunks += chunk
            return deliveries[index++]
        }
    }
}
