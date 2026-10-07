
# ReportGenerationResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **attemptCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **generationId** | **kotlin.String** |  |  |
| **jobId** | **kotlin.String** |  |  |
| **jurisdiction** | [**inline**](#Jurisdiction) |  |  |
| **reportRevisionId** | **kotlin.String** |  |  |
| **requestedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **snapshotId** | **kotlin.String** |  |  |
| **status** | [**inline**](#Status) |  |  |
| **templateVersion** | **kotlin.String** |  |  |
| **completedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  [optional] |
| **lastFailureCode** | **kotlin.String** |  |  [optional] |
| **revisionNumber** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  [optional] |


<a id="Jurisdiction"></a>
## Enum: jurisdiction
| Name | Value |
| ---- | ----- |
| jurisdiction | NSW, QLD |


<a id="Status"></a>
## Enum: status
| Name | Value |
| ---- | ----- |
| status | queued, processing, completed, failed, superseded |



