
# ReconciliationProposalResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`inspectionId` | string
`jobId` | string
`jurisdiction` | string
`photos` | [Array&lt;ReconciliationProposalPhotoDto&gt;](ReconciliationProposalPhotoDto.md)
`proposalId` | string
`proposalType` | string
`recordedOutcome` | string
`revisionNumber` | number
`siteId` | string
`submittedAt` | Date
`submittedByUserId` | string
`inspectorNote` | string
`provisionalAnchorId` | string
`reconciliationReferenceId` | string
`recordedLocation` | string

## Example

```typescript
import type { ReconciliationProposalResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "inspectionId": inspection-001,
  "jobId": job-001,
  "jurisdiction": NSW,
  "photos": null,
  "proposalId": anchor-inspection-001,
  "proposalType": newly_discovered,
  "recordedOutcome": serviceable,
  "revisionNumber": 2,
  "siteId": site-001,
  "submittedAt": null,
  "submittedByUserId": inspector-001,
  "inspectorNote": null,
  "provisionalAnchorId": provisional-001,
  "reconciliationReferenceId": anchor-002,
  "recordedLocation": North roof,
} satisfies ReconciliationProposalResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReconciliationProposalResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


