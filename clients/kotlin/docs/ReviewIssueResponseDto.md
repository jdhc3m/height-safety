
# ReviewIssueResponseDto

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **companyId** | **kotlin.String** |  |  |
| **createdAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  |
| **inspectionId** | **kotlin.String** |  |  |
| **issueType** | [**inline**](#IssueType) |  |  |
| **reason** | **kotlin.String** |  |  |
| **reviewerUserId** | **kotlin.String** |  |  |
| **reviewIssueId** | **kotlin.String** |  |  |
| **status** | [**inline**](#Status) |  |  |
| **anchorInspectionId** | **kotlin.String** |  |  [optional] |
| **resolvedAt** | [**java.time.OffsetDateTime**](java.time.OffsetDateTime.md) |  |  [optional] |


<a id="IssueType"></a>
## Enum: issueType
| Name | Value |
| ---- | ----- |
| issueType | blocker, warning, conflict, change |


<a id="Status"></a>
## Enum: status
| Name | Value |
| ---- | ----- |
| status | open, resolved |



