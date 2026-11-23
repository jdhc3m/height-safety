
# AnchorRecordedOutcomeDto


## Properties

Name | Type
------------ | -------------
`anchorInspectionId` | string
`companyId` | string
`disposition` | string
`exceptionReason` | string
`inspectionId` | string
`jobId` | string
`jobReference` | string
`photos` | [Array&lt;SubmittedEvidencePhotoDto&gt;](SubmittedEvidencePhotoDto.md)
`recordedOutcome` | string
`revisionNumber` | number
`submittedAt` | Date

## Example

```typescript
import type { AnchorRecordedOutcomeDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "anchorInspectionId": anchor-inspection-001,
  "companyId": null,
  "disposition": removed_from_service,
  "exceptionReason": inaccessible,
  "inspectionId": inspection-001,
  "jobId": job-001,
  "jobReference": JOB-2026-004,
  "photos": null,
  "recordedOutcome": serviceable,
  "revisionNumber": 2,
  "submittedAt": null,
} satisfies AnchorRecordedOutcomeDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AnchorRecordedOutcomeDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


