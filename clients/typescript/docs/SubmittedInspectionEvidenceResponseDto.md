
# SubmittedInspectionEvidenceResponseDto


## Properties

Name | Type
------------ | -------------
`accountedAnchorCount` | number
`anchors` | [Array&lt;SubmittedEvidenceAnchorDto&gt;](SubmittedEvidenceAnchorDto.md)
`companyId` | string
`evidenceSynchronised` | boolean
`evidenceVersion` | number
`expectedAnchorCount` | number
`failedPhotoCount` | number
`inspectionId` | string
`inspectorUserId` | string
`jobId` | string
`jobPackVersion` | number
`jurisdiction` | string
`latestRevisionNumber` | number
`openBlockerCount` | number
`openChangeRequestCount` | number
`openConflictCount` | number
`openWarningCount` | number
`pendingPhotoCount` | number
`revisionNumber` | number
`siteId` | string
`submittedAt` | Date
`workflowStatus` | string

## Example

```typescript
import type { SubmittedInspectionEvidenceResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "accountedAnchorCount": 13,
  "anchors": null,
  "companyId": null,
  "evidenceSynchronised": true,
  "evidenceVersion": 1,
  "expectedAnchorCount": 32,
  "failedPhotoCount": 0,
  "inspectionId": inspection-001,
  "inspectorUserId": inspector-001,
  "jobId": job-001,
  "jobPackVersion": 1,
  "jurisdiction": NSW,
  "latestRevisionNumber": 2,
  "openBlockerCount": 0,
  "openChangeRequestCount": 0,
  "openConflictCount": 0,
  "openWarningCount": 1,
  "pendingPhotoCount": 0,
  "revisionNumber": 2,
  "siteId": site-001,
  "submittedAt": null,
  "workflowStatus": submitted,
} satisfies SubmittedInspectionEvidenceResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SubmittedInspectionEvidenceResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


