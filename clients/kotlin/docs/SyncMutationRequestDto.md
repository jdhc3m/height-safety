
# SyncMutationRequestDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **entityId** | **kotlin.String** |  |  |
| **entityType** | [**inline**](#EntityType) |  |  |
| **entityVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **expectedEntityVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **idempotencyKey** | **kotlin.String** |  |  |
| **mutationId** | **kotlin.String** |  |  |
| **operation** | [**inline**](#Operation) |  |  |
| **payload** | [**SyncInspectionSubmissionPayloadDto**](SyncInspectionSubmissionPayloadDto.md) |  |  [optional] |


<a id="EntityType"></a>
## Enum: entityType
| Name | Value |
| ---- | ----- |
| entityType | inspection_submission |


<a id="Operation"></a>
## Enum: operation
| Name | Value |
| ---- | ----- |
| operation | submit_inspection |



