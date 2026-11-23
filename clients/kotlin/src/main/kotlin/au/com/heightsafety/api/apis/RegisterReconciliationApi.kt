package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.DecideReconciliationProposalDto
import au.com.heightsafety.api.models.ReconciliationProposalDecisionResponseDto
import au.com.heightsafety.api.models.ReconciliationProposalResponseDto

interface RegisterReconciliationApi {
    /**
     * POST sites/{siteId}/reconciliation-proposals/{proposalId}/decision
     * Record one accept or reject decision for a submitted reconciliation proposal
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @param proposalId 
     * @param decideReconciliationProposalDto 
     * @return [ReconciliationProposalDecisionResponseDto]
     */
    @POST("sites/{siteId}/reconciliation-proposals/{proposalId}/decision")
    suspend fun decideReconciliationProposal(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String, @Path("proposalId") proposalId: kotlin.String, @Body decideReconciliationProposalDto: DecideReconciliationProposalDto): Response<ReconciliationProposalDecisionResponseDto>

    /**
     * GET sites/{siteId}/reconciliation-proposals
     * List open reconciliation proposals submitted for one site, newest first
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @return [kotlin.collections.List<ReconciliationProposalResponseDto>]
     */
    @GET("sites/{siteId}/reconciliation-proposals")
    suspend fun listReconciliationProposals(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String): Response<kotlin.collections.List<ReconciliationProposalResponseDto>>

}
