package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.AnchorResponseDto
import au.com.heightsafety.api.models.ClientResponseDto
import au.com.heightsafety.api.models.CreateAnchorDto
import au.com.heightsafety.api.models.CreateClientDto
import au.com.heightsafety.api.models.CreateSiteDto
import au.com.heightsafety.api.models.SiteResponseDto
import au.com.heightsafety.api.models.UpdateAnchorDto
import au.com.heightsafety.api.models.UpdateClientDto
import au.com.heightsafety.api.models.UpdateSiteDto

interface SiteRegisterApi {
    /**
     * POST sites/{siteId}/anchors
     * Add a single-point anchor to a site register
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @param createAnchorDto 
     * @return [AnchorResponseDto]
     */
    @POST("sites/{siteId}/anchors")
    suspend fun createAnchor(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String, @Body createAnchorDto: CreateAnchorDto): Response<AnchorResponseDto>

    /**
     * POST clients
     * Create a company client
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param createClientDto 
     * @return [ClientResponseDto]
     */
    @POST("clients")
    suspend fun createClient(@Header("x-company-id") xCompanyId: kotlin.String, @Body createClientDto: CreateClientDto): Response<ClientResponseDto>

    /**
     * POST sites
     * Create a site with supported jurisdiction context
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param createSiteDto 
     * @return [SiteResponseDto]
     */
    @POST("sites")
    suspend fun createSite(@Header("x-company-id") xCompanyId: kotlin.String, @Body createSiteDto: CreateSiteDto): Response<SiteResponseDto>

    /**
     * GET sites/{siteId}/anchors/{anchorId}
     * Read a registered anchor
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @param anchorId 
     * @return [AnchorResponseDto]
     */
    @GET("sites/{siteId}/anchors/{anchorId}")
    suspend fun getAnchor(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String, @Path("anchorId") anchorId: kotlin.String): Response<AnchorResponseDto>

    /**
     * GET clients/{clientId}
     * Read a company client
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param clientId 
     * @return [ClientResponseDto]
     */
    @GET("clients/{clientId}")
    suspend fun getClient(@Header("x-company-id") xCompanyId: kotlin.String, @Path("clientId") clientId: kotlin.String): Response<ClientResponseDto>

    /**
     * GET sites/{siteId}
     * Read a company site
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @return [SiteResponseDto]
     */
    @GET("sites/{siteId}")
    suspend fun getSite(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String): Response<SiteResponseDto>

    /**
     * GET sites/{siteId}/anchors
     * List a site anchor register
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @return [kotlin.collections.List<AnchorResponseDto>]
     */
    @GET("sites/{siteId}/anchors")
    suspend fun listAnchors(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String): Response<kotlin.collections.List<AnchorResponseDto>>

    /**
     * GET clients
     * List company clients
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @return [kotlin.collections.List<ClientResponseDto>]
     */
    @GET("clients")
    suspend fun listClients(@Header("x-company-id") xCompanyId: kotlin.String): Response<kotlin.collections.List<ClientResponseDto>>

    /**
     * GET sites
     * List company sites
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @return [kotlin.collections.List<SiteResponseDto>]
     */
    @GET("sites")
    suspend fun listSites(@Header("x-company-id") xCompanyId: kotlin.String): Response<kotlin.collections.List<SiteResponseDto>>

    /**
     * PATCH sites/{siteId}/anchors/{anchorId}
     * Update a registered anchor
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @param anchorId 
     * @param updateAnchorDto 
     * @return [AnchorResponseDto]
     */
    @PATCH("sites/{siteId}/anchors/{anchorId}")
    suspend fun updateAnchor(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String, @Path("anchorId") anchorId: kotlin.String, @Body updateAnchorDto: UpdateAnchorDto): Response<AnchorResponseDto>

    /**
     * PATCH clients/{clientId}
     * Update a company client
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param clientId 
     * @param updateClientDto 
     * @return [ClientResponseDto]
     */
    @PATCH("clients/{clientId}")
    suspend fun updateClient(@Header("x-company-id") xCompanyId: kotlin.String, @Path("clientId") clientId: kotlin.String, @Body updateClientDto: UpdateClientDto): Response<ClientResponseDto>

    /**
     * PATCH sites/{siteId}
     * Update a company site
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @param siteId 
     * @param updateSiteDto 
     * @return [SiteResponseDto]
     */
    @PATCH("sites/{siteId}")
    suspend fun updateSite(@Header("x-company-id") xCompanyId: kotlin.String, @Path("siteId") siteId: kotlin.String, @Body updateSiteDto: UpdateSiteDto): Response<SiteResponseDto>

}
