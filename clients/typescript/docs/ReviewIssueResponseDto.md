
# ReviewIssueResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`createdAt` | Date
`inspectionId` | string
`issueType` | string
`reason` | string
`reviewerUserId` | string
`reviewIssueId` | string
`status` | string
`anchorInspectionId` | string
`resolvedAt` | Date

## Example

```typescript
import type { ReviewIssueResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "createdAt": null,
  "inspectionId": null,
  "issueType": null,
  "reason": null,
  "reviewerUserId": null,
  "reviewIssueId": null,
  "status": null,
  "anchorInspectionId": null,
  "resolvedAt": null,
} satisfies ReviewIssueResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReviewIssueResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


