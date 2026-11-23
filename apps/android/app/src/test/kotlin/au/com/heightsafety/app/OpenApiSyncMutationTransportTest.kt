package au.com.heightsafety.app

import au.com.heightsafety.api.apis.SynchronisationApi
import au.com.heightsafety.api.models.PhotoUploadChunkDto
import au.com.heightsafety.api.models.PhotoUploadChunkResponseDto
import au.com.heightsafety.api.models.SyncMutationConflictDto
import au.com.heightsafety.api.models.SyncMutationRequestDto
import au.com.heightsafety.api.models.SyncMutationResponseDto
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.InspectionSubmissionPayload
import au.com.heightsafety.domain.PhotoUploadChunk
import au.com.heightsafety.domain.PhotoUploadDelivery
import au.com.heightsafety.domain.ProductRole
import au.com.heightsafety.domain.SupportedJurisdiction
import au.com.heightsafety.domain.SyncMutation
import au.com.heightsafety.domain.SyncMutationDelivery
import java.math.BigDecimal
import java.time.OffsetDateTime
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

class OpenApiSyncMutationTransportTest {
    @Test
    fun mapsServerAcknowledgementAndSendsExpectedPreviousVersion() = runTest {
        val api = FakeSynchronisationApi(
            Response.success(
                response(
                    state = SyncMutationResponseDto.State.synchronised,
                    acknowledgedAt = OffsetDateTime.parse("2026-09-04T00:00:00Z"),
                    serverEntityVersion = BigDecimal.valueOf(2L),
                ),
            ),
        )

        val delivery = OpenApiSyncMutationTransport(api, session()).send(mutation(version = 2L))

        assertEquals(SyncMutationDelivery.Acknowledged, delivery)
        assertEquals(BigDecimal.ONE, api.request?.expectedEntityVersion)
        assertEquals(BigDecimal.valueOf(2L), api.request?.entityVersion)
        assertEquals("company-a", api.companyId)
    }

    @Test
    fun sendsFrozenPayloadAndRequiresPayloadApplicationAcknowledgement() = runTest {
        val api = FakeSynchronisationApi(
            Response.success(
                response(
                    state = SyncMutationResponseDto.State.synchronised,
                    acknowledgedAt = OffsetDateTime.parse("2026-09-04T00:00:00Z"),
                    serverEntityVersion = BigDecimal.ONE,
                    payloadApplied = true,
                ),
            ),
        )
        var bearerToken: String? = null
        val payload = InspectionSubmissionPayload(
            companyId = "company-a",
            jobId = "job-001",
            siteId = "site-001",
            jurisdiction = SupportedJurisdiction.NSW,
            submissionId = "submission-001",
            jobPackVersion = 1L,
            anchorInspections = emptyList(),
        )

        val delivery = OpenApiSyncMutationTransport(
            synchronisationApi = api,
            session = session(),
            bearerTokenSink = { bearerToken = it },
        ).send(mutation(), payload)

        assertEquals(SyncMutationDelivery.Acknowledged, delivery)
        assertEquals("access-token", bearerToken)
        assertEquals("NSW", api.request?.payload?.jurisdiction?.value)
        assertEquals(BigDecimal.ONE, api.request?.payload?.jobPackVersion)
        assertEquals("submission-001", api.request?.payload?.submissionId)
    }

    @Test
    fun mapsStructuredServerConflictToVisibleDomainFailure() = runTest {
        val api = FakeSynchronisationApi(
            Response.success(
                response(
                    state = SyncMutationResponseDto.State.conflict,
                    conflict = SyncMutationConflictDto(
                        conflictId = "conflict-001",
                        expectedEntityVersion = BigDecimal.ZERO,
                        message = "Server entity version changed.",
                        reason = SyncMutationConflictDto.Reason.expected_version_mismatch,
                        currentEntityVersion = BigDecimal.ONE,
                    ),
                ),
            ),
        )

        val delivery = OpenApiSyncMutationTransport(api, session()).send(mutation())

        assertTrue(delivery is SyncMutationDelivery.Conflict)
        assertTrue((delivery as SyncMutationDelivery.Conflict).error.contains("conflict-001"))
        assertTrue(delivery.error.contains("expected_version_mismatch"))
        assertTrue(delivery.error.contains("current 1"))
    }

    @Test
    fun mapsClientRejectionToVisiblePermanentFailure() = runTest {
        val api = FakeSynchronisationApi(
            Response.error(403, "".toResponseBody("text/plain".toMediaType())),
        )

        val delivery = OpenApiSyncMutationTransport(api, session()).send(mutation())

        assertEquals(
            SyncMutationDelivery.PermanentFailure("Server rejected the mutation (HTTP 403)."),
            delivery,
        )
    }

    @Test
    fun mapsPhotoUploadAcknowledgementAndEncodesChunkBytes() = runTest {
        val api = FakeSynchronisationApi(
            photoResponse = Response.success(
                PhotoUploadChunkResponseDto(
                    mediaId = "photo-001",
                    nextOffset = BigDecimal.valueOf(4L),
                    uploaded = true,
                ),
            ),
        )
        var bearerToken: String? = null
        val delivery = OpenApiPhotoUploadTransport(
            synchronisationApi = api,
            session = session(expiresAt = Long.MAX_VALUE),
            bearerTokenSink = { bearerToken = it },
        ).upload(
            PhotoUploadChunk(
                mediaId = "photo-001",
                companyId = "company-a",
                jobId = "job-001",
                jobPackVersion = 1L,
                anchorInspectionId = "anchor-inspection-001",
                localId = "photo-001",
                storageReference = "anchor-photos/photo-001.jpg",
                checksum = "checksum",
                contentType = "image/jpeg",
                totalBytes = 4L,
                offset = 0L,
                bytes = "test".encodeToByteArray(),
            ),
        )

        assertEquals(PhotoUploadDelivery.Uploaded, delivery)
        assertEquals("access-token", bearerToken)
        assertEquals("dGVzdA==", api.photoRequest?.bytesBase64)
        assertEquals(BigDecimal.ZERO, api.photoRequest?.offset)
        assertEquals("photo-001", api.photoMediaId)
    }

    @Test
    fun mapsPhotoOffsetConflictToRetryableDelivery() = runTest {
        val api = FakeSynchronisationApi(
            photoResponse = Response.error(
                409,
                "".toResponseBody("text/plain".toMediaType()),
            ),
        )
        val delivery = OpenApiPhotoUploadTransport(
            synchronisationApi = api,
            session = session(expiresAt = Long.MAX_VALUE),
        ).upload(
            PhotoUploadChunk(
                mediaId = "photo-001",
                companyId = "company-a",
                jobId = "job-001",
                jobPackVersion = 1L,
                anchorInspectionId = "anchor-inspection-001",
                localId = "photo-001",
                storageReference = "anchor-photos/photo-001.jpg",
                checksum = "checksum",
                contentType = "image/jpeg",
                totalBytes = 4L,
                offset = 0L,
                bytes = "test".encodeToByteArray(),
            ),
        )

        assertTrue(delivery is PhotoUploadDelivery.RetryableFailure)
    }

    private fun session(expiresAt: Long = 2_000L) = FieldSession(
        accessToken = "access-token",
        companyId = "company-a",
        sessionId = "session-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
        mfaSatisfied = false,
        expiresAtEpochMillis = expiresAt,
    )

    private fun mutation(version: Long = 1L) = SyncMutation(
        companyId = "company-a",
        mutationId = "mutation-001",
        idempotencyKey = "mutation-001",
        operation = au.com.heightsafety.domain.SyncMutationOperation.SUBMIT_INSPECTION,
        entityType = au.com.heightsafety.domain.INSPECTION_SUBMISSION_ENTITY_TYPE,
        entityId = "submission-001",
        entityVersion = version,
        actorUserId = "inspector-a",
        sessionId = "session-a",
        createdAtEpochMillis = 1_000L,
    )

    private fun response(
        state: SyncMutationResponseDto.State,
        acknowledgedAt: OffsetDateTime? = null,
        serverEntityVersion: BigDecimal? = null,
        conflict: SyncMutationConflictDto? = null,
        payloadApplied: Boolean = false,
    ) = SyncMutationResponseDto(
        companyId = "company-a",
        idempotencyKey = "mutation-001",
        mutationId = "mutation-001",
        payloadApplied = payloadApplied,
        replayed = false,
        state = state,
        acknowledgedAt = acknowledgedAt,
        conflict = conflict,
        serverEntityVersion = serverEntityVersion,
    )

    private class FakeSynchronisationApi(
        private val response: Response<SyncMutationResponseDto> = Response.success(
            SyncMutationResponseDto(
                companyId = "company-a",
                idempotencyKey = "mutation-001",
                mutationId = "mutation-001",
                payloadApplied = false,
                replayed = false,
                state = SyncMutationResponseDto.State.synchronised,
                acknowledgedAt = OffsetDateTime.parse("2026-09-04T00:00:00Z"),
                conflict = null,
                serverEntityVersion = BigDecimal.ONE,
            ),
        ),
        private val photoResponse: Response<PhotoUploadChunkResponseDto> =
            Response.success(
                PhotoUploadChunkResponseDto(
                    mediaId = "photo-001",
                    nextOffset = BigDecimal.valueOf(4L),
                    uploaded = true,
                ),
            ),
    ) : SynchronisationApi {
        var companyId: String? = null
        var request: SyncMutationRequestDto? = null
        var photoMediaId: String? = null
        var photoRequest: PhotoUploadChunkDto? = null

        override suspend fun submitSyncMutation(
            xCompanyId: String,
            syncMutationRequestDto: SyncMutationRequestDto,
        ): Response<SyncMutationResponseDto> {
            companyId = xCompanyId
            request = syncMutationRequestDto
            return response
        }

        override suspend fun uploadPhotoChunk(
            xCompanyId: String,
            mediaId: String,
            photoUploadChunkDto: PhotoUploadChunkDto,
        ): Response<PhotoUploadChunkResponseDto> {
            photoMediaId = mediaId
            photoRequest = photoUploadChunkDto
            return photoResponse
        }

        override suspend fun uploadRecoveryPhotoChunk(
            xCompanyId: String,
            mediaId: String,
            photoUploadChunkDto: PhotoUploadChunkDto,
        ): Response<PhotoUploadChunkResponseDto> = error("unused")
    }
}
