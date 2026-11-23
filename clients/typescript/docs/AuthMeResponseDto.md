
# AuthMeResponseDto


## Properties

Name | Type
------------ | -------------
`companyId` | string
`email` | string
`mfaSatisfied` | boolean
`role` | string
`sessionExpiresAt` | Date
`sessionId` | string
`userId` | string

## Example

```typescript
import type { AuthMeResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "companyId": null,
  "email": null,
  "mfaSatisfied": null,
  "role": null,
  "sessionExpiresAt": null,
  "sessionId": null,
  "userId": null,
} satisfies AuthMeResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AuthMeResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


