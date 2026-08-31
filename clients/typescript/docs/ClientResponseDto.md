
# ClientResponseDto


## Properties

Name | Type
------------ | -------------
`clientId` | string
`companyId` | string
`createdAt` | Date
`name` | string
`updatedAt` | Date
`contactDetails` | string
`externalReference` | string

## Example

```typescript
import type { ClientResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "clientId": null,
  "companyId": null,
  "createdAt": null,
  "name": null,
  "updatedAt": null,
  "contactDetails": null,
  "externalReference": null,
} satisfies ClientResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ClientResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


