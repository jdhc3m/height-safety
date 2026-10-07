
# ReportGenerationResponseDto


## Properties

Name | Type
------------ | -------------
`attemptCount` | number
`generationId` | string
`jobId` | string
`jurisdiction` | string
`reportRevisionId` | string
`requestedAt` | Date
`snapshotId` | string
`status` | string
`templateVersion` | string
`completedAt` | Date
`lastFailureCode` | string
`revisionNumber` | number

## Example

```typescript
import type { ReportGenerationResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "attemptCount": null,
  "generationId": null,
  "jobId": null,
  "jurisdiction": null,
  "reportRevisionId": null,
  "requestedAt": null,
  "snapshotId": null,
  "status": null,
  "templateVersion": null,
  "completedAt": null,
  "lastFailureCode": null,
  "revisionNumber": null,
} satisfies ReportGenerationResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReportGenerationResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


