# ReviewApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createReviewIssue**](ReviewApi.md#createreviewissue) | **POST** /reviews/issues | Record an append-only office review issue or change request |
| [**getInspectionPhotoMedia**](ReviewApi.md#getinspectionphotomedia) | **GET** /reviews/inspections/{inspectionId}/photos/{photoId}/file | Read one private evidence photo attached to a submitted inspection revision |
| [**getSubmittedInspectionEvidence**](ReviewApi.md#getsubmittedinspectionevidence) | **GET** /reviews/inspections/{inspectionId}/evidence | Read one submitted inspection revision, its anchor evidence and photo metadata |
| [**listReviewActions**](ReviewApi.md#listreviewactions) | **GET** /reviews/issues/{reviewIssueId}/actions | List append-only actions for one review issue |
| [**listReviewIssues**](ReviewApi.md#listreviewissues) | **GET** /reviews/inspections/{inspectionId}/issues | List review issues for one submitted inspection revision |
| [**resolveReviewIssue**](ReviewApi.md#resolvereviewissue) | **POST** /reviews/issues/{reviewIssueId}/resolve | Record a reasoned resolution without changing inspector evidence |



## createReviewIssue

> ReviewIssueResponseDto createReviewIssue(xCompanyId, createReviewIssueDto)

Record an append-only office review issue or change request

### Example

```ts
import {
  Configuration,
  ReviewApi,
} from '@height-safety/api-client';
import type { CreateReviewIssueRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReviewApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // CreateReviewIssueDto
    createReviewIssueDto: ...,
  } satisfies CreateReviewIssueRequest;

  try {
    const data = await api.createReviewIssue(body);
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
| **createReviewIssueDto** | [CreateReviewIssueDto](CreateReviewIssueDto.md) |  | |

### Return type

[**ReviewIssueResponseDto**](ReviewIssueResponseDto.md)

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


## getInspectionPhotoMedia

> Blob getInspectionPhotoMedia(xCompanyId, inspectionId, photoId)

Read one private evidence photo attached to a submitted inspection revision

### Example

```ts
import {
  Configuration,
  ReviewApi,
} from '@height-safety/api-client';
import type { GetInspectionPhotoMediaRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReviewApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    inspectionId: inspectionId_example,
    // string
    photoId: photoId_example,
  } satisfies GetInspectionPhotoMediaRequest;

  try {
    const data = await api.getInspectionPhotoMedia(body);
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
| **inspectionId** | `string` |  | [Defaults to `undefined`] |
| **photoId** | `string` |  | [Defaults to `undefined`] |

### Return type

**Blob**

### Authorization

[access-token](../README.md#access-token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `image/*`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The private evidence photo bytes with the recorded content type |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getSubmittedInspectionEvidence

> SubmittedInspectionEvidenceResponseDto getSubmittedInspectionEvidence(xCompanyId, inspectionId)

Read one submitted inspection revision, its anchor evidence and photo metadata

### Example

```ts
import {
  Configuration,
  ReviewApi,
} from '@height-safety/api-client';
import type { GetSubmittedInspectionEvidenceRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReviewApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    inspectionId: inspectionId_example,
  } satisfies GetSubmittedInspectionEvidenceRequest;

  try {
    const data = await api.getSubmittedInspectionEvidence(body);
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
| **inspectionId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**SubmittedInspectionEvidenceResponseDto**](SubmittedInspectionEvidenceResponseDto.md)

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


## listReviewActions

> Array&lt;ReviewActionResponseDto&gt; listReviewActions(xCompanyId, reviewIssueId)

List append-only actions for one review issue

### Example

```ts
import {
  Configuration,
  ReviewApi,
} from '@height-safety/api-client';
import type { ListReviewActionsRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReviewApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    reviewIssueId: reviewIssueId_example,
  } satisfies ListReviewActionsRequest;

  try {
    const data = await api.listReviewActions(body);
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
| **reviewIssueId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;ReviewActionResponseDto&gt;**](ReviewActionResponseDto.md)

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


## listReviewIssues

> Array&lt;ReviewIssueResponseDto&gt; listReviewIssues(xCompanyId, inspectionId)

List review issues for one submitted inspection revision

### Example

```ts
import {
  Configuration,
  ReviewApi,
} from '@height-safety/api-client';
import type { ListReviewIssuesRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReviewApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    inspectionId: inspectionId_example,
  } satisfies ListReviewIssuesRequest;

  try {
    const data = await api.listReviewIssues(body);
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
| **inspectionId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;ReviewIssueResponseDto&gt;**](ReviewIssueResponseDto.md)

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


## resolveReviewIssue

> ReviewIssueResolutionResponseDto resolveReviewIssue(xCompanyId, reviewIssueId, resolveReviewIssueDto)

Record a reasoned resolution without changing inspector evidence

### Example

```ts
import {
  Configuration,
  ReviewApi,
} from '@height-safety/api-client';
import type { ResolveReviewIssueRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReviewApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    reviewIssueId: reviewIssueId_example,
    // ResolveReviewIssueDto
    resolveReviewIssueDto: ...,
  } satisfies ResolveReviewIssueRequest;

  try {
    const data = await api.resolveReviewIssue(body);
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
| **reviewIssueId** | `string` |  | [Defaults to `undefined`] |
| **resolveReviewIssueDto** | [ResolveReviewIssueDto](ResolveReviewIssueDto.md) |  | |

### Return type

[**ReviewIssueResolutionResponseDto**](ReviewIssueResolutionResponseDto.md)

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

