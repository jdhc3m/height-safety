# SystemApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**getHealth**](SystemApi.md#getHealth) | **GET** health | Check API health |



Check API health

### Example
```kotlin
// Import classes:
//import au.com.heightsafety.api.*
//import au.com.heightsafety.api.infrastructure.*
//import au.com.heightsafety.api.models.*

val apiClient = ApiClient()
val webService = apiClient.createWebservice(SystemApi::class.java)

launch(Dispatchers.IO) {
    val result : HealthResponseDto = webService.getHealth()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**HealthResponseDto**](HealthResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

