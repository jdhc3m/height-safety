
# DecideReconciliationProposalDto


## Properties

Name | Type
------------ | -------------
`decision` | string
`assignedLabel` | string
`location` | string
`reason` | string

## Example

```typescript
import type { DecideReconciliationProposalDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "decision": accept,
  "assignedLabel": A-12,
  "location": North roof, plant room access,
  "reason": Duplicate of the existing A-05 record.,
} satisfies DecideReconciliationProposalDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DecideReconciliationProposalDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


