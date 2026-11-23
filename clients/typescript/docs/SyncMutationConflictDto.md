
# SyncMutationConflictDto


## Properties

Name | Type
------------ | -------------
`conflictId` | string
`expectedEntityVersion` | number
`message` | string
`reason` | string
`currentEntityVersion` | number

## Example

```typescript
import type { SyncMutationConflictDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "conflictId": conflict-001,
  "expectedEntityVersion": 0,
  "message": Server entity version changed before this mutation was received.,
  "reason": expected_version_mismatch,
  "currentEntityVersion": 1,
} satisfies SyncMutationConflictDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SyncMutationConflictDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


