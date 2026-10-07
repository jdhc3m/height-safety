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


## Documentation

### API Endpoints

All URIs are relative to */api/v1*

| Class | Method | HTTP request | Description
| ----- | ------ | ------------ | -------------
*ApprovalsApi* | [**approveInspectionRevision**](docs/ApprovalsApi.md#approveinspectionrevision) | **POST** /approvals | Freeze the exact submitted revision for draft report generation after review gates pass
*ApprovalsApi* | [**getApprovedSnapshot**](docs/ApprovalsApi.md#getapprovedsnapshot) | **GET** /approvals/{snapshotId} | Read one frozen approved snapshot in the current company scope
*IdentityApi* | [**acceptInvitation**](docs/IdentityApi.md#acceptinvitation) | **POST** /auth/invitations/accept | Accept an invitation using a verified provider identity
*IdentityApi* | [**createInvitation**](docs/IdentityApi.md#createinvitation) | **POST** /auth/invitations | Create an invitation for a company user
*IdentityApi* | [**createSession**](docs/IdentityApi.md#createsession) | **POST** /auth/sessions | Create an application session from a provider access token
*IdentityApi* | [**getCurrentAuth**](docs/IdentityApi.md#getcurrentauth) | **GET** /auth/me | Read current session membership and role
*IdentityApi* | [**renewSession**](docs/IdentityApi.md#renewsession) | **POST** /auth/sessions/renew | Renew a still-live application session after membership revalidation
*IdentityApi* | [**revokeCurrentSession**](docs/IdentityApi.md#revokecurrentsession) | **POST** /auth/sessions/revoke | Revoke the current application session
*JobWorkflowApi* | [**assignJob**](docs/JobWorkflowApi.md#assignjob) | **POST** /jobs/{jobId}/assignment | Assign a released job to an inspector
*JobWorkflowApi* | [**claimJob**](docs/JobWorkflowApi.md#claimjob) | **POST** /jobs/{jobId}/claim | Claim a released job
*JobWorkflowApi* | [**createJob**](docs/JobWorkflowApi.md#createjob) | **POST** /jobs | Create a draft job
*JobWorkflowApi* | [**downloadJobPack**](docs/JobWorkflowApi.md#downloadjobpack) | **GET** /jobs/{jobId}/pack | Download an authorised versioned job pack
*JobWorkflowApi* | [**getJob**](docs/JobWorkflowApi.md#getjob) | **GET** /jobs/{jobId} | Read an authorised job
*JobWorkflowApi* | [**listJobs**](docs/JobWorkflowApi.md#listjobs) | **GET** /jobs | List authorised jobs
*JobWorkflowApi* | [**releaseJob**](docs/JobWorkflowApi.md#releasejob) | **POST** /jobs/{jobId}/release | Release a draft job
*ReportsApi* | [**downloadDraftReport**](docs/ReportsApi.md#downloaddraftreport) | **GET** /reports/generations/{generationId}/file | Download one completed private draft report revision
*ReportsApi* | [**getDraftReportGeneration**](docs/ReportsApi.md#getdraftreportgeneration) | **GET** /reports/generations/{generationId} | Read status for a tenant-scoped draft report generation
*ReportsApi* | [**requestDraftReportGeneration**](docs/ReportsApi.md#requestdraftreportgeneration) | **POST** /reports/generations | Queue one deterministic draft report revision from an approved snapshot
*ReviewApi* | [**createReviewIssue**](docs/ReviewApi.md#createreviewissue) | **POST** /reviews/issues | Record an append-only office review issue or change request
*ReviewApi* | [**listReviewActions**](docs/ReviewApi.md#listreviewactions) | **GET** /reviews/issues/{reviewIssueId}/actions | List append-only actions for one review issue
*ReviewApi* | [**listReviewIssues**](docs/ReviewApi.md#listreviewissues) | **GET** /reviews/inspections/{inspectionId}/issues | List review issues for one submitted inspection revision
*ReviewApi* | [**resolveReviewIssue**](docs/ReviewApi.md#resolvereviewissue) | **POST** /reviews/issues/{reviewIssueId}/resolve | Record a reasoned resolution without changing inspector evidence
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
*SynchronisationApi* | [**uploadPhotoChunk**](docs/SynchronisationApi.md#uploadphotochunk) | **POST** /sync/photos/{mediaId}/chunks | Upload one resumable evidence-photo chunk
*SynchronisationApi* | [**uploadRecoveryPhotoChunk**](docs/SynchronisationApi.md#uploadrecoveryphotochunk) | **POST** /sync/recovery/photos/{mediaId}/chunks | Upload one evidence-photo chunk during Administrator recovery
*SystemApi* | [**getHealth**](docs/SystemApi.md#gethealth) | **GET** /health | Check API health


### Models

- [AcceptInvitationDto](docs/AcceptInvitationDto.md)
- [AnchorResponseDto](docs/AnchorResponseDto.md)
- [ApproveInspectionDto](docs/ApproveInspectionDto.md)
- [ApproveInspectionResponseDto](docs/ApproveInspectionResponseDto.md)
- [ApprovedSnapshotResponseDto](docs/ApprovedSnapshotResponseDto.md)
- [AssignJobDto](docs/AssignJobDto.md)
- [AuthMeResponseDto](docs/AuthMeResponseDto.md)
- [AuthUserResponseDto](docs/AuthUserResponseDto.md)
- [ClientResponseDto](docs/ClientResponseDto.md)
- [CreateAnchorDto](docs/CreateAnchorDto.md)
- [CreateClientDto](docs/CreateClientDto.md)
- [CreateInvitationDto](docs/CreateInvitationDto.md)
- [CreateJobDto](docs/CreateJobDto.md)
- [CreateReviewIssueDto](docs/CreateReviewIssueDto.md)
- [CreateSiteDto](docs/CreateSiteDto.md)
- [HealthResponseDto](docs/HealthResponseDto.md)
- [InvitationResponseDto](docs/InvitationResponseDto.md)
- [JobAssignmentResponseDto](docs/JobAssignmentResponseDto.md)
- [JobPackResponseDto](docs/JobPackResponseDto.md)
- [JobResponseDto](docs/JobResponseDto.md)
- [PhotoUploadChunkDto](docs/PhotoUploadChunkDto.md)
- [PhotoUploadChunkResponseDto](docs/PhotoUploadChunkResponseDto.md)
- [ProviderAccessTokenDto](docs/ProviderAccessTokenDto.md)
- [ReportGenerationResponseDto](docs/ReportGenerationResponseDto.md)
- [RequestReportGenerationDto](docs/RequestReportGenerationDto.md)
- [ResolveReviewIssueDto](docs/ResolveReviewIssueDto.md)
- [ReviewActionResponseDto](docs/ReviewActionResponseDto.md)
- [ReviewIssueResolutionResponseDto](docs/ReviewIssueResolutionResponseDto.md)
- [ReviewIssueResponseDto](docs/ReviewIssueResponseDto.md)
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
