
# JobPackResponseDto


## Properties

Name | Type
------------ | -------------
`anchors` | [Array&lt;AnchorResponseDto&gt;](AnchorResponseDto.md)
`job` | [JobResponseDto](JobResponseDto.md)
`site` | [SiteResponseDto](SiteResponseDto.md)

## Example

```typescript
import type { JobPackResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "anchors": null,
  "job": null,
  "site": null,
} satisfies JobPackResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as JobPackResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


