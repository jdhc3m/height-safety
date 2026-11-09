# ReportsApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**downloadDraftReport**](ReportsApi.md#downloadDraftReport) | **GET** reports/generations/{generationId}/file | Download one completed private draft report revision |
| [**getDraftReportGeneration**](ReportsApi.md#getDraftReportGeneration) | **GET** reports/generations/{generationId} | Read status for a tenant-scoped draft report generation |
| [**listDraftReportGenerations**](ReportsApi.md#listDraftReportGenerations) | **GET** reports/generations | List tenant-scoped draft report generations, newest first, optionally for one job |
| [**requestDraftReportGeneration**](ReportsApi.md#requestDraftReportGeneration) | **POST** reports/generations | Queue one deterministic draft report revision from an approved snapshot |



Download one completed private draft report revision

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReportsApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val generationId : kotlin.String = generationId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : java.io.File = webService.downloadDraftReport(xCompanyId, generationId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **generationId** | **kotlin.String**|  | |

### Return type

[**java.io.File**](java.io.File.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/pdf


Read status for a tenant-scoped draft report generation

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReportsApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val generationId : kotlin.String = generationId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : ReportGenerationResponseDto = webService.getDraftReportGeneration(xCompanyId, generationId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **generationId** | **kotlin.String**|  | |

### Return type

[**ReportGenerationResponseDto**](ReportGenerationResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


List tenant-scoped draft report generations, newest first, optionally for one job

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReportsApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val jobId : kotlin.String = jobId_example // kotlin.String | Limit the list to generations for one job

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<ReportGenerationResponseDto> = webService.listDraftReportGenerations(xCompanyId, jobId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **jobId** | **kotlin.String**| Limit the list to generations for one job | [optional] |

### Return type

[**kotlin.collections.List&lt;ReportGenerationResponseDto&gt;**](ReportGenerationResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Queue one deterministic draft report revision from an approved snapshot

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ReportsApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val requestReportGenerationDto : RequestReportGenerationDto =  // RequestReportGenerationDto | 

launch(Dispatchers.IO) {
    val result : ReportGenerationResponseDto = webService.requestDraftReportGeneration(xCompanyId, requestReportGenerationDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **requestReportGenerationDto** | [**RequestReportGenerationDto**](RequestReportGenerationDto.md)|  | |

### Return type

[**ReportGenerationResponseDto**](ReportGenerationResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

