package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.AssignJobDto
import au.com.heightsafety.api.models.CreateJobDto
import au.com.heightsafety.api.models.JobPackResponseDto
import au.com.heightsafety.api.models.JobResponseDto

interface JobWorkflowApi {
    /**
     * POST jobs/{jobId}/assignment
     * Assign a released job to an inspector
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param jobId 
     * @param assignJobDto 
     * @return [JobResponseDto]
     */
    @POST("jobs/{jobId}/assignment")
    suspend fun assignJob(@Header("x-company-id") xCompanyId: kotlin.String, @Path("jobId") jobId: kotlin.String, @Body assignJobDto: AssignJobDto): Response<JobResponseDto>

    /**
     * POST jobs/{jobId}/claim
     * Claim a released job
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param jobId 
     * @return [JobResponseDto]
     */
    @POST("jobs/{jobId}/claim")
    suspend fun claimJob(@Header("x-company-id") xCompanyId: kotlin.String, @Path("jobId") jobId: kotlin.String): Response<JobResponseDto>

    /**
     * POST jobs
     * Create a draft job
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param createJobDto 
     * @return [JobResponseDto]
     */
    @POST("jobs")
    suspend fun createJob(@Header("x-company-id") xCompanyId: kotlin.String, @Body createJobDto: CreateJobDto): Response<JobResponseDto>

    /**
     * GET jobs/{jobId}/pack
     * Download an authorised versioned job pack
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param jobId 
     * @return [JobPackResponseDto]
     */
    @GET("jobs/{jobId}/pack")
    suspend fun downloadJobPack(@Header("x-company-id") xCompanyId: kotlin.String, @Path("jobId") jobId: kotlin.String): Response<JobPackResponseDto>

    /**
     * GET jobs/{jobId}
     * Read an authorised job
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param jobId 
     * @return [JobResponseDto]
     */
    @GET("jobs/{jobId}")
    suspend fun getJob(@Header("x-company-id") xCompanyId: kotlin.String, @Path("jobId") jobId: kotlin.String): Response<JobResponseDto>

    /**
     * GET jobs
     * List authorised jobs
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @return [kotlin.collections.List<JobResponseDto>]
     */
    @GET("jobs")
    suspend fun listJobs(@Header("x-company-id") xCompanyId: kotlin.String): Response<kotlin.collections.List<JobResponseDto>>

    /**
     * POST jobs/{jobId}/release
     * Release a draft job
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param jobId 
     * @return [JobResponseDto]
     */
    @POST("jobs/{jobId}/release")
    suspend fun releaseJob(@Header("x-company-id") xCompanyId: kotlin.String, @Path("jobId") jobId: kotlin.String): Response<JobResponseDto>

}
