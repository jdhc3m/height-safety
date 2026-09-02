
# JobResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **companyId** | **kotlin.String** |  |  |
| **createdAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **jobId** | **kotlin.String** |  |  |
| **jobPackVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **jurisdiction** | [**inline**](#Jurisdiction) |  |  |
| **reference** | **kotlin.String** |  |  |
| **siteId** | **kotlin.String** |  |  |
| **updatedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **workflowStatus** | [**inline**](#WorkflowStatus) |  |  |
| **assignment** | [**JobAssignmentResponseDto**](JobAssignmentResponseDto.md) |  |  [optional] |
| **plannedDate** | [**java.time.LocalDate**](java.time.LocalDate.md) |  |  [optional] |


<a id="Jurisdiction"></a>
## Enum: jurisdiction
| Name | Value |
| ---- | ----- |
| jurisdiction | NSW, QLD |


<a id="WorkflowStatus"></a>
## Enum: workflowStatus
| Name | Value |
| ---- | ----- |
| workflowStatus | draft, released, assigned, in_progress, submitted, under_review, changes_requested, approved_for_report_generation, report_generated |



