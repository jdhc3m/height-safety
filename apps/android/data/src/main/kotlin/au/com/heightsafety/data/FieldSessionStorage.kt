package au.com.heightsafety.data

import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.ProductRole

private const val ACTIVE_FIELD_SESSION_KEY = "active"

internal fun FieldSession.toEntity(): FieldSessionEntity = FieldSessionEntity(
    sessionKey = ACTIVE_FIELD_SESSION_KEY,
    accessToken = accessToken,
    companyId = companyId,
    sessionId = sessionId,
    userId = userId,
    email = email,
    role = role.name,
    mfaSatisfied = mfaSatisfied,
    expiresAtEpochMillis = expiresAtEpochMillis,
)

internal fun FieldSessionEntity.toDomain(): FieldSession = try {
    FieldSession(
        accessToken = accessToken,
        companyId = companyId,
        sessionId = sessionId,
        userId = userId,
        email = email,
        role = ProductRole.entries.singleOrNull { it.name == role }
            ?: error("unsupported field session role: $role"),
        mfaSatisfied = mfaSatisfied,
        expiresAtEpochMillis = expiresAtEpochMillis,
    )
} catch (error: StorageUnavailableException) {
    throw error
} catch (error: Exception) {
    throw StorageUnavailableException(StorageUnavailableReason.DATABASE_OPEN_FAILED, error)
}
