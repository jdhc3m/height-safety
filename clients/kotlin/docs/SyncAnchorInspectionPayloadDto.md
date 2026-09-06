
# SyncAnchorInspectionPayloadDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **identityConfirmed** | **kotlin.Boolean** |  |  |
| **inspectionId** | **kotlin.String** |  |  |
| **locationConfirmed** | **kotlin.Boolean** |  |  |
| **photos** | [**kotlin.collections.List&lt;SyncInspectionPhotoPayloadDto&gt;**](SyncInspectionPhotoPayloadDto.md) |  |  |
| **defectDescription** | **kotlin.String** |  |  [optional] |
| **disposition** | [**inline**](#Disposition) |  |  [optional] |
| **exceptionReason** | [**inline**](#ExceptionReason) |  |  [optional] |
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
| **reconciliationProposal** | [**inline**](#ReconciliationProposal) |  |  [optional] |
| **reconciliationReferenceId** | **kotlin.String** |  |  [optional] |
| **recordedOutcome** | [**inline**](#RecordedOutcome) |  |  [optional] |


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



