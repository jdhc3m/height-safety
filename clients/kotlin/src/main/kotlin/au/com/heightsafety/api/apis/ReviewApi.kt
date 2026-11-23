package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.AnchorRecordedOutcomeDto
import au.com.heightsafety.api.models.CreateReviewIssueDto
import au.com.heightsafety.api.models.ResolveReviewIssueDto
import au.com.heightsafety.api.models.ReviewActionResponseDto
import au.com.heightsafety.api.models.ReviewIssueResolutionResponseDto
import au.com.heightsafety.api.models.ReviewIssueResponseDto
import au.com.heightsafety.api.models.SubmittedInspectionEvidenceResponseDto

interface ReviewApi {
    /**
     * POST reviews/issues
     * Record an append-only office review issue or change request
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param createReviewIssueDto 
     * @return [ReviewIssueResponseDto]
     */
    @POST("reviews/issues")
    suspend fun createReviewIssue(@Header("x-company-id") xCompanyId: kotlin.String, @Body createReviewIssueDto: CreateReviewIssueDto): Response<ReviewIssueResponseDto>

    /**
     * GET reviews/anchor-inspections/{anchorInspectionId}/previous-revision
     * Read the submitted inspection revision recorded immediately before one anchor inspection
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param anchorInspectionId 
     * @return [AnchorRecordedOutcomeDto]
     */
    @GET("reviews/anchor-inspections/{anchorInspectionId}/previous-revision")
    suspend fun getPreviousAnchorInspectionRevision(@Header("x-company-id") xCompanyId: kotlin.String, @Path("anchorInspectionId") anchorInspectionId: kotlin.String): Response<AnchorRecordedOutcomeDto>

    /**
     * GET reviews/inspections/{inspectionId}/evidence
     * Read one submitted inspection revision, its anchor evidence and photo metadata
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param inspectionId 
     * @return [SubmittedInspectionEvidenceResponseDto]
     */
    @GET("reviews/inspections/{inspectionId}/evidence")
    suspend fun getSubmittedInspectionEvidence(@Header("x-company-id") xCompanyId: kotlin.String, @Path("inspectionId") inspectionId: kotlin.String): Response<SubmittedInspectionEvidenceResponseDto>

    /**
     * GET reviews/anchors/{anchorId}/recorded-outcomes
     * List recorded outcomes for one register anchor across its submitted inspection revisions, newest first
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param anchorId 
     * @return [kotlin.collections.List<AnchorRecordedOutcomeDto>]
     */
    @GET("reviews/anchors/{anchorId}/recorded-outcomes")
    suspend fun listAnchorRecordedOutcomes(@Header("x-company-id") xCompanyId: kotlin.String, @Path("anchorId") anchorId: kotlin.String): Response<kotlin.collections.List<AnchorRecordedOutcomeDto>>

    /**
     * GET reviews/issues/{reviewIssueId}/actions
     * List append-only actions for one review issue
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param reviewIssueId 
     * @return [kotlin.collections.List<ReviewActionResponseDto>]
     */
    @GET("reviews/issues/{reviewIssueId}/actions")
    suspend fun listReviewActions(@Header("x-company-id") xCompanyId: kotlin.String, @Path("reviewIssueId") reviewIssueId: kotlin.String): Response<kotlin.collections.List<ReviewActionResponseDto>>

    /**
     * GET reviews/inspections/{inspectionId}/issues
     * List review issues for one submitted inspection revision
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param inspectionId 
     * @return [kotlin.collections.List<ReviewIssueResponseDto>]
     */
    @GET("reviews/inspections/{inspectionId}/issues")
    suspend fun listReviewIssues(@Header("x-company-id") xCompanyId: kotlin.String, @Path("inspectionId") inspectionId: kotlin.String): Response<kotlin.collections.List<ReviewIssueResponseDto>>

    /**
     * POST reviews/issues/{reviewIssueId}/resolve
     * Record a reasoned resolution without changing inspector evidence
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param reviewIssueId 
     * @param resolveReviewIssueDto 
     * @return [ReviewIssueResolutionResponseDto]
     */
    @POST("reviews/issues/{reviewIssueId}/resolve")
    suspend fun resolveReviewIssue(@Header("x-company-id") xCompanyId: kotlin.String, @Path("reviewIssueId") reviewIssueId: kotlin.String, @Body resolveReviewIssueDto: ResolveReviewIssueDto): Response<ReviewIssueResolutionResponseDto>

}
