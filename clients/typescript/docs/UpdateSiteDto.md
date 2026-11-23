
# UpdateSiteDto


## Properties

Name | Type
------------ | -------------
`accessNotes` | string
`address` | string
`clientId` | string
`jurisdiction` | string
`name` | string
`siteReference` | string

## Example

```typescript
import type { UpdateSiteDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "accessNotes": null,
  "address": null,
  "clientId": client-id,
  "jurisdiction": null,
  "name": Updated Warehouse One,
  "siteReference": null,
} satisfies UpdateSiteDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateSiteDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


