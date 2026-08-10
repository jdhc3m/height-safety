package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.HealthResponseDto

interface SystemApi {
    /**
     * GET health
     * Check API health
     * 
     * Responses:
     *  - 200: 
     *
     * @return [HealthResponseDto]
     */
    @GET("health")
    suspend fun getHealth(): Response<HealthResponseDto>

}
