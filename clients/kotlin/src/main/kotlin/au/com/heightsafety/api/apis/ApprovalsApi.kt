package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.ApproveInspectionDto
import au.com.heightsafety.api.models.ApproveInspectionResponseDto
import au.com.heightsafety.api.models.ApprovedSnapshotResponseDto

interface ApprovalsApi {
    /**
     * POST approvals
     * Freeze the exact submitted revision for draft report generation after review gates pass
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param approveInspectionDto 
     * @return [ApproveInspectionResponseDto]
     */
    @POST("approvals")
    suspend fun approveInspectionRevision(@Header("x-company-id") xCompanyId: kotlin.String, @Body approveInspectionDto: ApproveInspectionDto): Response<ApproveInspectionResponseDto>

    /**
     * GET approvals/{snapshotId}
     * Read one frozen approved snapshot in the current company scope
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param snapshotId 
     * @return [ApprovedSnapshotResponseDto]
     */
    @GET("approvals/{snapshotId}")
    suspend fun getApprovedSnapshot(@Header("x-company-id") xCompanyId: kotlin.String, @Path("snapshotId") snapshotId: kotlin.String): Response<ApprovedSnapshotResponseDto>

}
