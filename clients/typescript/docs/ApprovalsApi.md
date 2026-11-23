# ApprovalsApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**approveInspectionRevision**](ApprovalsApi.md#approveinspectionrevision) | **POST** /approvals | Freeze the exact submitted revision for draft report generation after review gates pass |
| [**getApprovedSnapshot**](ApprovalsApi.md#getapprovedsnapshot) | **GET** /approvals/{snapshotId} | Read one frozen approved snapshot in the current company scope |



## approveInspectionRevision

> ApproveInspectionResponseDto approveInspectionRevision(xCompanyId, approveInspectionDto)

Freeze the exact submitted revision for draft report generation after review gates pass

### Example

```ts
import {
  Configuration,
  ApprovalsApi,
} from '@height-safety/api-client';
import type { ApproveInspectionRevisionRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ApprovalsApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // ApproveInspectionDto
    approveInspectionDto: ...,
  } satisfies ApproveInspectionRevisionRequest;

  try {
    const data = await api.approveInspectionRevision(body);
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
| **approveInspectionDto** | [ApproveInspectionDto](ApproveInspectionDto.md) |  | |

### Return type

[**ApproveInspectionResponseDto**](ApproveInspectionResponseDto.md)

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getApprovedSnapshot

> ApprovedSnapshotResponseDto getApprovedSnapshot(xCompanyId, snapshotId)

Read one frozen approved snapshot in the current company scope

### Example

```ts
import {
  Configuration,
  ApprovalsApi,
} from '@height-safety/api-client';
import type { GetApprovedSnapshotRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ApprovalsApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    snapshotId: snapshotId_example,
  } satisfies GetApprovedSnapshotRequest;

  try {
    const data = await api.getApprovedSnapshot(body);
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
| **snapshotId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**ApprovedSnapshotResponseDto**](ApprovedSnapshotResponseDto.md)

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

