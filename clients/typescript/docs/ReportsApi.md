# ReportsApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**downloadDraftReport**](ReportsApi.md#downloaddraftreport) | **GET** /reports/generations/{generationId}/file | Download one completed private draft report revision |
| [**getDraftReportGeneration**](ReportsApi.md#getdraftreportgeneration) | **GET** /reports/generations/{generationId} | Read status for a tenant-scoped draft report generation |
| [**listDraftReportGenerations**](ReportsApi.md#listdraftreportgenerations) | **GET** /reports/generations | List tenant-scoped draft report generations, newest first, optionally for one job |
| [**requestDraftReportGeneration**](ReportsApi.md#requestdraftreportgeneration) | **POST** /reports/generations | Queue one deterministic draft report revision from an approved snapshot |



## downloadDraftReport

> Blob downloadDraftReport(xCompanyId, generationId)

Download one completed private draft report revision

### Example

```ts
import {
  Configuration,
  ReportsApi,
} from '@height-safety/api-client';
import type { DownloadDraftReportRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReportsApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    generationId: generationId_example,
  } satisfies DownloadDraftReportRequest;

  try {
    const data = await api.downloadDraftReport(body);
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
| **generationId** | `string` |  | [Defaults to `undefined`] |

### Return type

**Blob**

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/pdf`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A private draft report PDF |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDraftReportGeneration

> ReportGenerationResponseDto getDraftReportGeneration(xCompanyId, generationId)

Read status for a tenant-scoped draft report generation

### Example

```ts
import {
  Configuration,
  ReportsApi,
} from '@height-safety/api-client';
import type { GetDraftReportGenerationRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReportsApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    generationId: generationId_example,
  } satisfies GetDraftReportGenerationRequest;

  try {
    const data = await api.getDraftReportGeneration(body);
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
| **generationId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**ReportGenerationResponseDto**](ReportGenerationResponseDto.md)

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


## listDraftReportGenerations

> Array&lt;ReportGenerationResponseDto&gt; listDraftReportGenerations(xCompanyId, jobId)

List tenant-scoped draft report generations, newest first, optionally for one job

### Example

```ts
import {
  Configuration,
  ReportsApi,
} from '@height-safety/api-client';
import type { ListDraftReportGenerationsRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReportsApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string | Limit the list to generations for one job (optional)
    jobId: jobId_example,
  } satisfies ListDraftReportGenerationsRequest;

  try {
    const data = await api.listDraftReportGenerations(body);
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
| **jobId** | `string` | Limit the list to generations for one job | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;ReportGenerationResponseDto&gt;**](ReportGenerationResponseDto.md)

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


## requestDraftReportGeneration

> ReportGenerationResponseDto requestDraftReportGeneration(xCompanyId, requestReportGenerationDto)

Queue one deterministic draft report revision from an approved snapshot

### Example

```ts
import {
  Configuration,
  ReportsApi,
} from '@height-safety/api-client';
import type { RequestDraftReportGenerationRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReportsApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // RequestReportGenerationDto
    requestReportGenerationDto: ...,
  } satisfies RequestDraftReportGenerationRequest;

  try {
    const data = await api.requestDraftReportGeneration(body);
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
| **requestReportGenerationDto** | [RequestReportGenerationDto](RequestReportGenerationDto.md) |  | |

### Return type

[**ReportGenerationResponseDto**](ReportGenerationResponseDto.md)

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **202** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

