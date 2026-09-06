
# SyncMutationResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`idempotencyKey` | string
`mutationId` | string
`payloadApplied` | boolean
`replayed` | boolean
`state` | string
`acknowledgedAt` | Date
`conflict` | [SyncMutationConflictDto](SyncMutationConflictDto.md)
`serverEntityVersion` | number

## Example

```typescript
import type { SyncMutationResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "idempotencyKey": null,
  "mutationId": null,
  "payloadApplied": true,
  "replayed": false,
  "state": synchronised,
  "acknowledgedAt": null,
  "conflict": null,
  "serverEntityVersion": 1,
} satisfies SyncMutationResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SyncMutationResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


