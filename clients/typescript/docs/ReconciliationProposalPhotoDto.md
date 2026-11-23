
# ReconciliationProposalPhotoDto


## Properties

Name | Type
------------ | -------------
`localId` | string
`photoId` | string
`uploadState` | string
`capturedAt` | Date
`checksum` | string

## Example

```typescript
import type { ReconciliationProposalPhotoDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "localId": photo-001,
  "photoId": photo-001,
  "uploadState": uploaded,
  "capturedAt": null,
  "checksum": sha256-photo-001,
} satisfies ReconciliationProposalPhotoDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReconciliationProposalPhotoDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


