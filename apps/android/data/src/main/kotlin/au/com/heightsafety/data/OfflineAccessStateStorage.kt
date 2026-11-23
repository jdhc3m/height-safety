package au.com.heightsafety.data

import au.com.heightsafety.domain.FieldOfflineAccessState
import au.com.heightsafety.domain.OfflineAccessAuditAction
import au.com.heightsafety.domain.OfflineAccessAuditEvent
import au.com.heightsafety.domain.OfflineAccountStatus
import au.com.heightsafety.domain.OfflineEvidenceLedger
import au.com.heightsafety.domain.OfflineKeystoreState
import au.com.heightsafety.domain.OfflineAccessLockReason
import au.com.heightsafety.domain.OfflineAccessMode
import au.com.heightsafety.domain.OfflineUploadRecovery
import org.json.JSONArray
import org.json.JSONObject

internal fun FieldOfflineAccessState.toEntity(): OfflineAccessStateEntity =
    OfflineAccessStateEntity(
        companyId = companyId,
        userId = userId,
        nowEpochMillis = nowEpochMillis,
        highestObservedEpochMillis = highestObservedEpochMillis,
        elapsedRealtimeMillis = elapsedRealtimeMillis,
        lastOnlineAuthorizationEpochMillis = lastOnlineAuthorizationEpochMillis,
        leaseDurationMillis = leaseDurationMillis,
        leaseExpiresAtEpochMillis = leaseExpiresAtEpochMillis,
        leaseElapsedDeadlineMillis = leaseElapsedDeadlineMillis,
        serverAccountStatus = serverAccountStatus.name,
        deviceAccountStatus = deviceAccountStatus.name,
        keystoreState = keystoreState.name,
        deviceUnlocked = deviceUnlocked,
        mode = mode.name,
        lockReason = lockReason.name,
        pendingMutationIdsJson = evidence.pendingMutationIds.toJsonArray(),
        pendingPhotoIdsJson = evidence.pendingPhotoIds.toJsonArray(),
        unresolvedConflictIdsJson = evidence.unresolvedConflictIds.toJsonArray(),
        serverAcknowledged = evidence.serverAcknowledged,
        localJobPackPresent = localJobPackPresent,
        recoveryCompanyId = recovery?.companyId,
        recoveryAdministratorUserId = recovery?.administratorUserId,
        recoveryGrantedAtEpochMillis = recovery?.grantedAtEpochMillis,
        recoveryExpiresAtEpochMillis = recovery?.expiresAtEpochMillis,
        auditJson = audit.toJsonArray(),
    )

internal fun OfflineAccessStateEntity.toDomain(): FieldOfflineAccessState = try {
    val storedRecovery = when {
        recoveryCompanyId == null &&
            recoveryAdministratorUserId == null &&
            recoveryGrantedAtEpochMillis == null &&
            recoveryExpiresAtEpochMillis == null -> null
        recoveryCompanyId != null &&
            recoveryAdministratorUserId != null &&
            recoveryGrantedAtEpochMillis != null &&
            recoveryExpiresAtEpochMillis != null -> OfflineUploadRecovery(
            companyId = recoveryCompanyId,
            administratorUserId = recoveryAdministratorUserId,
            grantedAtEpochMillis = recoveryGrantedAtEpochMillis,
            expiresAtEpochMillis = recoveryExpiresAtEpochMillis,
        )
        else -> error("offline access recovery columns are incomplete")
    }
    FieldOfflineAccessState(
        companyId = companyId,
        userId = userId,
        nowEpochMillis = nowEpochMillis,
        highestObservedEpochMillis = highestObservedEpochMillis,
        elapsedRealtimeMillis = elapsedRealtimeMillis,
        lastOnlineAuthorizationEpochMillis = lastOnlineAuthorizationEpochMillis,
        leaseDurationMillis = leaseDurationMillis,
        leaseExpiresAtEpochMillis = leaseExpiresAtEpochMillis,
        leaseElapsedDeadlineMillis = leaseElapsedDeadlineMillis,
        serverAccountStatus = serverAccountStatus.toStoredEnum(OfflineAccountStatus.entries),
        deviceAccountStatus = deviceAccountStatus.toStoredEnum(OfflineAccountStatus.entries),
        keystoreState = keystoreState.toStoredEnum(OfflineKeystoreState.entries),
        deviceUnlocked = deviceUnlocked,
        mode = mode.toStoredEnum(OfflineAccessMode.entries),
        lockReason = lockReason.toStoredEnum(OfflineAccessLockReason.entries),
        evidence = OfflineEvidenceLedger(
            pendingMutationIds = pendingMutationIdsJson.toStringSet(),
            pendingPhotoIds = pendingPhotoIdsJson.toStringSet(),
            unresolvedConflictIds = unresolvedConflictIdsJson.toStringSet(),
            serverAcknowledged = serverAcknowledged,
        ),
        localJobPackPresent = localJobPackPresent,
        recovery = storedRecovery,
        audit = auditJson.toAuditEvents(),
    )
} catch (error: StorageUnavailableException) {
    throw error
} catch (error: Exception) {
    throw StorageUnavailableException(StorageUnavailableReason.DATABASE_OPEN_FAILED, error)
}

private fun Set<String>.toJsonArray(): String = JSONArray().apply {
    sorted().forEach(::put)
}.toString()

private fun List<OfflineAccessAuditEvent>.toJsonArray(): String = JSONArray().apply {
    forEach { event ->
        put(
            JSONObject().apply {
                put("atEpochMillis", event.atEpochMillis)
                put("action", event.action.name)
                put("actorUserId", event.actorUserId ?: JSONObject.NULL)
            },
        )
    }
}.toString()

private fun String.toStringSet(): Set<String> {
    val values = JSONArray(this)
    return buildSet {
        repeat(values.length()) { index ->
            add(values.getString(index))
        }
    }
}

private fun String.toAuditEvents(): List<OfflineAccessAuditEvent> {
    val values = JSONArray(this)
    return buildList {
        repeat(values.length()) { index ->
            val value = values.getJSONObject(index)
            val actor = value.opt("actorUserId").let { actorValue ->
                when (actorValue) {
                    null, JSONObject.NULL -> null
                    is String -> actorValue
                    else -> error("offline access audit actor is invalid")
                }
            }
            add(
                OfflineAccessAuditEvent(
                    atEpochMillis = value.getLong("atEpochMillis"),
                    action = value.getString("action")
                        .toStoredEnum(OfflineAccessAuditAction.entries),
                    actorUserId = actor,
                ),
            )
        }
    }
}

private fun <T : Enum<T>> String.toStoredEnum(values: Iterable<T>): T =
    values.singleOrNull { it.name == this }
        ?: error("unsupported offline access value: $this")
