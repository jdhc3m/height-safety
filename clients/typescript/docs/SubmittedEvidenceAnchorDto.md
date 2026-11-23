
# SubmittedEvidenceAnchorDto


## Properties

Name | Type
------------ | -------------
`anchorInspectionId` | string
`disposition` | string
`exceptionReason` | string
`identityConfirmed` | boolean
`locationConfirmed` | boolean
`photos` | [Array&lt;SubmittedEvidencePhotoDto&gt;](SubmittedEvidencePhotoDto.md)
`reconciliationProposal` | string
`recordedOutcome` | string
`defectDescription` | string
`expectedAnchorId` | string
`location` | string
`notes` | string
`observations` | string
`proofTestEquipmentReference` | string
`proofTestHold` | string
`proofTestLoad` | string
`proofTestResult` | string
`provisionalAnchorId` | string
`recommendation` | string
`reconciliationReferenceId` | string

## Example

```typescript
import type { SubmittedEvidenceAnchorDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "anchorInspectionId": inspection-anchor-001,
  "disposition": removed_from_service,
  "exceptionReason": inaccessible,
  "identityConfirmed": true,
  "locationConfirmed": true,
  "photos": null,
  "reconciliationProposal": newly_discovered,
  "recordedOutcome": serviceable,
  "defectDescription": null,
  "expectedAnchorId": anchor-001,
  "location": North roof,
  "notes": null,
  "observations": null,
  "proofTestEquipmentReference": null,
  "proofTestHold": null,
  "proofTestLoad": null,
  "proofTestResult": null,
  "provisionalAnchorId": provisional-001,
  "recommendation": null,
  "reconciliationReferenceId": anchor-002,
} satisfies SubmittedEvidenceAnchorDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SubmittedEvidenceAnchorDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


