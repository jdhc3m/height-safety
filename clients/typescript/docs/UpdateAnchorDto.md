
# UpdateAnchorDto


## Properties

Name | Type
------------ | -------------
`anchorType` | string
`installContext` | string
`label` | string
`location` | string
`manufacturer` | string
`model` | string
`notes` | string
`registerId` | string
`registerStatus` | string

## Example

```typescript
import type { UpdateAnchorDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "anchorType": null,
  "installContext": null,
  "label": null,
  "location": null,
  "manufacturer": null,
  "model": null,
  "notes": null,
  "registerId": null,
  "registerStatus": null,
} satisfies UpdateAnchorDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateAnchorDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


