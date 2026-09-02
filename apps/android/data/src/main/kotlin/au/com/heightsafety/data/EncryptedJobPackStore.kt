package au.com.heightsafety.data

import android.content.Context
import au.com.heightsafety.domain.FieldJobPack
import au.com.heightsafety.domain.FieldJobPackStore
import au.com.heightsafety.domain.JobPackAnchor
import au.com.heightsafety.domain.OfflineAuthorizationLease
import au.com.heightsafety.domain.StoredJobPack
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

public class EncryptedJobPackStore(
    context: Context,
    directoryName: String = DEFAULT_DIRECTORY_NAME,
    keyAlias: String = DEFAULT_KEY_ALIAS,
) : FieldJobPackStore {
    private val files = JobPackStorageFiles(context.applicationContext, directoryName)
    private val opener = EncryptedJobPackDatabaseOpener(
        context = context.applicationContext,
        files = files,
        passphraseStore = JobPackKeystorePassphraseStore(files, keyAlias),
    )

    override suspend fun save(
        pack: FieldJobPack,
        lease: OfflineAuthorizationLease,
        downloadedAtEpochMillis: Long,
    ) = withContext(Dispatchers.IO) {
        require(lease.companyId == pack.companyId) {
            "job pack lease companyId must match pack"
        }
        require(lease.jobId == pack.jobId) {
            "job pack lease jobId must match pack"
        }
        require(downloadedAtEpochMillis >= 0) {
            "downloadedAtEpochMillis must not be negative"
        }
        opener.open().use { handle ->
            handle.database.jobPackDao().replaceJobPack(
                pack = pack.toEntity(downloadedAtEpochMillis),
                anchors = pack.anchors.map { it.toEntity(pack.jobId) },
                lease = lease.toEntity(),
            )
        }
    }

    override suspend fun load(companyId: String, jobId: String): StoredJobPack? = withContext(Dispatchers.IO) {
        opener.open().use { handle ->
            handle.database.jobPackDao().snapshot(companyId, jobId)?.toDomain()
        }
    }

    override suspend fun updateLease(lease: OfflineAuthorizationLease) =
        withContext(Dispatchers.IO) {
            opener.open().use { handle ->
                handle.database.jobPackDao().saveLease(lease.toEntity())
            }
        }

    private companion object {
        const val DEFAULT_DIRECTORY_NAME = "job-pack"
        const val DEFAULT_KEY_ALIAS = "height-safety-job-pack-v1"
    }
}

private fun FieldJobPack.toEntity(downloadedAtEpochMillis: Long): JobPackEntity =
    JobPackEntity(
        jobId = jobId,
        companyId = companyId,
        siteId = siteId,
        jurisdiction = jurisdiction.value,
        reference = reference,
        plannedDate = plannedDate,
        workflowStatus = workflowStatus,
        jobPackVersion = jobPackVersion,
        siteName = siteName,
        siteAddress = siteAddress,
        siteReference = siteReference,
        accessNotes = accessNotes,
        downloadedAtEpochMillis = downloadedAtEpochMillis,
    )

private fun JobPackAnchor.toEntity(jobPackId: String): JobPackAnchorEntity =
    JobPackAnchorEntity(
        jobPackId = jobPackId,
        anchorId = anchorId,
        companyId = companyId,
        siteId = siteId,
        label = label,
        registerId = registerId,
        location = location,
        anchorType = anchorType,
        manufacturer = manufacturer,
        model = model,
        installContext = installContext,
        registerStatus = registerStatus,
        notes = notes,
        createdAtEpochMillis = createdAtEpochMillis,
        updatedAtEpochMillis = updatedAtEpochMillis,
    )

private fun OfflineAuthorizationLease.toEntity(): OfflineAuthorizationLeaseEntity =
    OfflineAuthorizationLeaseEntity(
        jobPackId = jobId,
        companyId = companyId,
        userId = userId,
        issuedAtEpochMillis = issuedAtEpochMillis,
        expiresAtEpochMillis = expiresAtEpochMillis,
        issuedAtElapsedRealtimeMillis = issuedAtElapsedRealtimeMillis,
        lastObservedEpochMillis = lastObservedEpochMillis,
    )

private fun JobPackStorageSnapshot.toDomain(): StoredJobPack {
    val storedLease = lease
        ?: throw StorageUnavailableException(StorageUnavailableReason.LEASE_MISSING)
    return StoredJobPack(
        pack = FieldJobPack(
            companyId = pack.companyId,
            jobId = pack.jobId,
            siteId = pack.siteId,
            jurisdiction = when (pack.jurisdiction) {
                "NSW" -> au.com.heightsafety.domain.SupportedJurisdiction.NSW
                "QLD" -> au.com.heightsafety.domain.SupportedJurisdiction.QLD
                else -> throw StorageUnavailableException(
                    StorageUnavailableReason.DATABASE_OPEN_FAILED,
                )
            },
            reference = pack.reference,
            plannedDate = pack.plannedDate,
            workflowStatus = pack.workflowStatus,
            jobPackVersion = pack.jobPackVersion,
            siteName = pack.siteName,
            siteAddress = pack.siteAddress,
            siteReference = pack.siteReference,
            accessNotes = pack.accessNotes,
            anchors = anchors.map { it.toDomain() },
        ),
        lease = storedLease.toDomain(),
    )
}

private fun JobPackAnchorEntity.toDomain(): JobPackAnchor = JobPackAnchor(
    companyId = companyId,
    anchorId = anchorId,
    siteId = siteId,
    label = label,
    registerId = registerId,
    location = location,
    anchorType = anchorType,
    manufacturer = manufacturer,
    model = model,
    installContext = installContext,
    registerStatus = registerStatus,
    notes = notes,
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
)

private fun OfflineAuthorizationLeaseEntity.toDomain(): OfflineAuthorizationLease =
    OfflineAuthorizationLease(
        companyId = companyId,
        userId = userId,
        jobId = jobPackId,
        issuedAtEpochMillis = issuedAtEpochMillis,
        expiresAtEpochMillis = expiresAtEpochMillis,
        issuedAtElapsedRealtimeMillis = issuedAtElapsedRealtimeMillis,
        lastObservedEpochMillis = lastObservedEpochMillis,
    )
