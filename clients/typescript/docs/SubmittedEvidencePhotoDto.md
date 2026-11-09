
# SubmittedEvidencePhotoDto


## Properties

Name | Type
------------ | -------------
`capturedAt` | Date
`checksum` | string
`localId` | string
`photoId` | string
`uploadState` | string

## Example

```typescript
import type { SubmittedEvidencePhotoDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "capturedAt": null,
  "checksum": sha256-photo-001,
  "localId": photo-001,
  "photoId": photo-001,
  "uploadState": uploaded,
} satisfies SubmittedEvidencePhotoDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SubmittedEvidencePhotoDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


