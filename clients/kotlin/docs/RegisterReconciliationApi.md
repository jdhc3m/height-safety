# RegisterReconciliationApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**decideReconciliationProposal**](RegisterReconciliationApi.md#decideReconciliationProposal) | **POST** sites/{siteId}/reconciliation-proposals/{proposalId}/decision | Record one accept or reject decision for a submitted reconciliation proposal |
| [**listReconciliationProposals**](RegisterReconciliationApi.md#listReconciliationProposals) | **GET** sites/{siteId}/reconciliation-proposals | List open reconciliation proposals submitted for one site, newest first |



Record one accept or reject decision for a submitted reconciliation proposal

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(RegisterReconciliationApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 
val proposalId : kotlin.String = proposalId_example // kotlin.String | 
val decideReconciliationProposalDto : DecideReconciliationProposalDto =  // DecideReconciliationProposalDto | 

launch(Dispatchers.IO) {
    val result : ReconciliationProposalDecisionResponseDto = webService.decideReconciliationProposal(xCompanyId, siteId, proposalId, decideReconciliationProposalDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **siteId** | **kotlin.String**|  | |
| **proposalId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **decideReconciliationProposalDto** | [**DecideReconciliationProposalDto**](DecideReconciliationProposalDto.md)|  | |

### Return type

[**ReconciliationProposalDecisionResponseDto**](ReconciliationProposalDecisionResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


List open reconciliation proposals submitted for one site, newest first

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(RegisterReconciliationApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val siteId : kotlin.String = siteId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<ReconciliationProposalResponseDto> = webService.listReconciliationProposals(xCompanyId, siteId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **siteId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;ReconciliationProposalResponseDto&gt;**](ReconciliationProposalResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

