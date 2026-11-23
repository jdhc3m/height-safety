
# JobAssignmentResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **assignedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **assignmentId** | **kotlin.String** |  |  |
| **assignmentType** | [**inline**](#AssignmentType) |  |  |
| **companyId** | **kotlin.String** |  |  |
| **inspectorUserId** | **kotlin.String** |  |  |
| **isPrimary** | **kotlin.Boolean** |  |  |
| **jobId** | **kotlin.String** |  |  |
| **assignedByUserId** | **kotlin.String** |  |  [optional] |
| **claimedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  [optional] |


<a id="AssignmentType"></a>
## Enum: assignmentType
| Name | Value |
| ---- | ----- |
| assignmentType | assigned, claimed |



