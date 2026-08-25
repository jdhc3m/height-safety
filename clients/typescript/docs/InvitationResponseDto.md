
# InvitationResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`email` | string
`expiresAt` | Date
`invitationId` | string
`role` | string

## Example

```typescript
import type { InvitationResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "email": null,
  "expiresAt": null,
  "invitationId": null,
  "role": null,
} satisfies InvitationResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InvitationResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


