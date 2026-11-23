
# AnchorRecordedOutcomeDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **anchorInspectionId** | **kotlin.String** |  |  |
| **companyId** | **kotlin.String** |  |  |
| **disposition** | [**inline**](#Disposition) |  |  |
| **exceptionReason** | [**inline**](#ExceptionReason) |  |  |
| **inspectionId** | **kotlin.String** |  |  |
| **jobId** | **kotlin.String** |  |  |
| **jobReference** | **kotlin.String** |  |  |
| **photos** | [**kotlin.collections.List&lt;SubmittedEvidencePhotoDto&gt;**](SubmittedEvidencePhotoDto.md) |  |  |
| **recordedOutcome** | [**inline**](#RecordedOutcome) |  |  |
| **revisionNumber** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **submittedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |


<a id="Disposition"></a>
## Enum: disposition
| Name | Value |
| ---- | ----- |
| disposition | removed_from_service |


<a id="ExceptionReason"></a>
## Enum: exceptionReason
| Name | Value |
| ---- | ----- |
| exceptionReason | inaccessible, unable_to_locate |


<a id="RecordedOutcome"></a>
## Enum: recordedOutcome
| Name | Value |
| ---- | ----- |
| recordedOutcome | serviceable, defective, not_inspected, further_assessment_required |



