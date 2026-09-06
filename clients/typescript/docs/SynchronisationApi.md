# SynchronisationApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**submitSyncMutation**](SynchronisationApi.md#submitsyncmutation) | **POST** /sync/mutations | Submit one idempotent mutation envelope |



## submitSyncMutation

> SyncMutationResponseDto submitSyncMutation(xCompanyId, syncMutationRequestDto)

Submit one idempotent mutation envelope

### Example

```ts
import {
  Configuration,
  SynchronisationApi,
} from '@height-safety/api-client';
import type { SubmitSyncMutationRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SynchronisationApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // SyncMutationRequestDto
    syncMutationRequestDto: ...,
  } satisfies SubmitSyncMutationRequest;

  try {
    const data = await api.submitSyncMutation(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xCompanyId** | `string` |  | [Defaults to `undefined`] |
| **syncMutationRequestDto** | [SyncMutationRequestDto](SyncMutationRequestDto.md) |  | |

### Return type

[**SyncMutationResponseDto**](SyncMutationResponseDto.md)

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

