
# SyncInspectionSubmissionPayloadDto


## Properties

Name | Type
------------ | -------------
`anchorInspections` | [Array&lt;SyncAnchorInspectionPayloadDto&gt;](SyncAnchorInspectionPayloadDto.md)
`companyId` | string
`jobId` | string
`jobPackVersion` | number
`jurisdiction` | string
`siteId` | string
`submissionId` | string

## Example

```typescript
import type { SyncInspectionSubmissionPayloadDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "anchorInspections": null,
  "companyId": company-a,
  "jobId": job-001,
  "jobPackVersion": 1,
  "jurisdiction": NSW,
  "siteId": site-001,
  "submissionId": submission-001,
} satisfies SyncInspectionSubmissionPayloadDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SyncInspectionSubmissionPayloadDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


