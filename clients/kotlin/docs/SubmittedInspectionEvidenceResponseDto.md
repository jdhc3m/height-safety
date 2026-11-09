
# SubmittedInspectionEvidenceResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **accountedAnchorCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **anchors** | [**kotlin.collections.List&lt;SubmittedEvidenceAnchorDto&gt;**](SubmittedEvidenceAnchorDto.md) |  |  |
| **companyId** | **kotlin.String** |  |  |
| **evidenceSynchronised** | **kotlin.Boolean** |  |  |
| **evidenceVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **expectedAnchorCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **failedPhotoCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **inspectionId** | **kotlin.String** |  |  |
| **inspectorUserId** | **kotlin.String** |  |  |
| **jobId** | **kotlin.String** |  |  |
| **jobPackVersion** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **jurisdiction** | [**inline**](#Jurisdiction) |  |  |
| **latestRevisionNumber** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **openBlockerCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **openChangeRequestCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **openConflictCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **openWarningCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **pendingPhotoCount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **revisionNumber** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **siteId** | **kotlin.String** |  |  |
| **submittedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **workflowStatus** | [**inline**](#WorkflowStatus) |  |  |


<a id="Jurisdiction"></a>
## Enum: jurisdiction
| Name | Value |
| ---- | ----- |
| jurisdiction | NSW, QLD |


<a id="WorkflowStatus"></a>
## Enum: workflowStatus
| Name | Value |
| ---- | ----- |
| workflowStatus | submitted |



