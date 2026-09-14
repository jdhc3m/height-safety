
# ReviewActionResponseDto


## Properties

Name | Type
------------ | -------------
`action` | string
`companyId` | string
`createdAt` | Date
`reason` | string
`reviewActionId` | string
`reviewerUserId` | string
`reviewIssueId` | string

## Example

```typescript
import type { ReviewActionResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "action": null,
  "companyId": null,
  "createdAt": null,
  "reason": null,
  "reviewActionId": null,
  "reviewerUserId": null,
  "reviewIssueId": null,
} satisfies ReviewActionResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReviewActionResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


