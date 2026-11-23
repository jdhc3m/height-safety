# IdentityApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**acceptInvitation**](IdentityApi.md#acceptInvitation) | **POST** auth/invitations/accept | Accept an invitation using a verified provider identity |
| [**createInvitation**](IdentityApi.md#createInvitation) | **POST** auth/invitations | Create an invitation for a company user |
| [**createSession**](IdentityApi.md#createSession) | **POST** auth/sessions | Create an application session from a provider access token |
| [**getCurrentAuth**](IdentityApi.md#getCurrentAuth) | **GET** auth/me | Read current session membership and role |
| [**renewSession**](IdentityApi.md#renewSession) | **POST** auth/sessions/renew | Renew a still-live application session after membership revalidation |
| [**revokeCurrentSession**](IdentityApi.md#revokeCurrentSession) | **POST** auth/sessions/revoke | Revoke the current application session |



Accept an invitation using a verified provider identity

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
val webService = apiClient.createWebservice(IdentityApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val acceptInvitationDto : AcceptInvitationDto =  // AcceptInvitationDto | 

launch(Dispatchers.IO) {
    val result : SessionResponseDto = webService.acceptInvitation(xCompanyId, acceptInvitationDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **acceptInvitationDto** | [**AcceptInvitationDto**](AcceptInvitationDto.md)|  | |

### Return type

[**SessionResponseDto**](SessionResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Create an invitation for a company user

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(IdentityApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val createInvitationDto : CreateInvitationDto =  // CreateInvitationDto | 

launch(Dispatchers.IO) {
    val result : InvitationResponseDto = webService.createInvitation(xCompanyId, createInvitationDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **createInvitationDto** | [**CreateInvitationDto**](CreateInvitationDto.md)|  | |

### Return type

[**InvitationResponseDto**](InvitationResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Create an application session from a provider access token

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
val webService = apiClient.createWebservice(IdentityApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val providerAccessTokenDto : ProviderAccessTokenDto =  // ProviderAccessTokenDto | 

launch(Dispatchers.IO) {
    val result : SessionResponseDto = webService.createSession(xCompanyId, providerAccessTokenDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **providerAccessTokenDto** | [**ProviderAccessTokenDto**](ProviderAccessTokenDto.md)|  | |

### Return type

[**SessionResponseDto**](SessionResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Read current session membership and role

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(IdentityApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : AuthMeResponseDto = webService.getCurrentAuth(xCompanyId)
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xCompanyId** | **kotlin.String**|  | |

### Return type

[**AuthMeResponseDto**](AuthMeResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Renew a still-live application session after membership revalidation

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(IdentityApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : SessionResponseDto = webService.renewSession(xCompanyId)
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xCompanyId** | **kotlin.String**|  | |

### Return type

[**SessionResponseDto**](SessionResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Revoke the current application session

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(IdentityApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : SessionRevokedResponseDto = webService.revokeCurrentSession(xCompanyId)
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xCompanyId** | **kotlin.String**|  | |

### Return type

[**SessionRevokedResponseDto**](SessionRevokedResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

