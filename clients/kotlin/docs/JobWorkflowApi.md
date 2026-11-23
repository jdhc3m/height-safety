# JobWorkflowApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**assignJob**](JobWorkflowApi.md#assignJob) | **POST** jobs/{jobId}/assignment | Assign a released job to an inspector |
| [**claimJob**](JobWorkflowApi.md#claimJob) | **POST** jobs/{jobId}/claim | Claim a released job |
| [**createJob**](JobWorkflowApi.md#createJob) | **POST** jobs | Create a draft job |
| [**downloadJobPack**](JobWorkflowApi.md#downloadJobPack) | **GET** jobs/{jobId}/pack | Download an authorised versioned job pack |
| [**getJob**](JobWorkflowApi.md#getJob) | **GET** jobs/{jobId} | Read an authorised job |
| [**listJobs**](JobWorkflowApi.md#listJobs) | **GET** jobs | List authorised jobs |
| [**releaseJob**](JobWorkflowApi.md#releaseJob) | **POST** jobs/{jobId}/release | Release a draft job |



Assign a released job to an inspector

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val jobId : kotlin.String = jobId_example // kotlin.String | 
val assignJobDto : AssignJobDto =  // AssignJobDto | 

launch(Dispatchers.IO) {
    val result : JobResponseDto = webService.assignJob(xCompanyId, jobId, assignJobDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| **jobId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **assignJobDto** | [**AssignJobDto**](AssignJobDto.md)|  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Claim a released job

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val jobId : kotlin.String = jobId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : JobResponseDto = webService.claimJob(xCompanyId, jobId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **jobId** | **kotlin.String**|  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Create a draft job

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val createJobDto : CreateJobDto =  // CreateJobDto | 

launch(Dispatchers.IO) {
    val result : JobResponseDto = webService.createJob(xCompanyId, createJobDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **createJobDto** | [**CreateJobDto**](CreateJobDto.md)|  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Download an authorised versioned job pack

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val jobId : kotlin.String = jobId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : JobPackResponseDto = webService.downloadJobPack(xCompanyId, jobId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **jobId** | **kotlin.String**|  | |

### Return type

[**JobPackResponseDto**](JobPackResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Read an authorised job

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val jobId : kotlin.String = jobId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : JobResponseDto = webService.getJob(xCompanyId, jobId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **jobId** | **kotlin.String**|  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


List authorised jobs

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : kotlin.collections.List<JobResponseDto> = webService.listJobs(xCompanyId)
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xCompanyId** | **kotlin.String**|  | |

### Return type

[**kotlin.collections.List&lt;JobResponseDto&gt;**](JobResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


Release a draft job

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(JobWorkflowApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val jobId : kotlin.String = jobId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : JobResponseDto = webService.releaseJob(xCompanyId, jobId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **jobId** | **kotlin.String**|  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

