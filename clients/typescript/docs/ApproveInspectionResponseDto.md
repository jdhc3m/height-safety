
# ApproveInspectionResponseDto


## Properties

Name | Type
------------ | -------------
`replayed` | boolean
`snapshot` | [ApprovedSnapshotResponseDto](ApprovedSnapshotResponseDto.md)

## Example

```typescript
import type { ApproveInspectionResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "replayed": false,
  "snapshot": null,
} satisfies ApproveInspectionResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ApproveInspectionResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


