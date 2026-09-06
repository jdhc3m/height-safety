
# SyncAnchorInspectionPayloadDto


## Properties

Name | Type
------------ | -------------
`identityConfirmed` | boolean
`inspectionId` | string
`locationConfirmed` | boolean
`photos` | [Array&lt;SyncInspectionPhotoPayloadDto&gt;](SyncInspectionPhotoPayloadDto.md)
`defectDescription` | string
`disposition` | string
`exceptionReason` | string
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
`reconciliationProposal` | string
`reconciliationReferenceId` | string
`recordedOutcome` | string

## Example

```typescript
import type { SyncAnchorInspectionPayloadDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "identityConfirmed": true,
  "inspectionId": inspection-anchor-001,
  "locationConfirmed": true,
  "photos": null,
  "defectDescription": null,
  "disposition": null,
  "exceptionReason": null,
  "expectedAnchorId": anchor-001,
  "location": North roof,
  "notes": null,
  "observations": No visible damage.,
  "proofTestEquipmentReference": null,
  "proofTestHold": null,
  "proofTestLoad": null,
  "proofTestResult": null,
  "provisionalAnchorId": provisional-001,
  "recommendation": null,
  "reconciliationProposal": null,
  "reconciliationReferenceId": anchor-002,
  "recordedOutcome": null,
} satisfies SyncAnchorInspectionPayloadDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SyncAnchorInspectionPayloadDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


