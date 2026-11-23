# SynchronisationApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**submitSyncMutation**](SynchronisationApi.md#submitSyncMutation) | **POST** sync/mutations | Submit one idempotent mutation envelope |
| [**uploadPhotoChunk**](SynchronisationApi.md#uploadPhotoChunk) | **POST** sync/photos/{mediaId}/chunks | Upload one resumable evidence-photo chunk |
| [**uploadRecoveryPhotoChunk**](SynchronisationApi.md#uploadRecoveryPhotoChunk) | **POST** sync/recovery/photos/{mediaId}/chunks | Upload one evidence-photo chunk during Administrator recovery |



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


Upload one resumable evidence-photo chunk

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
val mediaId : kotlin.String = mediaId_example // kotlin.String | 
val photoUploadChunkDto : PhotoUploadChunkDto =  // PhotoUploadChunkDto | 

launch(Dispatchers.IO) {
    val result : PhotoUploadChunkResponseDto = webService.uploadPhotoChunk(xCompanyId, mediaId, photoUploadChunkDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **mediaId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **photoUploadChunkDto** | [**PhotoUploadChunkDto**](PhotoUploadChunkDto.md)|  | |

### Return type

[**PhotoUploadChunkResponseDto**](PhotoUploadChunkResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Upload one evidence-photo chunk during Administrator recovery

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
val mediaId : kotlin.String = mediaId_example // kotlin.String | 
val photoUploadChunkDto : PhotoUploadChunkDto =  // PhotoUploadChunkDto | 

launch(Dispatchers.IO) {
    val result : PhotoUploadChunkResponseDto = webService.uploadRecoveryPhotoChunk(xCompanyId, mediaId, photoUploadChunkDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **mediaId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **photoUploadChunkDto** | [**PhotoUploadChunkDto**](PhotoUploadChunkDto.md)|  | |

### Return type

[**PhotoUploadChunkResponseDto**](PhotoUploadChunkResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

