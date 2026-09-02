package au.com.heightsafety.domain

public const val OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS: Long =
    24L * 60L * 60L * 1_000L

public data class JobPackAnchor(
    public val companyId: String,
    public val anchorId: String,
    public val siteId: String,
    public val label: String?,
    public val registerId: String?,
    public val location: String?,
    public val anchorType: String,
    public val manufacturer: String?,
    public val model: String?,
    public val installContext: String?,
    public val registerStatus: String,
    public val notes: String?,
    public val createdAtEpochMillis: Long,
    public val updatedAtEpochMillis: Long,
) {
    init {
        require(companyId.isNotBlank()) { "anchor companyId is required" }
        require(anchorId.isNotBlank()) { "anchorId is required" }
        require(siteId.isNotBlank()) { "anchor siteId is required" }
        require(anchorType.isNotBlank()) { "anchorType is required" }
        require(registerStatus.isNotBlank()) { "anchor registerStatus is required" }
    }
}

public data class FieldJobPack(
    public val companyId: String,
    public val jobId: String,
    public val siteId: String,
    public val jurisdiction: SupportedJurisdiction,
    public val reference: String,
    public val plannedDate: String?,
    public val workflowStatus: String,
    public val jobPackVersion: Long,
    public val siteName: String,
    public val siteAddress: String?,
    public val siteReference: String?,
    public val accessNotes: String?,
    public val anchors: List<JobPackAnchor>,
) {
    init {
        require(companyId.isNotBlank()) { "job pack companyId is required" }
        require(jobId.isNotBlank()) { "jobId is required" }
        require(siteId.isNotBlank()) { "siteId is required" }
        require(reference.isNotBlank()) { "job reference is required" }
        require(workflowStatus.isNotBlank()) { "workflowStatus is required" }
        require(jobPackVersion > 0) { "jobPackVersion must be positive" }
        require(siteName.isNotBlank()) { "siteName is required" }
        require(anchors.map(JobPackAnchor::anchorId).distinct().size == anchors.size) {
            "job pack anchor IDs must be unique"
        }
        require(anchors.all { it.companyId == companyId && it.siteId == siteId }) {
            "job pack anchors must belong to the job pack company and site"
        }
    }
}

public enum class OfflineLeaseLockReason {
    WALL_CLOCK_EXPIRED,
    ELAPSED_RUNTIME_EXPIRED,
    CLOCK_ROLLBACK,
}

public data class OfflineAuthorizationLease(
    public val companyId: String,
    public val userId: String,
    public val jobId: String,
    public val issuedAtEpochMillis: Long,
    public val expiresAtEpochMillis: Long,
    public val issuedAtElapsedRealtimeMillis: Long,
    public val lastObservedEpochMillis: Long = issuedAtEpochMillis,
) {
    init {
        require(companyId.isNotBlank()) { "lease companyId is required" }
        require(userId.isNotBlank()) { "lease userId is required" }
        require(jobId.isNotBlank()) { "lease jobId is required" }
        require(expiresAtEpochMillis > issuedAtEpochMillis) {
            "lease expiry must be after issue time"
        }
        require(issuedAtElapsedRealtimeMillis >= 0) {
            "lease elapsed issue time must not be negative"
        }
        require(
            issuedAtElapsedRealtimeMillis <=
                Long.MAX_VALUE - OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS,
        ) {
            "lease elapsed issue time is too large"
        }
        require(lastObservedEpochMillis >= issuedAtEpochMillis) {
            "lease observation cannot precede issue time"
        }
    }

    public fun lockReason(
        nowEpochMillis: Long,
        elapsedRealtimeMillis: Long,
    ): OfflineLeaseLockReason? {
        require(nowEpochMillis >= 0) { "current epoch time must not be negative" }
        require(elapsedRealtimeMillis >= 0) {
            "current elapsed time must not be negative"
        }
        if (nowEpochMillis < lastObservedEpochMillis) {
            return OfflineLeaseLockReason.CLOCK_ROLLBACK
        }
        if (nowEpochMillis >= expiresAtEpochMillis) {
            return OfflineLeaseLockReason.WALL_CLOCK_EXPIRED
        }
        if (
            elapsedRealtimeMillis >=
                issuedAtElapsedRealtimeMillis + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS
        ) {
            return OfflineLeaseLockReason.ELAPSED_RUNTIME_EXPIRED
        }
        return null
    }

    public fun observe(nowEpochMillis: Long): OfflineAuthorizationLease {
        require(nowEpochMillis >= lastObservedEpochMillis) {
            "lease observation moved backwards"
        }
        return copy(lastObservedEpochMillis = nowEpochMillis)
    }

    public companion object {
        public fun issue(
            session: FieldSession,
            jobId: String,
            issuedAtEpochMillis: Long,
            issuedAtElapsedRealtimeMillis: Long,
        ): OfflineAuthorizationLease {
            require(jobId.isNotBlank()) { "jobId is required" }
            require(issuedAtEpochMillis >= 0) {
                "lease issue time must not be negative"
            }
            require(issuedAtElapsedRealtimeMillis >= 0) {
                "lease elapsed issue time must not be negative"
            }
            require(
                issuedAtEpochMillis <=
                    Long.MAX_VALUE - OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS,
            ) {
                "lease issue time is too large"
            }
            require(
                issuedAtElapsedRealtimeMillis <=
                    Long.MAX_VALUE - OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS,
            ) {
                "lease elapsed issue time is too large"
            }
            return OfflineAuthorizationLease(
                companyId = session.companyId,
                userId = session.userId,
                jobId = jobId,
                issuedAtEpochMillis = issuedAtEpochMillis,
                expiresAtEpochMillis =
                    issuedAtEpochMillis + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS,
                issuedAtElapsedRealtimeMillis = issuedAtElapsedRealtimeMillis,
            )
        }
    }
}

public data class StoredJobPack(
    public val pack: FieldJobPack,
    public val lease: OfflineAuthorizationLease,
) {
    init {
        require(lease.companyId == pack.companyId) {
            "job pack lease companyId must match pack"
        }
        require(lease.jobId == pack.jobId) {
            "job pack lease jobId must match pack"
        }
    }
}

public interface JobPackGateway {
    public suspend fun downloadJobPack(
        session: FieldSession,
        jobId: String,
    ): FieldJobPack
}

public interface FieldJobPackStore {
    public suspend fun save(
        pack: FieldJobPack,
        lease: OfflineAuthorizationLease,
        downloadedAtEpochMillis: Long,
    )

    public suspend fun load(companyId: String, jobId: String): StoredJobPack?

    public suspend fun updateLease(lease: OfflineAuthorizationLease)
}

public enum class JobPackOpenSource {
    DOWNLOADED,
    CACHED,
}

public data class OpenedJobPack(
    public val stored: StoredJobPack,
    public val source: JobPackOpenSource,
)

public enum class JobPackAccessFailure {
    NOT_FOUND,
    JOB_NOT_CLAIMED,
    LOCAL_PACK_IDENTITY_MISMATCH,
    PACK_VERSION_CONFLICT,
    LEASE_EXPIRED,
    ELAPSED_RUNTIME_EXPIRED,
    CLOCK_ROLLBACK,
    INVALID_REMOTE_PACK,
}

public class JobPackAccessException(
    public val reason: JobPackAccessFailure,
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

public class JobPackService(
    private val gateway: JobPackGateway,
    private val store: FieldJobPackStore,
    private val nowEpochMillis: () -> Long,
    private val elapsedRealtimeMillis: () -> Long,
) {
    public suspend fun openOrDownload(
        session: FieldSession,
        job: InspectorJob,
    ): OpenedJobPack {
        requireInspectorSession(session)
        requirePackDownloadAuthorization(session, job)

        val cached = store.load(session.companyId, job.jobId)
        var cachedLock: JobPackAccessException? = null
        if (cached != null) {
            validateCachedIdentity(session, job, cached)
            if (cached.pack.jobPackVersion >= job.jobPackVersion) {
                try {
                    return openStored(session, cached)
                } catch (error: JobPackAccessException) {
                    if (error.reason !in LOCKED_REASONS) {
                        throw error
                    }
                    cachedLock = error
                }
            }
        }

        val downloadStartedAt = nowEpochMillis()
        if (session.isExpired(downloadStartedAt)) {
            cachedLock?.let { throw it }
            throw FieldSessionExpiredException()
        }

        val downloaded = gateway.downloadJobPack(session, job.jobId)
        validateRemotePack(session, job, downloaded)
        if (cached != null && downloaded.jobPackVersion < cached.pack.jobPackVersion) {
            throw JobPackAccessException(
                JobPackAccessFailure.PACK_VERSION_CONFLICT,
                "server returned an older job pack version",
            )
        }

        val lease = OfflineAuthorizationLease.issue(
            session = session,
            jobId = downloaded.jobId,
            issuedAtEpochMillis = downloadStartedAt,
            issuedAtElapsedRealtimeMillis = elapsedRealtimeMillis(),
        )
        store.save(downloaded, lease, downloadStartedAt)
        return OpenedJobPack(
            stored = StoredJobPack(downloaded, lease),
            source = JobPackOpenSource.DOWNLOADED,
        )
    }

    public suspend fun openCached(
        session: FieldSession,
        jobId: String,
    ): OpenedJobPack {
        requireInspectorSession(session)
        val cached = store.load(session.companyId, jobId)
            ?: throw JobPackAccessException(
                JobPackAccessFailure.NOT_FOUND,
                "downloaded job pack was not found",
            )
        validateCachedIdentity(session, cached)
        return openStored(session, cached)
    }

    private suspend fun openStored(
        session: FieldSession,
        cached: StoredJobPack,
    ): OpenedJobPack {
        val now = nowEpochMillis()
        val elapsed = elapsedRealtimeMillis()
        val observedLease = if (now >= cached.lease.lastObservedEpochMillis) {
            cached.lease.observe(now)
        } else {
            cached.lease
        }
        if (observedLease != cached.lease) {
            store.updateLease(observedLease)
        }
        when (observedLease.lockReason(now, elapsed)) {
            null -> {
                return OpenedJobPack(
                    stored = cached.copy(lease = observedLease),
                    source = JobPackOpenSource.CACHED,
                )
            }
            OfflineLeaseLockReason.WALL_CLOCK_EXPIRED -> throw JobPackAccessException(
                JobPackAccessFailure.LEASE_EXPIRED,
                "offline job-pack lease expired; local evidence is preserved",
            )
            OfflineLeaseLockReason.ELAPSED_RUNTIME_EXPIRED ->
                throw JobPackAccessException(
                    JobPackAccessFailure.ELAPSED_RUNTIME_EXPIRED,
                    "offline job-pack lease expired; local evidence is preserved",
                )
            OfflineLeaseLockReason.CLOCK_ROLLBACK -> throw JobPackAccessException(
                JobPackAccessFailure.CLOCK_ROLLBACK,
                "offline job-pack access locked after clock rollback; local evidence is preserved",
            )
        }
    }

    private fun validateCachedIdentity(
        session: FieldSession,
        job: InspectorJob,
        cached: StoredJobPack,
    ) {
        if (
            cached.pack.companyId != session.companyId ||
            cached.pack.companyId != job.companyId ||
            cached.pack.jobId != job.jobId ||
            cached.pack.siteId != job.siteId ||
            cached.pack.jurisdiction != job.jurisdiction ||
            cached.lease.companyId != session.companyId ||
            cached.lease.userId != session.userId ||
            cached.lease.jobId != job.jobId
        ) {
            throw JobPackAccessException(
                JobPackAccessFailure.LOCAL_PACK_IDENTITY_MISMATCH,
                "downloaded job pack identity does not match authorised job",
            )
        }
    }

    private fun validateCachedIdentity(
        session: FieldSession,
        cached: StoredJobPack,
    ) {
        if (
            cached.pack.companyId != session.companyId ||
            cached.lease.companyId != session.companyId ||
            cached.lease.userId != session.userId ||
            cached.lease.jobId != cached.pack.jobId
        ) {
            throw JobPackAccessException(
                JobPackAccessFailure.LOCAL_PACK_IDENTITY_MISMATCH,
                "downloaded job pack identity does not match signed-in inspector",
            )
        }
    }

    private fun validateRemotePack(
        session: FieldSession,
        job: InspectorJob,
        downloaded: FieldJobPack,
    ) {
        if (
            downloaded.companyId != session.companyId ||
            downloaded.companyId != job.companyId ||
            downloaded.jobId != job.jobId ||
            downloaded.siteId != job.siteId ||
            downloaded.jurisdiction != job.jurisdiction ||
            downloaded.reference != job.reference ||
            downloaded.plannedDate != job.plannedDate ||
            downloaded.workflowStatus != job.workflowStatus ||
            downloaded.jobPackVersion < job.jobPackVersion ||
            downloaded.anchors.any {
                it.companyId != downloaded.companyId || it.siteId != downloaded.siteId
            }
        ) {
            throw JobPackAccessException(
                JobPackAccessFailure.INVALID_REMOTE_PACK,
                "server job pack does not match authorised job",
            )
        }
    }

    private fun requirePackDownloadAuthorization(
        session: FieldSession,
        job: InspectorJob,
    ) {
        requireAuthorizedJob(session, listOf(job), job.jobId)
        if (job.assignment?.inspectorUserId != session.userId) {
            throw JobPackAccessException(
                JobPackAccessFailure.JOB_NOT_CLAIMED,
                "job must be claimed or assigned before its pack can be downloaded",
            )
        }
    }

    private companion object {
        val LOCKED_REASONS = setOf(
            JobPackAccessFailure.LEASE_EXPIRED,
            JobPackAccessFailure.ELAPSED_RUNTIME_EXPIRED,
            JobPackAccessFailure.CLOCK_ROLLBACK,
        )
    }
}
