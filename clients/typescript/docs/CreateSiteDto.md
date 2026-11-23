
# CreateSiteDto


## Properties

Name | Type
------------ | -------------
`clientId` | string
`jurisdiction` | string
`name` | string
`accessNotes` | string
`address` | string
`siteReference` | string

## Example

```typescript
import type { CreateSiteDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "clientId": client-id,
  "jurisdiction": NSW,
  "name": Warehouse One,
  "accessNotes": null,
  "address": null,
  "siteReference": null,
} satisfies CreateSiteDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateSiteDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


