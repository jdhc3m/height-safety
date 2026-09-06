# SynchronisationApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**submitSyncMutation**](SynchronisationApi.md#submitSyncMutation) | **POST** sync/mutations | Submit one idempotent mutation envelope |



Submit one idempotent mutation envelope

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(SynchronisationApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val syncMutationRequestDto : SyncMutationRequestDto =  // SyncMutationRequestDto | 

launch(Dispatchers.IO) {
    val result : SyncMutationResponseDto = webService.submitSyncMutation(xCompanyId, syncMutationRequestDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **syncMutationRequestDto** | [**SyncMutationRequestDto**](SyncMutationRequestDto.md)|  | |

### Return type

[**SyncMutationResponseDto**](SyncMutationResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

