package au.com.heightsafety.domain

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class JobPackAccessTest {
    @Test
    fun downloadPersistsLeaseAndLaterOpensCachedPack() = runTest {
        var now = 1_000L
        var elapsed = 500L
        val gateway = FakeGateway(pack())
        val store = FakeStore()
        val service = service(gateway, store) { now to elapsed }

        val downloaded = service.openOrDownload(session(), job())
        assertEquals(JobPackOpenSource.DOWNLOADED, downloaded.source)
        assertEquals(1, gateway.downloadCount)
        assertEquals(1_000L + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS, downloaded.stored.lease.expiresAtEpochMillis)

        gateway.failure = IllegalStateException("network unavailable")
        now = 2_000L
        elapsed = 1_500L
        val cached = service.openOrDownload(session(), job())

        assertEquals(JobPackOpenSource.CACHED, cached.source)
        assertEquals(1, gateway.downloadCount)
        assertEquals(2_000L, store.value!!.lease.lastObservedEpochMillis)
    }

    @Test
    fun cachedPackLeaseExpiryLocksAccessAndPreservesEvidence() = runTest {
        val store = FakeStore()
        val current = session()
        val storedPack = pack()
        val lease = OfflineAuthorizationLease.issue(
            session = current,
            jobId = storedPack.jobId,
            issuedAtEpochMillis = 1_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        store.save(storedPack, lease, 1_000L)
        val service = service(FakeGateway(storedPack), store) { 1_000L + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS to 2_000L }

        val error = expectAccessFailure {
            service.openCached(current, storedPack.jobId)
        }

        assertEquals(JobPackAccessFailure.LEASE_EXPIRED, error.reason)
        assertEquals(storedPack, store.value!!.pack)
        assertEquals(
            1_000L + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS,
            store.value!!.lease.lastObservedEpochMillis,
        )
    }

    @Test
    fun observedLeaseExpirySurvivesLaterClockRollback() = runTest {
        val store = FakeStore()
        val current = session()
        val storedPack = pack()
        val lease = OfflineAuthorizationLease.issue(
            session = current,
            jobId = storedPack.jobId,
            issuedAtEpochMillis = 1_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        store.save(storedPack, lease, 1_000L)
        val service = service(FakeGateway(storedPack), store) {
            1_000L + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS to 2_000L
        }

        expectAccessFailure {
            service.openCached(current, storedPack.jobId)
        }

        val rollbackService = service(FakeGateway(storedPack), store) {
            2_000L to 2_500L
        }
        val error = expectAccessFailure {
            rollbackService.openCached(current, storedPack.jobId)
        }

        assertEquals(JobPackAccessFailure.CLOCK_ROLLBACK, error.reason)
    }

    @Test
    fun clockRollbackLocksAccessWithoutUpdatingLastObservation() = runTest {
        val store = FakeStore()
        val current = session()
        val storedPack = pack()
        val lease = OfflineAuthorizationLease.issue(
            session = current,
            jobId = storedPack.jobId,
            issuedAtEpochMillis = 1_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        ).observe(2_000L)
        store.save(storedPack, lease, 1_000L)
        val service = service(FakeGateway(storedPack), store) { 1_999L to 1_000L }

        val error = expectAccessFailure {
            service.openCached(current, storedPack.jobId)
        }

        assertEquals(JobPackAccessFailure.CLOCK_ROLLBACK, error.reason)
        assertEquals(2_000L, store.value!!.lease.lastObservedEpochMillis)
    }

    @Test
    fun elapsedRuntimeExpiryLocksAccess() = runTest {
        val store = FakeStore()
        val current = session()
        val storedPack = pack()
        val lease = OfflineAuthorizationLease.issue(
            session = current,
            jobId = storedPack.jobId,
            issuedAtEpochMillis = 1_000L,
            issuedAtElapsedRealtimeMillis = 500L,
        )
        store.save(storedPack, lease, 1_000L)
        val service = service(FakeGateway(storedPack), store) {
            2_000L to 500L + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS
        }

        val error = expectAccessFailure {
            service.openCached(current, storedPack.jobId)
        }

        assertEquals(JobPackAccessFailure.ELAPSED_RUNTIME_EXPIRED, error.reason)
    }

    @Test
    fun remotePackMustMatchAuthorisedTenantAndVersion() = runTest {
        val store = FakeStore()
        val wrongTenant = pack(companyId = "company-b")
        val service = service(FakeGateway(wrongTenant), store) { 1_000L to 500L }

        val error = expectAccessFailure {
            service.openOrDownload(session(), job())
        }

        assertEquals(JobPackAccessFailure.INVALID_REMOTE_PACK, error.reason)
        assertFalse(store.saved)
    }

    @Test
    fun unclaimedReleasedJobCannotDownloadPack() = runTest {
        val store = FakeStore()
        val gateway = FakeGateway(pack())
        val service = service(gateway, store) { 1_000L to 500L }

        val error = expectAccessFailure {
            service.openOrDownload(
                session(),
                job().copy(workflowStatus = "released", assignment = null),
            )
        }

        assertEquals(JobPackAccessFailure.JOB_NOT_CLAIMED, error.reason)
        assertEquals(0, gateway.downloadCount)
        assertFalse(store.saved)
    }

    @Test
    fun cachedPackCannotBeOpenedByAnotherInspector() = runTest {
        val store = FakeStore()
        val current = session()
        val storedPack = pack()
        store.save(
            storedPack,
            OfflineAuthorizationLease.issue(current, storedPack.jobId, 1_000L, 500L),
            1_000L,
        )
        val service = service(FakeGateway(storedPack), store) { 2_000L to 1_000L }

        val error = expectAccessFailure {
            service.openCached(
                current.copy(userId = "inspector-b"),
                storedPack.jobId,
            )
        }

        assertEquals(JobPackAccessFailure.LOCAL_PACK_IDENTITY_MISMATCH, error.reason)
    }

    private fun service(
        gateway: FakeGateway,
        store: FakeStore,
        clock: () -> Pair<Long, Long>,
    ) = JobPackService(
        gateway = gateway,
        store = store,
        nowEpochMillis = { clock().first },
        elapsedRealtimeMillis = { clock().second },
    )

    private suspend fun expectAccessFailure(
        action: suspend () -> Unit,
    ): JobPackAccessException {
        try {
            action()
        } catch (error: JobPackAccessException) {
            return error
        }
        throw AssertionError("expected JobPackAccessException")
    }

    private class FakeGateway(
        private val result: FieldJobPack,
    ) : JobPackGateway {
        var failure: Throwable? = null
        var downloadCount = 0

        override suspend fun downloadJobPack(
            session: FieldSession,
            jobId: String,
        ): FieldJobPack {
            downloadCount += 1
            failure?.let { throw it }
            return result
        }
    }

    private class FakeStore : FieldJobPackStore {
        var value: StoredJobPack? = null
        var saved = false

        override suspend fun save(
            pack: FieldJobPack,
            lease: OfflineAuthorizationLease,
            downloadedAtEpochMillis: Long,
        ) {
            value = StoredJobPack(pack, lease)
            saved = true
        }

        override suspend fun load(companyId: String, jobId: String): StoredJobPack? =
            value?.takeIf { it.pack.companyId == companyId && it.pack.jobId == jobId }

        override suspend fun updateLease(lease: OfflineAuthorizationLease) {
            val current = value ?: error("no current pack")
            value = current.copy(lease = lease)
        }
    }

    private fun session(
        companyId: String = "company-a",
    ) = FieldSession(
        accessToken = "session-token",
        companyId = companyId,
        sessionId = "session-id",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
        mfaSatisfied = false,
        expiresAtEpochMillis = Long.MAX_VALUE,
    )

    private fun job(
        companyId: String = "company-a",
        version: Long = 1L,
    ) = InspectorJob(
        companyId = companyId,
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
        workflowStatus = "assigned",
        jobPackVersion = version,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
        assignment = InspectorAssignment(
            companyId = companyId,
            assignmentId = "assignment-001",
            jobId = "job-001",
            inspectorUserId = "inspector-a",
            assignedByUserId = "office-a",
            assignmentType = "assigned",
            isPrimary = true,
            assignedAtEpochMillis = 1L,
            claimedAtEpochMillis = null,
        ),
    )

    private fun pack(companyId: String = "company-a") = FieldJobPack(
        companyId = companyId,
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
        workflowStatus = "assigned",
        jobPackVersion = 1L,
        siteName = "Site 001",
        siteAddress = "1 Example Street",
        siteReference = "SITE-001",
        accessNotes = "Use north access",
        anchors = listOf(
            JobPackAnchor(
                companyId = companyId,
                anchorId = "anchor-001",
                siteId = "site-001",
                label = "A-001",
                registerId = "REG-001",
                location = "North roof",
                anchorType = "single_point",
                manufacturer = null,
                model = null,
                installContext = null,
                registerStatus = "active",
                notes = null,
                createdAtEpochMillis = 1L,
                updatedAtEpochMillis = 2L,
            ),
        ),
    )
}
