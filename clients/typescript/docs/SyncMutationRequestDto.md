
# SyncMutationRequestDto


## Properties

Name | Type
------------ | -------------
`entityId` | string
`entityType` | string
`entityVersion` | number
`expectedEntityVersion` | number
`idempotencyKey` | string
`mutationId` | string
`operation` | string
`payload` | [SyncInspectionSubmissionPayloadDto](SyncInspectionSubmissionPayloadDto.md)

## Example

```typescript
import type { SyncMutationRequestDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "entityId": submission-001,
  "entityType": inspection_submission,
  "entityVersion": 1,
  "expectedEntityVersion": 0,
  "idempotencyKey": mutation-001,
  "mutationId": mutation-001,
  "operation": submit_inspection,
  "payload": null,
} satisfies SyncMutationRequestDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SyncMutationRequestDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


