
# ReconciliationProposalDecisionResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **companyId** | **kotlin.String** |  |  |
| **decidedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **decidedByUserId** | **kotlin.String** |  |  |
| **decision** | [**inline**](#Decision) |  |  |
| **inspectionId** | **kotlin.String** |  |  |
| **proposalDecisionId** | **kotlin.String** |  |  |
| **proposalId** | **kotlin.String** |  |  |
| **proposalType** | [**inline**](#ProposalType) |  |  |
| **replayed** | **kotlin.Boolean** |  |  |
| **siteId** | **kotlin.String** |  |  |
| **assignedLabel** | **kotlin.String** |  |  [optional] |
| **assignedLocation** | **kotlin.String** |  |  [optional] |
| **reason** | **kotlin.String** |  |  [optional] |
| **registerAnchorId** | **kotlin.String** |  |  [optional] |


<a id="Decision"></a>
## Enum: decision
| Name | Value |
| ---- | ----- |
| decision | accepted, rejected |


<a id="ProposalType"></a>
## Enum: proposalType
| Name | Value |
| ---- | ----- |
| proposalType | newly_discovered, replacement, duplicate |



