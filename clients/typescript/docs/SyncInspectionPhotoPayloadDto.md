
# SyncInspectionPhotoPayloadDto


## Properties

Name | Type
------------ | -------------
`capturedAtEpochMillis` | number
`checksum` | string
`localId` | string
`storageReference` | string
`byteSize` | number
`contentType` | string

## Example

```typescript
import type { SyncInspectionPhotoPayloadDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "capturedAtEpochMillis": 1725000000000,
  "checksum": sha256-photo-001,
  "localId": photo-001,
  "storageReference": anchor-photos/photo-001.jpg,
  "byteSize": 2048,
  "contentType": image/jpeg,
} satisfies SyncInspectionPhotoPayloadDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SyncInspectionPhotoPayloadDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


