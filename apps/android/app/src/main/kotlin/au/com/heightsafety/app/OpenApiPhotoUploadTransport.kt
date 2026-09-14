package au.com.heightsafety.app

import au.com.heightsafety.api.apis.SynchronisationApi
import au.com.heightsafety.api.models.PhotoUploadChunkDto
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.PhotoUploadChunk
import au.com.heightsafety.domain.PhotoUploadDelivery
import au.com.heightsafety.domain.PhotoUploadTransport
import java.io.IOException
import java.math.BigDecimal
import java.util.Base64

/** Maps the generated resumable-photo endpoint into the field-domain port. */
public class OpenApiPhotoUploadTransport(
    private val synchronisationApi: SynchronisationApi,
    private val session: FieldSession,
    private val bearerTokenSink: (String) -> Unit = {},
) : PhotoUploadTransport {
    override suspend fun upload(chunk: PhotoUploadChunk): PhotoUploadDelivery {
        require(chunk.companyId == session.companyId) {
            "photo chunk company does not match the active session"
        }
        if (session.isExpired(System.currentTimeMillis())) {
            return PhotoUploadDelivery.PermanentFailure(
                "Active field session is expired; sign in again before uploading photos.",
            )
        }

        bearerTokenSink(session.accessToken)
        val encoded = try {
            Base64.getEncoder().encodeToString(chunk.bytes)
        } catch (error: IllegalArgumentException) {
            return PhotoUploadDelivery.PermanentFailure(
                error.message ?: "Photo chunk could not be encoded.",
            )
        }
        val response = synchronisationApi.uploadPhotoChunk(
            xCompanyId = session.companyId,
            mediaId = chunk.mediaId,
            photoUploadChunkDto = PhotoUploadChunkDto(
                bytesBase64 = encoded,
                checksum = chunk.checksum,
                localId = chunk.localId,
                mediaId = chunk.mediaId,
                offset = BigDecimal.valueOf(chunk.offset),
                storageReference = chunk.storageReference,
                totalBytes = BigDecimal.valueOf(chunk.totalBytes),
                contentType = chunk.contentType,
            ),
        )

        if (!response.isSuccessful) {
            return when (response.code()) {
                409 -> PhotoUploadDelivery.RetryableFailure(
                    "Server reported a photo upload offset conflict; retrying the same chunk.",
                )
                in 400..499 -> PhotoUploadDelivery.PermanentFailure(
                    "Server rejected the photo upload (HTTP ${response.code()}).",
                )
                else -> throw IOException(
                    "Photo upload request failed (HTTP ${response.code()}).",
                )
            }
        }

        val body = response.body() ?: throw IOException(
            "Photo upload response did not include a body.",
        )
        if (body.mediaId != chunk.mediaId) {
            throw IOException("Photo upload response media identity did not match the request.")
        }
        val nextOffset = try {
            body.nextOffset.longValueExact()
        } catch (error: ArithmeticException) {
            throw IOException("Photo upload response offset was not an integer.", error)
        }
        if (
            nextOffset <= chunk.offset ||
            nextOffset > chunk.offset + chunk.bytes.size ||
            nextOffset > chunk.totalBytes
        ) {
            throw IOException("Photo upload response offset was outside the accepted chunk.")
        }
        return if (body.uploaded && nextOffset == chunk.totalBytes) {
            PhotoUploadDelivery.Uploaded
        } else {
            PhotoUploadDelivery.ChunkAccepted(nextOffset)
        }
    }
}
