
# SyncMutationResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **companyId** | **kotlin.String** |  |  |
| **idempotencyKey** | **kotlin.String** |  |  |
| **mutationId** | **kotlin.String** |  |  |
| **payloadApplied** | **kotlin.Boolean** |  |  |
| **replayed** | **kotlin.Boolean** |  |  |
| **state** | [**inline**](#State) |  |  |
| **acknowledgedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  [optional] |
| **conflict** | [**SyncMutationConflictDto**](SyncMutationConflictDto.md) |  |  [optional] |
| **serverEntityVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  [optional] |


<a id="State"></a>
## Enum: state
| Name | Value |
| ---- | ----- |
| state | synchronised, conflict |



