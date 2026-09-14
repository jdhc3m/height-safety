
# PhotoUploadChunkResponseDto


## Properties

Name | Type
------------ | -------------
`mediaId` | string
`nextOffset` | number
`uploaded` | boolean

## Example

```typescript
import type { PhotoUploadChunkResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "mediaId": photo-001,
  "nextOffset": 2048,
  "uploaded": true,
} satisfies PhotoUploadChunkResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PhotoUploadChunkResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


