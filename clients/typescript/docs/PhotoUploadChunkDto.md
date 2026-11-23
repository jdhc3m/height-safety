
# PhotoUploadChunkDto


## Properties

Name | Type
------------ | -------------
`bytesBase64` | string
`checksum` | string
`localId` | string
`mediaId` | string
`offset` | number
`storageReference` | string
`totalBytes` | number
`contentType` | string

## Example

```typescript
import type { PhotoUploadChunkDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "bytesBase64": null,
  "checksum": sha256-photo-001,
  "localId": photo-001,
  "mediaId": photo-001,
  "offset": 0,
  "storageReference": company-a/anchor-photos/photo-001.jpg,
  "totalBytes": 2048,
  "contentType": image/jpeg,
} satisfies PhotoUploadChunkDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PhotoUploadChunkDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


