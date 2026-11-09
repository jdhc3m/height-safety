
# ReconciliationProposalResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **companyId** | **kotlin.String** |  |  |
| **inspectionId** | **kotlin.String** |  |  |
| **jobId** | **kotlin.String** |  |  |
| **jurisdiction** | [**inline**](#Jurisdiction) |  |  |
| **photos** | [**kotlin.collections.List&lt;ReconciliationProposalPhotoDto&gt;**](ReconciliationProposalPhotoDto.md) |  |  |
| **proposalId** | **kotlin.String** |  |  |
| **proposalType** | [**inline**](#ProposalType) |  |  |
| **recordedOutcome** | [**inline**](#RecordedOutcome) |  |  |
| **revisionNumber** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **siteId** | **kotlin.String** |  |  |
| **submittedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **submittedByUserId** | **kotlin.String** |  |  |
| **inspectorNote** | **kotlin.String** |  |  [optional] |
| **provisionalAnchorId** | **kotlin.String** |  |  [optional] |
| **reconciliationReferenceId** | **kotlin.String** |  |  [optional] |
| **recordedLocation** | **kotlin.String** |  |  [optional] |


<a id="Jurisdiction"></a>
## Enum: jurisdiction
| Name | Value |
| ---- | ----- |
| jurisdiction | NSW, QLD |


<a id="ProposalType"></a>
## Enum: proposalType
| Name | Value |
| ---- | ----- |
| proposalType | newly_discovered, replacement, duplicate |


<a id="RecordedOutcome"></a>
## Enum: recordedOutcome
| Name | Value |
| ---- | ----- |
| recordedOutcome | serviceable, defective, not_inspected, further_assessment_required |



