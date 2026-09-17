
# ApprovedSnapshotResponseDto


## Properties

Name | Type
------------ | -------------
`approvalId` | string
`approvedAt` | Date
`approvedByUserId` | string
`companyId` | string
`jobId` | string
`jurisdiction` | string
`sha256` | string
`siteId` | string
`snapshotId` | string
`sourceEvidenceVersion` | number
`sourceIdentitySha256` | string
`sourceInspectionId` | string
`sourceInspectionRevision` | number

## Example

```typescript
import type { ApprovedSnapshotResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "approvalId": null,
  "approvedAt": null,
  "approvedByUserId": null,
  "companyId": null,
  "jobId": null,
  "jurisdiction": null,
  "sha256": null,
  "siteId": null,
  "snapshotId": null,
  "sourceEvidenceVersion": null,
  "sourceIdentitySha256": null,
  "sourceInspectionId": null,
  "sourceInspectionRevision": null,
} satisfies ApprovedSnapshotResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ApprovedSnapshotResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


