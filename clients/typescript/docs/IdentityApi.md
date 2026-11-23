# IdentityApi

All URIs are relative to */api/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**acceptInvitation**](IdentityApi.md#acceptinvitation) | **POST** /auth/invitations/accept | Accept an invitation using a verified provider identity |
| [**createInvitation**](IdentityApi.md#createinvitation) | **POST** /auth/invitations | Create an invitation for a company user |
| [**createSession**](IdentityApi.md#createsession) | **POST** /auth/sessions | Create an application session from a provider access token |
| [**getCurrentAuth**](IdentityApi.md#getcurrentauth) | **GET** /auth/me | Read current session membership and role |
| [**renewSession**](IdentityApi.md#renewsession) | **POST** /auth/sessions/renew | Renew a still-live application session after membership revalidation |
| [**revokeCurrentSession**](IdentityApi.md#revokecurrentsession) | **POST** /auth/sessions/revoke | Revoke the current application session |



## acceptInvitation

> SessionResponseDto acceptInvitation(xCompanyId, acceptInvitationDto)

Accept an invitation using a verified provider identity

### Example

```ts
import {
  Configuration,
  IdentityApi,
} from '@height-safety/api-client';
import type { AcceptInvitationRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const api = new IdentityApi();

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // AcceptInvitationDto
    acceptInvitationDto: ...,
  } satisfies AcceptInvitationRequest;

  try {
    const data = await api.acceptInvitation(body);
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
| **acceptInvitationDto** | [AcceptInvitationDto](AcceptInvitationDto.md) |  | |

### Return type

[**SessionResponseDto**](SessionResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createInvitation

> InvitationResponseDto createInvitation(xCompanyId, createInvitationDto)

Create an invitation for a company user

### Example

```ts
import {
  Configuration,
  IdentityApi,
} from '@height-safety/api-client';
import type { CreateInvitationRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IdentityApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // CreateInvitationDto
    createInvitationDto: ...,
  } satisfies CreateInvitationRequest;

  try {
    const data = await api.createInvitation(body);
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
| **createInvitationDto** | [CreateInvitationDto](CreateInvitationDto.md) |  | |

### Return type

[**InvitationResponseDto**](InvitationResponseDto.md)

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


## createSession

> SessionResponseDto createSession(xCompanyId, providerAccessTokenDto)

Create an application session from a provider access token

### Example

```ts
import {
  Configuration,
  IdentityApi,
} from '@height-safety/api-client';
import type { CreateSessionRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const api = new IdentityApi();

  const body = {
    // string
    xCompanyId: xCompanyId_example,
    // ProviderAccessTokenDto
    providerAccessTokenDto: ...,
  } satisfies CreateSessionRequest;

  try {
    const data = await api.createSession(body);
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
| **providerAccessTokenDto** | [ProviderAccessTokenDto](ProviderAccessTokenDto.md) |  | |

### Return type

[**SessionResponseDto**](SessionResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCurrentAuth

> AuthMeResponseDto getCurrentAuth(xCompanyId)

Read current session membership and role

### Example

```ts
import {
  Configuration,
  IdentityApi,
} from '@height-safety/api-client';
import type { GetCurrentAuthRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IdentityApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
  } satisfies GetCurrentAuthRequest;

  try {
    const data = await api.getCurrentAuth(body);
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

[**AuthMeResponseDto**](AuthMeResponseDto.md)

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


## renewSession

> SessionResponseDto renewSession(xCompanyId)

Renew a still-live application session after membership revalidation

### Example

```ts
import {
  Configuration,
  IdentityApi,
} from '@height-safety/api-client';
import type { RenewSessionRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IdentityApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
  } satisfies RenewSessionRequest;

  try {
    const data = await api.renewSession(body);
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

[**SessionResponseDto**](SessionResponseDto.md)

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


## revokeCurrentSession

> SessionRevokedResponseDto revokeCurrentSession(xCompanyId)

Revoke the current application session

### Example

```ts
import {
  Configuration,
  IdentityApi,
} from '@height-safety/api-client';
import type { RevokeCurrentSessionRequest } from '@height-safety/api-client';

async function example() {
  console.log("🚀 Testing @height-safety/api-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: access-token
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IdentityApi(config);

  const body = {
    // string
    xCompanyId: xCompanyId_example,
  } satisfies RevokeCurrentSessionRequest;

  try {
    const data = await api.revokeCurrentSession(body);
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

[**SessionRevokedResponseDto**](SessionRevokedResponseDto.md)

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

