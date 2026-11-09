
# SubmittedEvidenceAnchorDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **anchorInspectionId** | **kotlin.String** |  |  |
| **disposition** | [**inline**](#Disposition) |  |  |
| **exceptionReason** | [**inline**](#ExceptionReason) |  |  |
| **identityConfirmed** | **kotlin.Boolean** |  |  |
| **locationConfirmed** | **kotlin.Boolean** |  |  |
| **photos** | [**kotlin.collections.List&lt;SubmittedEvidencePhotoDto&gt;**](SubmittedEvidencePhotoDto.md) |  |  |
| **reconciliationProposal** | [**inline**](#ReconciliationProposal) |  |  |
| **recordedOutcome** | [**inline**](#RecordedOutcome) |  |  |
| **defectDescription** | **kotlin.String** |  |  [optional] |
| **expectedAnchorId** | **kotlin.String** |  |  [optional] |
| **location** | **kotlin.String** |  |  [optional] |
| **notes** | **kotlin.String** |  |  [optional] |
| **observations** | **kotlin.String** |  |  [optional] |
| **proofTestEquipmentReference** | **kotlin.String** |  |  [optional] |
| **proofTestHold** | **kotlin.String** |  |  [optional] |
| **proofTestLoad** | **kotlin.String** |  |  [optional] |
| **proofTestResult** | **kotlin.String** |  |  [optional] |
| **provisionalAnchorId** | **kotlin.String** |  |  [optional] |
| **recommendation** | **kotlin.String** |  |  [optional] |
| **reconciliationReferenceId** | **kotlin.String** |  |  [optional] |


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


<a id="ReconciliationProposal"></a>
## Enum: reconciliationProposal
| Name | Value |
| ---- | ----- |
| reconciliationProposal | newly_discovered, replacement, duplicate |


<a id="RecordedOutcome"></a>
## Enum: recordedOutcome
| Name | Value |
| ---- | ----- |
| recordedOutcome | serviceable, defective, not_inspected, further_assessment_required |



