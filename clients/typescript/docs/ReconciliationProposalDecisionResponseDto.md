
# ReconciliationProposalDecisionResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`decidedAt` | Date
`decidedByUserId` | string
`decision` | string
`inspectionId` | string
`proposalDecisionId` | string
`proposalId` | string
`proposalType` | string
`replayed` | boolean
`siteId` | string
`assignedLabel` | string
`assignedLocation` | string
`reason` | string
`registerAnchorId` | string

## Example

```typescript
import type { ReconciliationProposalDecisionResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "decidedAt": null,
  "decidedByUserId": null,
  "decision": accepted,
  "inspectionId": inspection-001,
  "proposalDecisionId": null,
  "proposalId": anchor-inspection-001,
  "proposalType": newly_discovered,
  "replayed": false,
  "siteId": site-001,
  "assignedLabel": A-12,
  "assignedLocation": null,
  "reason": null,
  "registerAnchorId": anchor-009,
} satisfies ReconciliationProposalDecisionResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReconciliationProposalDecisionResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


