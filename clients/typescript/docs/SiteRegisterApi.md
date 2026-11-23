# SiteRegisterApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createAnchor**](SiteRegisterApi.md#createanchor) | **POST** /sites/{siteId}/anchors | Add a single-point anchor to a site register |
| [**createClient**](SiteRegisterApi.md#createclient) | **POST** /clients | Create a company client |
| [**createSite**](SiteRegisterApi.md#createsite) | **POST** /sites | Create a site with supported jurisdiction context |
| [**getAnchor**](SiteRegisterApi.md#getanchor) | **GET** /sites/{siteId}/anchors/{anchorId} | Read a registered anchor |
| [**getClient**](SiteRegisterApi.md#getclient) | **GET** /clients/{clientId} | Read a company client |
| [**getSite**](SiteRegisterApi.md#getsite) | **GET** /sites/{siteId} | Read a company site |
| [**listAnchors**](SiteRegisterApi.md#listanchors) | **GET** /sites/{siteId}/anchors | List a site anchor register |
| [**listClients**](SiteRegisterApi.md#listclients) | **GET** /clients | List company clients |
| [**listSites**](SiteRegisterApi.md#listsites) | **GET** /sites | List company sites |
| [**updateAnchor**](SiteRegisterApi.md#updateanchor) | **PATCH** /sites/{siteId}/anchors/{anchorId} | Update a registered anchor |
| [**updateClient**](SiteRegisterApi.md#updateclient) | **PATCH** /clients/{clientId} | Update a company client |
| [**updateSite**](SiteRegisterApi.md#updatesite) | **PATCH** /sites/{siteId} | Update a company site |



## createAnchor

> AnchorResponseDto createAnchor(xCompanyId, siteId, createAnchorDto)

Add a single-point anchor to a site register

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { CreateAnchorRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
    // CreateAnchorDto
    createAnchorDto: ...,
  } satisfies CreateAnchorRequest;

  try {
    const data = await api.createAnchor(body);
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
| **createAnchorDto** | [CreateAnchorDto](CreateAnchorDto.md) |  | |

### Return type

[**AnchorResponseDto**](AnchorResponseDto.md)

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


## createClient

> ClientResponseDto createClient(xCompanyId, createClientDto)

Create a company client

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { CreateClientRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // CreateClientDto
    createClientDto: ...,
  } satisfies CreateClientRequest;

  try {
    const data = await api.createClient(body);
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
| **createClientDto** | [CreateClientDto](CreateClientDto.md) |  | |

### Return type

[**ClientResponseDto**](ClientResponseDto.md)

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


## createSite

> SiteResponseDto createSite(xCompanyId, createSiteDto)

Create a site with supported jurisdiction context

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { CreateSiteRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // CreateSiteDto
    createSiteDto: ...,
  } satisfies CreateSiteRequest;

  try {
    const data = await api.createSite(body);
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
| **createSiteDto** | [CreateSiteDto](CreateSiteDto.md) |  | |

### Return type

[**SiteResponseDto**](SiteResponseDto.md)

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


## getAnchor

> AnchorResponseDto getAnchor(xCompanyId, siteId, anchorId)

Read a registered anchor

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { GetAnchorRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
    // string
    anchorId: anchorId_example,
  } satisfies GetAnchorRequest;

  try {
    const data = await api.getAnchor(body);
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
| **anchorId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**AnchorResponseDto**](AnchorResponseDto.md)

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


## getClient

> ClientResponseDto getClient(xCompanyId, clientId)

Read a company client

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { GetClientRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    clientId: clientId_example,
  } satisfies GetClientRequest;

  try {
    const data = await api.getClient(body);
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
| **clientId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**ClientResponseDto**](ClientResponseDto.md)

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


## getSite

> SiteResponseDto getSite(xCompanyId, siteId)

Read a company site

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { GetSiteRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
  } satisfies GetSiteRequest;

  try {
    const data = await api.getSite(body);
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

[**SiteResponseDto**](SiteResponseDto.md)

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


## listAnchors

> Array&lt;AnchorResponseDto&gt; listAnchors(xCompanyId, siteId)

List a site anchor register

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { ListAnchorsRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
  } satisfies ListAnchorsRequest;

  try {
    const data = await api.listAnchors(body);
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

[**Array&lt;AnchorResponseDto&gt;**](AnchorResponseDto.md)

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


## listClients

> Array&lt;ClientResponseDto&gt; listClients(xCompanyId)

List company clients

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { ListClientsRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
  } satisfies ListClientsRequest;

  try {
    const data = await api.listClients(body);
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

[**Array&lt;ClientResponseDto&gt;**](ClientResponseDto.md)

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


## listSites

> Array&lt;SiteResponseDto&gt; listSites(xCompanyId)

List company sites

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { ListSitesRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
  } satisfies ListSitesRequest;

  try {
    const data = await api.listSites(body);
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

[**Array&lt;SiteResponseDto&gt;**](SiteResponseDto.md)

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


## updateAnchor

> AnchorResponseDto updateAnchor(xCompanyId, siteId, anchorId, updateAnchorDto)

Update a registered anchor

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { UpdateAnchorRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
    // string
    anchorId: anchorId_example,
    // UpdateAnchorDto
    updateAnchorDto: ...,
  } satisfies UpdateAnchorRequest;

  try {
    const data = await api.updateAnchor(body);
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
| **anchorId** | `string` |  | [Defaults to `undefined`] |
| **updateAnchorDto** | [UpdateAnchorDto](UpdateAnchorDto.md) |  | |

### Return type

[**AnchorResponseDto**](AnchorResponseDto.md)

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


## updateClient

> ClientResponseDto updateClient(xCompanyId, clientId, updateClientDto)

Update a company client

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { UpdateClientRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    clientId: clientId_example,
    // UpdateClientDto
    updateClientDto: ...,
  } satisfies UpdateClientRequest;

  try {
    const data = await api.updateClient(body);
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
| **clientId** | `string` |  | [Defaults to `undefined`] |
| **updateClientDto** | [UpdateClientDto](UpdateClientDto.md) |  | |

### Return type

[**ClientResponseDto**](ClientResponseDto.md)

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


## updateSite

> SiteResponseDto updateSite(xCompanyId, siteId, updateSiteDto)

Update a company site

### Example

```ts
import {
  Configuration,
  SiteRegisterApi,
} from '@height-safety/api-client';
import type { UpdateSiteRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SiteRegisterApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // string
    siteId: siteId_example,
    // UpdateSiteDto
    updateSiteDto: ...,
  } satisfies UpdateSiteRequest;

  try {
    const data = await api.updateSite(body);
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
| **updateSiteDto** | [UpdateSiteDto](UpdateSiteDto.md) |  | |

### Return type

[**SiteResponseDto**](SiteResponseDto.md)

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

