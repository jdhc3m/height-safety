
# ReviewIssueResolutionResponseDto


## Properties

Name | Type
------------ | -------------
`issue` | [ReviewIssueResponseDto](ReviewIssueResponseDto.md)
`replayed` | boolean

## Example

```typescript
import type { ReviewIssueResolutionResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "issue": null,
  "replayed": false,
} satisfies ReviewIssueResolutionResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReviewIssueResolutionResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


