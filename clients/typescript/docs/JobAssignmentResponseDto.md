
# JobAssignmentResponseDto


## Properties

Name | Type
------------ | -------------
`assignedAt` | Date
`assignmentId` | string
`assignmentType` | string
`companyId` | string
`inspectorUserId` | string
`isPrimary` | boolean
`jobId` | string
`assignedByUserId` | string
`claimedAt` | Date

## Example

```typescript
import type { JobAssignmentResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "assignedAt": null,
  "assignmentId": null,
  "assignmentType": null,
  "companyId": null,
  "inspectorUserId": null,
  "isPrimary": true,
  "jobId": null,
  "assignedByUserId": null,
  "claimedAt": null,
} satisfies JobAssignmentResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as JobAssignmentResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


