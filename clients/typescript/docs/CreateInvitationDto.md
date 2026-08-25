
# CreateInvitationDto


## Properties

Name | Type
------------ | -------------
`email` | string
`expiresAt` | Date
`role` | string

## Example

```typescript
import type { CreateInvitationDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "email": inspector@example.test,
  "expiresAt": 2026-09-01T00:00Z,
  "role": inspector,
} satisfies CreateInvitationDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateInvitationDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


