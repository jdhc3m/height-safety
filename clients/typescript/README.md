# @height-safety/api-client@0.0.0

A TypeScript SDK client for the localhost API.

## Usage

First, install the SDK from npm.

```bash
npm install @height-safety/api-client --save
```

Next, try it out.


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


## Documentation

### API Endpoints

All URIs are relative to */api/v1*

| Class | Method | HTTP request | Description
| ----- | ------ | ------------ | -------------
*IdentityApi* | [**acceptInvitation**](docs/IdentityApi.md#acceptinvitation) | **POST** /auth/invitations/accept | Accept an invitation using a verified provider identity
*IdentityApi* | [**createInvitation**](docs/IdentityApi.md#createinvitation) | **POST** /auth/invitations | Create an invitation for a company user
*IdentityApi* | [**createSession**](docs/IdentityApi.md#createsession) | **POST** /auth/sessions | Create an application session from a provider access token
*IdentityApi* | [**getCurrentAuth**](docs/IdentityApi.md#getcurrentauth) | **GET** /auth/me | Read current session membership and role
*IdentityApi* | [**revokeCurrentSession**](docs/IdentityApi.md#revokecurrentsession) | **POST** /auth/sessions/revoke | Revoke the current application session
*JobWorkflowApi* | [**assignJob**](docs/JobWorkflowApi.md#assignjob) | **POST** /jobs/{jobId}/assignment | Assign a released job to an inspector
*JobWorkflowApi* | [**claimJob**](docs/JobWorkflowApi.md#claimjob) | **POST** /jobs/{jobId}/claim | Claim a released job
*JobWorkflowApi* | [**createJob**](docs/JobWorkflowApi.md#createjob) | **POST** /jobs | Create a draft job
*JobWorkflowApi* | [**downloadJobPack**](docs/JobWorkflowApi.md#downloadjobpack) | **GET** /jobs/{jobId}/pack | Download an authorised versioned job pack
*JobWorkflowApi* | [**getJob**](docs/JobWorkflowApi.md#getjob) | **GET** /jobs/{jobId} | Read an authorised job
*JobWorkflowApi* | [**listJobs**](docs/JobWorkflowApi.md#listjobs) | **GET** /jobs | List authorised jobs
*JobWorkflowApi* | [**releaseJob**](docs/JobWorkflowApi.md#releasejob) | **POST** /jobs/{jobId}/release | Release a draft job
*SiteRegisterApi* | [**createAnchor**](docs/SiteRegisterApi.md#createanchor) | **POST** /sites/{siteId}/anchors | Add a single-point anchor to a site register
*SiteRegisterApi* | [**createClient**](docs/SiteRegisterApi.md#createclient) | **POST** /clients | Create a company client
*SiteRegisterApi* | [**createSite**](docs/SiteRegisterApi.md#createsite) | **POST** /sites | Create a site with supported jurisdiction context
*SiteRegisterApi* | [**getAnchor**](docs/SiteRegisterApi.md#getanchor) | **GET** /sites/{siteId}/anchors/{anchorId} | Read a registered anchor
*SiteRegisterApi* | [**getClient**](docs/SiteRegisterApi.md#getclient) | **GET** /clients/{clientId} | Read a company client
*SiteRegisterApi* | [**getSite**](docs/SiteRegisterApi.md#getsite) | **GET** /sites/{siteId} | Read a company site
*SiteRegisterApi* | [**listAnchors**](docs/SiteRegisterApi.md#listanchors) | **GET** /sites/{siteId}/anchors | List a site anchor register
*SiteRegisterApi* | [**listClients**](docs/SiteRegisterApi.md#listclients) | **GET** /clients | List company clients
*SiteRegisterApi* | [**listSites**](docs/SiteRegisterApi.md#listsites) | **GET** /sites | List company sites
*SiteRegisterApi* | [**updateAnchor**](docs/SiteRegisterApi.md#updateanchor) | **PATCH** /sites/{siteId}/anchors/{anchorId} | Update a registered anchor
*SiteRegisterApi* | [**updateClient**](docs/SiteRegisterApi.md#updateclient) | **PATCH** /clients/{clientId} | Update a company client
*SiteRegisterApi* | [**updateSite**](docs/SiteRegisterApi.md#updatesite) | **PATCH** /sites/{siteId} | Update a company site
*SynchronisationApi* | [**submitSyncMutation**](docs/SynchronisationApi.md#submitsyncmutation) | **POST** /sync/mutations | Submit one idempotent mutation envelope
*SystemApi* | [**getHealth**](docs/SystemApi.md#gethealth) | **GET** /health | Check API health


### Models

- [AcceptInvitationDto](docs/AcceptInvitationDto.md)
- [AnchorResponseDto](docs/AnchorResponseDto.md)
- [AssignJobDto](docs/AssignJobDto.md)
- [AuthMeResponseDto](docs/AuthMeResponseDto.md)
- [AuthUserResponseDto](docs/AuthUserResponseDto.md)
- [ClientResponseDto](docs/ClientResponseDto.md)
- [CreateAnchorDto](docs/CreateAnchorDto.md)
- [CreateClientDto](docs/CreateClientDto.md)
- [CreateInvitationDto](docs/CreateInvitationDto.md)
- [CreateJobDto](docs/CreateJobDto.md)
- [CreateSiteDto](docs/CreateSiteDto.md)
- [HealthResponseDto](docs/HealthResponseDto.md)
- [InvitationResponseDto](docs/InvitationResponseDto.md)
- [JobAssignmentResponseDto](docs/JobAssignmentResponseDto.md)
- [JobPackResponseDto](docs/JobPackResponseDto.md)
- [JobResponseDto](docs/JobResponseDto.md)
- [ProviderAccessTokenDto](docs/ProviderAccessTokenDto.md)
- [SessionResponseDto](docs/SessionResponseDto.md)
- [SessionRevokedResponseDto](docs/SessionRevokedResponseDto.md)
- [SiteResponseDto](docs/SiteResponseDto.md)
- [SyncAnchorInspectionPayloadDto](docs/SyncAnchorInspectionPayloadDto.md)
- [SyncInspectionPhotoPayloadDto](docs/SyncInspectionPhotoPayloadDto.md)
- [SyncInspectionSubmissionPayloadDto](docs/SyncInspectionSubmissionPayloadDto.md)
- [SyncMutationConflictDto](docs/SyncMutationConflictDto.md)
- [SyncMutationRequestDto](docs/SyncMutationRequestDto.md)
- [SyncMutationResponseDto](docs/SyncMutationResponseDto.md)
- [UpdateAnchorDto](docs/UpdateAnchorDto.md)
- [UpdateClientDto](docs/UpdateClientDto.md)
- [UpdateSiteDto](docs/UpdateSiteDto.md)

### Authorization


Authentication schemes defined for the API:
<a id="access-token"></a>
#### access-token


- **Type**: HTTP Bearer Token authentication (opaque)

## About

This TypeScript SDK client supports the [Fetch API](https://fetch.spec.whatwg.org/)
and is automatically generated by the
[OpenAPI Generator](https://openapi-generator.tech) project:

- API version: `1.0.0`
- Package version: `0.0.0`
- Generator version: `7.22.0`
- Build package: `org.openapitools.codegen.languages.TypeScriptFetchClientCodegen`

The generated npm module supports the following:

- Environments
  * Node.js
  * Webpack
  * Browserify
- Language levels
  * ES5 - you must have a Promises/A+ library installed
  * ES6
- Module systems
  * CommonJS
  * ES6 module system


## Development

### Building

To build the TypeScript source code, you need to have Node.js and npm installed.
After cloning the repository, navigate to the project directory and run:

```bash
npm install
npm run build
```

### Publishing

Once you've built the package, you can publish it to npm:

```bash
npm publish
```

## License

[Proprietary prototype]()
