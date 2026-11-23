
# UpdateClientDto


## Properties

Name | Type
------------ | -------------
`contactDetails` | string
`externalReference` | string
`name` | string

## Example

```typescript
import type { UpdateClientDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "contactDetails": null,
  "externalReference": null,
  "name": Updated Facilities Pty Ltd,
} satisfies UpdateClientDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateClientDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


