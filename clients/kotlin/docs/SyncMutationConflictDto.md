
# SyncMutationConflictDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **conflictId** | **kotlin.String** |  |  |
| **expectedEntityVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **message** | **kotlin.String** |  |  |
| **reason** | [**inline**](#Reason) |  |  |
| **currentEntityVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  [optional] |


<a id="Reason"></a>
## Enum: reason
| Name | Value |
| ---- | ----- |
| reason | expected_version_mismatch, idempotency_key_reuse, mutation_identity_mismatch |



