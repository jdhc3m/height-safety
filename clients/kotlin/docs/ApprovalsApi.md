# ApprovalsApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**approveInspectionRevision**](ApprovalsApi.md#approveInspectionRevision) | **POST** approvals | Freeze the exact submitted revision for draft report generation after review gates pass |
| [**getApprovedSnapshot**](ApprovalsApi.md#getApprovedSnapshot) | **GET** approvals/{snapshotId} | Read one frozen approved snapshot in the current company scope |



Freeze the exact submitted revision for draft report generation after review gates pass

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ApprovalsApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val approveInspectionDto : ApproveInspectionDto =  // ApproveInspectionDto | 

launch(Dispatchers.IO) {
    val result : ApproveInspectionResponseDto = webService.approveInspectionRevision(xCompanyId, approveInspectionDto)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **approveInspectionDto** | [**ApproveInspectionDto**](ApproveInspectionDto.md)|  | |

### Return type

[**ApproveInspectionResponseDto**](ApproveInspectionResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


Read one frozen approved snapshot in the current company scope

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
apiClient.setBearerToken("TOKEN")
val webService = apiClient.createWebservice(ApprovalsApi::class.java)
val xCompanyId : kotlin.String = xCompanyId_example // kotlin.String | 
val snapshotId : kotlin.String = snapshotId_example // kotlin.String | 

launch(Dispatchers.IO) {
    val result : ApprovedSnapshotResponseDto = webService.getApprovedSnapshot(xCompanyId, snapshotId)
}
```

### Parameters
| **xCompanyId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **snapshotId** | **kotlin.String**|  | |

### Return type

[**ApprovedSnapshotResponseDto**](ApprovedSnapshotResponseDto.md)

### Authorization


Configure access-token:
    ApiClient().setBearerToken("TOKEN")

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

