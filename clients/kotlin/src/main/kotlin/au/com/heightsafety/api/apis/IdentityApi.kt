package au.com.heightsafety.api.apis

import au.com.heightsafety.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

import au.com.heightsafety.api.models.AcceptInvitationDto
import au.com.heightsafety.api.models.AuthMeResponseDto
import au.com.heightsafety.api.models.CreateInvitationDto
import au.com.heightsafety.api.models.InvitationResponseDto
import au.com.heightsafety.api.models.ProviderAccessTokenDto
import au.com.heightsafety.api.models.SessionResponseDto
import au.com.heightsafety.api.models.SessionRevokedResponseDto

interface IdentityApi {
    /**
     * POST auth/invitations/accept
     * Accept an invitation using a verified provider identity
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param acceptInvitationDto 
     * @return [SessionResponseDto]
     */
    @POST("auth/invitations/accept")
    suspend fun acceptInvitation(@Header("x-company-id") xCompanyId: kotlin.String, @Body acceptInvitationDto: AcceptInvitationDto): Response<SessionResponseDto>

    /**
     * POST auth/invitations
     * Create an invitation for a company user
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param createInvitationDto 
     * @return [InvitationResponseDto]
     */
    @POST("auth/invitations")
    suspend fun createInvitation(@Header("x-company-id") xCompanyId: kotlin.String, @Body createInvitationDto: CreateInvitationDto): Response<InvitationResponseDto>

    /**
     * POST auth/sessions
     * Create an application session from a provider access token
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @param providerAccessTokenDto 
     * @return [SessionResponseDto]
     */
    @POST("auth/sessions")
    suspend fun createSession(@Header("x-company-id") xCompanyId: kotlin.String, @Body providerAccessTokenDto: ProviderAccessTokenDto): Response<SessionResponseDto>

    /**
     * GET auth/me
     * Read current session membership and role
     * 
     * Responses:
     *  - 200: 
     *
     * @param xCompanyId 
     * @return [AuthMeResponseDto]
     */
    @GET("auth/me")
    suspend fun getCurrentAuth(@Header("x-company-id") xCompanyId: kotlin.String): Response<AuthMeResponseDto>

    /**
     * POST auth/sessions/revoke
     * Revoke the current application session
     * 
     * Responses:
     *  - 201: 
     *
     * @param xCompanyId 
     * @return [SessionRevokedResponseDto]
     */
    @POST("auth/sessions/revoke")
    suspend fun revokeCurrentSession(@Header("x-company-id") xCompanyId: kotlin.String): Response<SessionRevokedResponseDto>

}
