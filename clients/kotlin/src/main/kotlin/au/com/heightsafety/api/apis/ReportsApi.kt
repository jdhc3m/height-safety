package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import okhttp3.ResponseBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.ReportGenerationResponseDto
import au.com.heightsafety.api.models.RequestReportGenerationDto

interface ReportsApi {
    /**
     * GET reports/generations/{generationId}/file
     * Download one completed private draft report revision
     * 
     * Responses:
     *  - 200: A private draft report PDF
     *
     * @param xCompanyId 
     * @param generationId 
     * @return [ResponseBody]
     */
    @GET("reports/generations/{generationId}/file")
    suspend fun downloadDraftReport(@Header("x-company-id") xCompanyId: kotlin.String, @Path("generationId") generationId: kotlin.String): Response<ResponseBody>

    /**
     * GET reports/generations/{generationId}
     * Read status for a tenant-scoped draft report generation
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param generationId 
     * @return [ReportGenerationResponseDto]
     */
    @GET("reports/generations/{generationId}")
    suspend fun getDraftReportGeneration(@Header("x-company-id") xCompanyId: kotlin.String, @Path("generationId") generationId: kotlin.String): Response<ReportGenerationResponseDto>

    /**
     * GET reports/generations
     * List tenant-scoped draft report generations, newest first, optionally for one job
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param jobId Limit the list to generations for one job (optional)
     * @return [kotlin.collections.List<ReportGenerationResponseDto>]
     */
    @GET("reports/generations")
    suspend fun listDraftReportGenerations(@Header("x-company-id") xCompanyId: kotlin.String, @Query("jobId") jobId: kotlin.String? = null): Response<kotlin.collections.List<ReportGenerationResponseDto>>

    /**
     * POST reports/generations
     * Queue one deterministic draft report revision from an approved snapshot
     * 
     * Responses:
     *  - 202: 
     *
     * @param xCompanyId 
     * @param requestReportGenerationDto 
     * @return [ReportGenerationResponseDto]
     */
    @POST("reports/generations")
    suspend fun requestDraftReportGeneration(@Header("x-company-id") xCompanyId: kotlin.String, @Body requestReportGenerationDto: RequestReportGenerationDto): Response<ReportGenerationResponseDto>

}
