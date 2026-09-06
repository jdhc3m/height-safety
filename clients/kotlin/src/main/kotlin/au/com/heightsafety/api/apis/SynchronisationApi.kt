package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.SyncMutationRequestDto
import au.com.heightsafety.api.models.SyncMutationResponseDto

interface SynchronisationApi {
    /**
     * POST sync/mutations
     * Submit one idempotent mutation envelope
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param syncMutationRequestDto 
     * @return [SyncMutationResponseDto]
     */
    @POST("sync/mutations")
    suspend fun submitSyncMutation(@Header("x-company-id") xCompanyId: kotlin.String, @Body syncMutationRequestDto: SyncMutationRequestDto): Response<SyncMutationResponseDto>

}
