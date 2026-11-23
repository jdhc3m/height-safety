
# AnchorResponseDto


## Properties

Name | Type
------------ | -------------
`anchorId` | string
`anchorType` | string
`companyId` | string
`createdAt` | Date
`registerStatus` | string
`siteId` | string
`updatedAt` | Date
`installContext` | string
`label` | string
`location` | string
`manufacturer` | string
`model` | string
`notes` | string
`registerId` | string

## Example

```typescript
import type { AnchorResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "anchorId": null,
  "anchorType": null,
  "companyId": null,
  "createdAt": null,
  "registerStatus": null,
  "siteId": null,
  "updatedAt": null,
  "installContext": null,
  "label": null,
  "location": null,
  "manufacturer": null,
  "model": null,
  "notes": null,
  "registerId": null,
} satisfies AnchorResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AnchorResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


