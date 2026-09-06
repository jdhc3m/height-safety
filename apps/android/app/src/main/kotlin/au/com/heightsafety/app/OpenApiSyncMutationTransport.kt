package au.com.heightsafety.app

import au.com.heightsafety.api.apis.SynchronisationApi
import au.com.heightsafety.api.models.SyncAnchorInspectionPayloadDto
import au.com.heightsafety.api.models.SyncInspectionPhotoPayloadDto
import au.com.heightsafety.api.models.SyncInspectionSubmissionPayloadDto
import au.com.heightsafety.api.models.SyncMutationRequestDto
import au.com.heightsafety.api.models.SyncMutationResponseDto
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.InspectionSubmissionPayload
import au.com.heightsafety.domain.SyncMutation
import au.com.heightsafety.domain.SyncMutationDelivery
import au.com.heightsafety.domain.SyncMutationTransport
import java.io.IOException
import java.math.BigDecimal

/** Maps the generated synchronisation client into the field-domain port. */
public class OpenApiSyncMutationTransport(
    private val synchronisationApi: SynchronisationApi,
    private val session: FieldSession,
    private val bearerTokenSink: (String) -> Unit = {},
) : SyncMutationTransport {
    override suspend fun send(mutation: SyncMutation): SyncMutationDelivery {
        return sendInternal(mutation, payload = null, requirePayload = false)
    }

    override suspend fun send(
        mutation: SyncMutation,
        payload: InspectionSubmissionPayload?,
    ): SyncMutationDelivery = sendInternal(
        mutation = mutation,
        payload = payload,
        requirePayload = true,
    )

    private suspend fun sendInternal(
        mutation: SyncMutation,
        payload: InspectionSubmissionPayload?,
        requirePayload: Boolean,
    ): SyncMutationDelivery {
        require(mutation.companyId == session.companyId) {
            "sync mutation company does not match the active session"
        }
        require(mutation.actorUserId == session.userId) {
            "sync mutation actor does not match the active session"
        }
        require(mutation.sessionId == session.sessionId) {
            "sync mutation session does not match the active session"
        }
        if (requirePayload && payload == null) {
            return SyncMutationDelivery.PermanentFailure(
                "Frozen inspection payload is unavailable for synchronisation.",
            )
        }
        payload?.let {
            require(it.companyId == mutation.companyId) {
                "sync payload company does not match the mutation"
            }
            require(it.submissionId == mutation.entityId) {
                "sync payload submission does not match the mutation"
            }
            require(it.jobPackVersion == mutation.entityVersion) {
                "sync payload version does not match the mutation"
            }
        }
        bearerTokenSink(session.accessToken)

        val response = synchronisationApi.submitSyncMutation(
            xCompanyId = session.companyId,
            syncMutationRequestDto = SyncMutationRequestDto(
                entityId = mutation.entityId,
                entityType = SyncMutationRequestDto.EntityType.inspection_submission,
                entityVersion = BigDecimal.valueOf(mutation.entityVersion),
                expectedEntityVersion = BigDecimal.valueOf(mutation.entityVersion - 1L),
                idempotencyKey = mutation.idempotencyKey,
                mutationId = mutation.mutationId,
                operation = SyncMutationRequestDto.Operation.submit_inspection,
                payload = payload?.toDto(),
            ),
        )

        if (!response.isSuccessful) {
            return when (response.code()) {
                409 -> SyncMutationDelivery.Conflict(
                    "Server rejected the mutation as a conflict.",
                )
                in 400..499 -> SyncMutationDelivery.PermanentFailure(
                    "Server rejected the mutation (HTTP ${response.code()}).",
                )
                else -> throw IOException(
                    "Synchronisation request failed (HTTP ${response.code()}).",
                )
            }
        }

        val body = response.body() ?: throw IOException(
            "Synchronisation response did not include a body.",
        )
        requireMatchingIdentity(body, mutation)
        return when (body.state) {
            SyncMutationResponseDto.State.synchronised -> {
                val serverVersion = body.serverEntityVersion?.longValueExact()
                if (serverVersion != mutation.entityVersion || body.acknowledgedAt == null) {
                    throw IOException("Synchronisation acknowledgement was incomplete.")
                }
                if (requirePayload && !body.payloadApplied) {
                    return SyncMutationDelivery.PermanentFailure(
                        "Server acknowledged the envelope without applying its inspection payload.",
                    )
                }
                SyncMutationDelivery.Acknowledged
            }
            SyncMutationResponseDto.State.conflict -> {
                val conflict = body.conflict ?: throw IOException(
                    "Synchronisation conflict did not include details.",
                )
                SyncMutationDelivery.Conflict(
                    error = buildString {
                        append(conflict.conflictId)
                        append(": ")
                        append(conflict.message)
                        append(" [")
                        append(conflict.reason.value)
                        append(", expected ")
                        append(conflict.expectedEntityVersion)
                        append(", current ")
                        append(conflict.currentEntityVersion ?: "unknown")
                        append(']')
                    },
                )
            }
        }
    }

    private fun InspectionSubmissionPayload.toDto(): SyncInspectionSubmissionPayloadDto =
        SyncInspectionSubmissionPayloadDto(
            anchorInspections = anchorInspections.map { inspection ->
                InspectionSubmissionPayloadAnchorMapper.run { inspection.toDto() }
            },
            companyId = companyId,
            jobId = jobId,
            jobPackVersion = BigDecimal.valueOf(jobPackVersion),
            jurisdiction = SyncInspectionSubmissionPayloadDto.Jurisdiction.valueOf(jurisdiction.value),
            siteId = siteId,
            submissionId = submissionId,
        )

    private object InspectionSubmissionPayloadAnchorMapper {
        fun au.com.heightsafety.domain.AnchorInspectionDraft.toDto(): SyncAnchorInspectionPayloadDto {
            val proof = proofTest
            return SyncAnchorInspectionPayloadDto(
                identityConfirmed = identityConfirmed,
                inspectionId = inspectionId,
                locationConfirmed = locationConfirmed,
                photos = photos.map { photo ->
                    SyncInspectionPhotoPayloadDto(
                        capturedAtEpochMillis = BigDecimal.valueOf(photo.capturedAtEpochMillis),
                        checksum = photo.checksum,
                        localId = photo.localId,
                        storageReference = photo.storageReference,
                        byteSize = photo.byteSize?.let { size -> BigDecimal.valueOf(size) },
                        contentType = photo.contentType,
                    )
                },
                defectDescription = defectDescription,
                disposition = disposition?.let {
                    SyncAnchorInspectionPayloadDto.Disposition.valueOf(it.value)
                },
                exceptionReason = exceptionReason?.let {
                    SyncAnchorInspectionPayloadDto.ExceptionReason.valueOf(it.value)
                },
                expectedAnchorId = expectedAnchorId,
                location = location,
                notes = notes,
                observations = observations,
                proofTestEquipmentReference = proof?.equipmentReference,
                proofTestHold = proof?.hold,
                proofTestLoad = proof?.load,
                proofTestResult = proof?.result,
                provisionalAnchorId = provisionalAnchorId,
                recommendation = recommendation,
                reconciliationProposal = reconciliationProposal?.let {
                    SyncAnchorInspectionPayloadDto.ReconciliationProposal.valueOf(it.value)
                },
                reconciliationReferenceId = reconciliationReferenceId,
                recordedOutcome = recordedOutcome?.let {
                    SyncAnchorInspectionPayloadDto.RecordedOutcome.valueOf(it.value)
                },
            )
        }
    }

    private fun requireMatchingIdentity(
        response: SyncMutationResponseDto,
        mutation: SyncMutation,
    ) {
        if (
            response.companyId != mutation.companyId ||
            response.mutationId != mutation.mutationId ||
            response.idempotencyKey != mutation.idempotencyKey
        ) {
            throw IOException("Synchronisation response identity did not match the request.")
        }
    }
}
