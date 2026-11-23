
# CreateJobDto


## Properties

Name | Type
------------ | -------------
`reference` | string
`siteId` | string
`plannedDate` | Date

## Example

```typescript
import type { CreateJobDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "reference": JOB-2026-001,
  "siteId": site-id,
  "plannedDate": Tue Sep 15 00:00:00 UTC 2026,
} satisfies CreateJobDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateJobDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


