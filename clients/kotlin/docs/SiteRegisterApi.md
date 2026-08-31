# SiteRegisterApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createAnchor**](SiteRegisterApi.md#createAnchor) | **POST** sites/{siteId}/anchors | Add a single-point anchor to a site register |
| [**createClient**](SiteRegisterApi.md#createClient) | **POST** clients | Create a company client |
| [**createSite**](SiteRegisterApi.md#createSite) | **POST** sites | Create a site with supported jurisdiction context |
| [**getAnchor**](SiteRegisterApi.md#getAnchor) | **GET** sites/{siteId}/anchors/{anchorId} | Read a registered anchor |
| [**getClient**](SiteRegisterApi.md#getClient) | **GET** clients/{clientId} | Read a company client |
| [**getSite**](SiteRegisterApi.md#getSite) | **GET** sites/{siteId} | Read a company site |
| [**listAnchors**](SiteRegisterApi.md#listAnchors) | **GET** sites/{siteId}/anchors | List a site anchor register |
| [**listClients**](SiteRegisterApi.md#listClients) | **GET** clients | List company clients |
| [**listSites**](SiteRegisterApi.md#listSites) | **GET** sites | List company sites |
| [**updateAnchor**](SiteRegisterApi.md#updateAnchor) | **PATCH** sites/{siteId}/anchors/{anchorId} | Update a registered anchor |
| [**updateClient**](SiteRegisterApi.md#updateClient) | **PATCH** clients/{clientId} | Update a company client |
| [**updateSite**](SiteRegisterApi.md#updateSite) | **PATCH** sites/{siteId} | Update a company site |



Add a single-point anchor to a site register

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 
val createAnchorDto : CreateAnchorDto =  // CreateAnchorDto | 

launch(Dispatchers.IO) {
    val result : AnchorResponseDto = webService.createAnchor(xCompanyId, siteId, createAnchorDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **siteId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **createAnchorDto** | [**CreateAnchorDto**](CreateAnchorDto.md)|  | |

### Return type

[**AnchorResponseDto**](AnchorResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Create a company client

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val createClientDto : CreateClientDto =  // CreateClientDto | 

launch(Dispatchers.IO) {
    val result : ClientResponseDto = webService.createClient(xCompanyId, createClientDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **createClientDto** | [**CreateClientDto**](CreateClientDto.md)|  | |

### Return type

[**ClientResponseDto**](ClientResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Create a site with supported jurisdiction context

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val createSiteDto : CreateSiteDto =  // CreateSiteDto | 

launch(Dispatchers.IO) {
    val result : SiteResponseDto = webService.createSite(xCompanyId, createSiteDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **createSiteDto** | [**CreateSiteDto**](CreateSiteDto.md)|  | |

### Return type

[**SiteResponseDto**](SiteResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Read a registered anchor

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 
val anchorId : kotlin.String = anchorId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : AnchorResponseDto = webService.getAnchor(xCompanyId, siteId, anchorId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **siteId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **anchorId** | **kotlin.String**|  | |

### Return type

[**AnchorResponseDto**](AnchorResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Read a company client

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val clientId : kotlin.String = clientId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : ClientResponseDto = webService.getClient(xCompanyId, clientId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **clientId** | **kotlin.String**|  | |

### Return type

[**ClientResponseDto**](ClientResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Read a company site

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : SiteResponseDto = webService.getSite(xCompanyId, siteId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **siteId** | **kotlin.String**|  | |

### Return type

[**SiteResponseDto**](SiteResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


List a site anchor register

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<AnchorResponseDto> = webService.listAnchors(xCompanyId, siteId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **siteId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;AnchorResponseDto&gt;**](AnchorResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


List company clients

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<ClientResponseDto> = webService.listClients(xCompanyId)
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xCompanyId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;ClientResponseDto&gt;**](ClientResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


List company sites

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<SiteResponseDto> = webService.listSites(xCompanyId)
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xCompanyId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;SiteResponseDto&gt;**](SiteResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Update a registered anchor

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 
val anchorId : kotlin.String = anchorId_example // kotlin.String | 
val updateAnchorDto : UpdateAnchorDto =  // UpdateAnchorDto | 

launch(Dispatchers.IO) {
    val result : AnchorResponseDto = webService.updateAnchor(xCompanyId, siteId, anchorId, updateAnchorDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **siteId** | **kotlin.String**|  | |
| **anchorId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **updateAnchorDto** | [**UpdateAnchorDto**](UpdateAnchorDto.md)|  | |

### Return type

[**AnchorResponseDto**](AnchorResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Update a company client

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val clientId : kotlin.String = clientId_example // kotlin.String | 
val updateClientDto : UpdateClientDto =  // UpdateClientDto | 

launch(Dispatchers.IO) {
    val result : ClientResponseDto = webService.updateClient(xCompanyId, clientId, updateClientDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **clientId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **updateClientDto** | [**UpdateClientDto**](UpdateClientDto.md)|  | |

### Return type

[**ClientResponseDto**](ClientResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Update a company site

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SiteRegisterApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 
val updateSiteDto : UpdateSiteDto =  // UpdateSiteDto | 

launch(Dispatchers.IO) {
    val result : SiteResponseDto = webService.updateSite(xCompanyId, siteId, updateSiteDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **siteId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **updateSiteDto** | [**UpdateSiteDto**](UpdateSiteDto.md)|  | |

### Return type

[**SiteResponseDto**](SiteResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

