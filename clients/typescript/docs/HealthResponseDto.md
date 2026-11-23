
# HealthResponseDto


## Properties

Name | Type
------------ | -------------
`generatedAt` | Date
`status` | string
`buildVersion` | string

## Example

```typescript
import type { HealthResponseDto } from '@height-safety/api-client'

// TODO: Update the object below with actual values
const example = {
  "generatedAt": 2026-08-10T00:00Z,
  "status": ok,
  "buildVersion": null,
} satisfies HealthResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as HealthResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


