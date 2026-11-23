
# CreateReviewIssueDto


## Properties

Name | Type
------------ | -------------
`inspectionId` | string
`issueType` | string
`reason` | string
`anchorInspectionId` | string

## Example

```typescript
import type { CreateReviewIssueDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "inspectionId": inspection-001,
  "issueType": change,
  "reason": Please add the missing location evidence before approval.,
  "anchorInspectionId": anchor-inspection-001,
} satisfies CreateReviewIssueDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateReviewIssueDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


