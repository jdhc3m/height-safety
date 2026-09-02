# JobWorkflowApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**assignJob**](JobWorkflowApi.md#assignjob) | **POST** /jobs/{jobId}/assignment | Assign a released job to an inspector |
| [**claimJob**](JobWorkflowApi.md#claimjob) | **POST** /jobs/{jobId}/claim | Claim a released job |
| [**createJob**](JobWorkflowApi.md#createjob) | **POST** /jobs | Create a draft job |
| [**getJob**](JobWorkflowApi.md#getjob) | **GET** /jobs/{jobId} | Read an authorised job |
| [**listJobs**](JobWorkflowApi.md#listjobs) | **GET** /jobs | List authorised jobs |
| [**releaseJob**](JobWorkflowApi.md#releasejob) | **POST** /jobs/{jobId}/release | Release a draft job |



## assignJob

> JobResponseDto assignJob(xCompanyId, jobId, assignJobDto)

Assign a released job to an inspector

### Example

```ts
import {
  Configuration,
  JobWorkflowApi,
} from '@height-safety/api-client';
import type { AssignJobRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new JobWorkflowApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    jobId: jobId_example,
    // AssignJobDto
    assignJobDto: ...,
  } satisfies AssignJobRequest;

  try {
    const data = await api.assignJob(body);
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
| **jobId** | `string` |  | [Defaults to `undefined`] |
| **assignJobDto** | [AssignJobDto](AssignJobDto.md) |  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

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


## claimJob

> JobResponseDto claimJob(xCompanyId, jobId)

Claim a released job

### Example

```ts
import {
  Configuration,
  JobWorkflowApi,
} from '@height-safety/api-client';
import type { ClaimJobRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new JobWorkflowApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    jobId: jobId_example,
  } satisfies ClaimJobRequest;

  try {
    const data = await api.claimJob(body);
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
| **jobId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createJob

> JobResponseDto createJob(xCompanyId, createJobDto)

Create a draft job

### Example

```ts
import {
  Configuration,
  JobWorkflowApi,
} from '@height-safety/api-client';
import type { CreateJobRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new JobWorkflowApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // CreateJobDto
    createJobDto: ...,
  } satisfies CreateJobRequest;

  try {
    const data = await api.createJob(body);
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
| **createJobDto** | [CreateJobDto](CreateJobDto.md) |  | |

### Return type

[**JobResponseDto**](JobResponseDto.md)

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


## getJob

> JobResponseDto getJob(xCompanyId, jobId)

Read an authorised job

### Example

```ts
import {
  Configuration,
  JobWorkflowApi,
} from '@height-safety/api-client';
import type { GetJobRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new JobWorkflowApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    jobId: jobId_example,
  } satisfies GetJobRequest;

  try {
    const data = await api.getJob(body);
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
| **jobId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**JobResponseDto**](JobResponseDto.md)

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


## listJobs

> Array&lt;JobResponseDto&gt; listJobs(xCompanyId)

List authorised jobs

### Example

```ts
import {
  Configuration,
  JobWorkflowApi,
} from '@height-safety/api-client';
import type { ListJobsRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new JobWorkflowApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
  } satisfies ListJobsRequest;

  try {
    const data = await api.listJobs(body);
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

### Return type

[**Array&lt;JobResponseDto&gt;**](JobResponseDto.md)

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


## releaseJob

> JobResponseDto releaseJob(xCompanyId, jobId)

Release a draft job

### Example

```ts
import {
  Configuration,
  JobWorkflowApi,
} from '@height-safety/api-client';
import type { ReleaseJobRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new JobWorkflowApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    jobId: jobId_example,
  } satisfies ReleaseJobRequest;

  try {
    const data = await api.releaseJob(body);
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
| **jobId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**JobResponseDto**](JobResponseDto.md)

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

