
# JobResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`createdAt` | Date
`jobId` | string
`jobPackVersion` | number
`jurisdiction` | string
`reference` | string
`siteId` | string
`updatedAt` | Date
`workflowStatus` | string
`assignment` | [JobAssignmentResponseDto](JobAssignmentResponseDto.md)
`plannedDate` | Date

## Example

```typescript
import type { JobResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "createdAt": null,
  "jobId": null,
  "jobPackVersion": 1,
  "jurisdiction": null,
  "reference": null,
  "siteId": null,
  "updatedAt": null,
  "workflowStatus": null,
  "assignment": null,
  "plannedDate": null,
} satisfies JobResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as JobResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


