# RegisterReconciliationApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**decideReconciliationProposal**](RegisterReconciliationApi.md#decidereconciliationproposal) | **POST** /sites/{siteId}/reconciliation-proposals/{proposalId}/decision | Record one accept or reject decision for a submitted reconciliation proposal |
| [**listReconciliationProposals**](RegisterReconciliationApi.md#listreconciliationproposals) | **GET** /sites/{siteId}/reconciliation-proposals | List open reconciliation proposals submitted for one site, newest first |



## decideReconciliationProposal

> ReconciliationProposalDecisionResponseDto decideReconciliationProposal(xCompanyId, siteId, proposalId, decideReconciliationProposalDto)

Record one accept or reject decision for a submitted reconciliation proposal

### Example

```ts
import {
  Configuration,
  RegisterReconciliationApi,
} from '@height-safety/api-client';
import type { DecideReconciliationProposalRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RegisterReconciliationApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
    // string
    proposalId: proposalId_example,
    // DecideReconciliationProposalDto
    decideReconciliationProposalDto: ...,
  } satisfies DecideReconciliationProposalRequest;

  try {
    const data = await api.decideReconciliationProposal(body);
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
| **siteId** | `string` |  | [Defaults to `undefined`] |
| **proposalId** | `string` |  | [Defaults to `undefined`] |
| **decideReconciliationProposalDto** | [DecideReconciliationProposalDto](DecideReconciliationProposalDto.md) |  | |

### Return type

[**ReconciliationProposalDecisionResponseDto**](ReconciliationProposalDecisionResponseDto.md)

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


## listReconciliationProposals

> Array&lt;ReconciliationProposalResponseDto&gt; listReconciliationProposals(xCompanyId, siteId)

List open reconciliation proposals submitted for one site, newest first

### Example

```ts
import {
  Configuration,
  RegisterReconciliationApi,
} from '@height-safety/api-client';
import type { ListReconciliationProposalsRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RegisterReconciliationApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
  } satisfies ListReconciliationProposalsRequest;

  try {
    const data = await api.listReconciliationProposals(body);
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
| **siteId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;ReconciliationProposalResponseDto&gt;**](ReconciliationProposalResponseDto.md)

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

