
# AuthUserResponseDto


## Properties

Name | Type
------------ | -------------
`email` | string
`role` | string
`userId` | string

## Example

```typescript
import type { AuthUserResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "email": null,
  "role": null,
  "userId": null,
} satisfies AuthUserResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AuthUserResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


