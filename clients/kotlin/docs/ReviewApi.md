# ReviewApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createReviewIssue**](ReviewApi.md#createReviewIssue) | **POST** reviews/issues | Record an append-only office review issue or change request |
| [**listReviewActions**](ReviewApi.md#listReviewActions) | **GET** reviews/issues/{reviewIssueId}/actions | List append-only actions for one review issue |
| [**listReviewIssues**](ReviewApi.md#listReviewIssues) | **GET** reviews/inspections/{inspectionId}/issues | List review issues for one submitted inspection revision |
| [**resolveReviewIssue**](ReviewApi.md#resolveReviewIssue) | **POST** reviews/issues/{reviewIssueId}/resolve | Record a reasoned resolution without changing inspector evidence |



Record an append-only office review issue or change request

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReviewApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val createReviewIssueDto : CreateReviewIssueDto =  // CreateReviewIssueDto | 

launch(Dispatchers.IO) {
    val result : ReviewIssueResponseDto = webService.createReviewIssue(xCompanyId, createReviewIssueDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **createReviewIssueDto** | [**CreateReviewIssueDto**](CreateReviewIssueDto.md)|  | |

### Return type

[**ReviewIssueResponseDto**](ReviewIssueResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


List append-only actions for one review issue

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReviewApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val reviewIssueId : kotlin.String = reviewIssueId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<ReviewActionResponseDto> = webService.listReviewActions(xCompanyId, reviewIssueId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **reviewIssueId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;ReviewActionResponseDto&gt;**](ReviewActionResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


List review issues for one submitted inspection revision

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReviewApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val inspectionId : kotlin.String = inspectionId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<ReviewIssueResponseDto> = webService.listReviewIssues(xCompanyId, inspectionId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **inspectionId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;ReviewIssueResponseDto&gt;**](ReviewIssueResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Record a reasoned resolution without changing inspector evidence

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReviewApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val reviewIssueId : kotlin.String = reviewIssueId_example // kotlin.String | 
val resolveReviewIssueDto : ResolveReviewIssueDto =  // ResolveReviewIssueDto | 

launch(Dispatchers.IO) {
    val result : ReviewIssueResolutionResponseDto = webService.resolveReviewIssue(xCompanyId, reviewIssueId, resolveReviewIssueDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **reviewIssueId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **resolveReviewIssueDto** | [**ResolveReviewIssueDto**](ResolveReviewIssueDto.md)|  | |

### Return type

[**ReviewIssueResolutionResponseDto**](ReviewIssueResolutionResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

