package au.com.heightsafety.domain

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldSubmissionTest {
    @Test
    fun reviewSeparatesCoverageBlockersFromEvidenceWarnings() {
        val firstAnchor = anchor("anchor-001", manufacturer = null)
        val secondAnchor = anchor("anchor-002", manufacturer = "Example manufacturer")
        val pack = pack(listOf(firstAnchor, secondAnchor))
        val evidence = draft(firstAnchor.anchorId).copy(
            identityConfirmed = true,
            locationConfirmed = true,
            observations = "Recorded observation.",
            recordedOutcome = RecordedOutcome.SERVICEABLE,
        )

        val readiness = SubmissionReadiness.evaluate(pack, listOf(evidence))

        assertEquals(
            listOf(SubmissionReviewCode.MISSING_EXPECTED_ANCHOR_COVERAGE),
            readiness.blockers.map(SubmissionReviewIssue::code),
        )
        assertTrue(
            readiness.warnings.map(SubmissionReviewIssue::code).containsAll(
                listOf(
                    SubmissionReviewCode.MISSING_PHOTOGRAPH,
                    SubmissionReviewCode.INCOMPLETE_REGISTER_CONTEXT,
                ),
            ),
        )
        assertFalse(readiness.isReadyForQueue)
    }

    @Test
    fun duplicateExpectedAnchorCoverageBlocksQueue() {
        val pack = pack(listOf(anchor("anchor-001")))
        val evidence = listOf(
            draft("anchor-001").copy(
                inspectionId = "inspection-001",
                recordedOutcome = RecordedOutcome.NOT_INSPECTED,
                exceptionReason = InspectionExceptionReason.INACCESSIBLE,
            ),
            draft("anchor-001").copy(
                inspectionId = "inspection-002",
                recordedOutcome = RecordedOutcome.NOT_INSPECTED,
                exceptionReason = InspectionExceptionReason.INACCESSIBLE,
            ),
        )

        val readiness = SubmissionReadiness.evaluate(pack, evidence)

        assertEquals(
            listOf(SubmissionReviewCode.DUPLICATE_EXPECTED_ANCHOR_COVERAGE),
            readiness.blockers.map(SubmissionReviewIssue::code),
        )
        assertFalse(readiness.isReadyForQueue)
    }

    @Test
    fun queueStoresPendingIntentAndFreezesEvidence() = runTest {
        val store = FakeSubmissionStore()
        var generatedSubmissions = 0
        var generatedMutations = 0
        val service = service(
            store = store,
            submissionIdGenerator = {
                generatedSubmissions += 1
                "submission-001"
            },
            mutationIdGenerator = {
                generatedMutations += 1
                "mutation-001"
            },
        )
        val opened = opened()
        val evidence = draft(opened.stored.pack.anchors.single().anchorId).copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = InspectionExceptionReason.INACCESSIBLE,
        )
        store.drafts += evidence

        val queued = service.queue(session(), opened)
        val frozen = store.drafts.single()

        assertEquals("submission-001", queued.submissionId)
        assertEquals("mutation-001", queued.mutationId)
        assertEquals(EvidenceSyncState.PENDING, queued.syncState)
        assertEquals("submission-001", frozen.submissionId)
        assertEquals(EvidenceSyncState.PENDING, frozen.syncState)
        assertEquals(1, generatedSubmissions)
        assertEquals(1, generatedMutations)

        val retried = service.queue(session(), opened)

        assertEquals(queued, retried)
        assertEquals(1, generatedSubmissions)
        assertEquals(1, generatedMutations)
    }

    @Test
    fun queueRejectsCaptureBlockersAndDoesNotCreateIntent() = runTest {
        val store = FakeSubmissionStore()
        val service = service(store)
        store.drafts += draft("anchor-001")

        val error = try {
            service.queue(session(), opened())
            null
        } catch (exception: SubmissionNotReadyException) {
            exception
        }

        assertNotNull(error)
        assertTrue(
            error!!.readiness.blockers.any {
                it.code == SubmissionReviewCode.CAPTURE_VALIDATION
            },
        )
        assertEquals(null, store.intent)
        assertTrue(store.drafts.single().submissionId == null)
    }

    @Test
    fun queuedEvidenceCannotBeEditedThroughEvidenceService() = runTest {
        val store = FakeSubmissionStore()
        val evidenceService = AnchorEvidenceService(
            store = store,
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val service = service(store, evidenceService)
        val opened = opened()
        store.drafts += draft("anchor-001").copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = InspectionExceptionReason.INACCESSIBLE,
        )
        service.queue(session(), opened)

        val error = try {
            evidenceService.saveDraft(
                session = session(),
                opened = opened,
                draft = store.drafts.single().copy(notes = "attempted edit"),
            )
            null
        } catch (exception: AnchorEvidenceSubmittedException) {
            exception
        }

        assertNotNull(error)
        assertEquals(null, store.drafts.single().notes)
    }

    @Test
    fun newEvidenceCannotBeSavedAfterSubmissionIsQueued() = runTest {
        val store = FakeSubmissionStore()
        val evidenceService = AnchorEvidenceService(
            store = store,
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val service = service(store, evidenceService)
        val opened = opened()
        store.drafts += draft("anchor-001").copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = InspectionExceptionReason.INACCESSIBLE,
        )
        service.queue(session(), opened)

        val error = try {
            evidenceService.saveDraft(
                session = session(),
                opened = opened,
                draft = draft("anchor-001").copy(inspectionId = "inspection-002"),
            )
            null
        } catch (exception: AnchorEvidenceSubmittedException) {
            exception
        }

        assertNotNull(error)
        assertEquals(1, store.drafts.size)
        assertEquals("inspection-001", store.drafts.single().inspectionId)
    }

    private fun service(
        store: FakeSubmissionStore,
        evidenceService: AnchorEvidenceService = AnchorEvidenceService(
            store = store,
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        ),
        submissionIdGenerator: () -> String = { "submission-generated" },
        mutationIdGenerator: () -> String = { "mutation-generated" },
    ) = AnchorSubmissionService(
        evidenceService = evidenceService,
        store = store,
        nowEpochMillis = { 2_000L },
        submissionIdGenerator = submissionIdGenerator,
        mutationIdGenerator = mutationIdGenerator,
    )

    private class FakeSubmissionStore : AnchorEvidenceSubmissionStore {
        val drafts = mutableListOf<AnchorInspectionDraft>()
        var intent: InspectionSubmissionIntent? = null

        override suspend fun loadEvidence(
            companyId: String,
            jobId: String,
            jobPackVersion: Long,
        ): List<AnchorInspectionDraft> = drafts.filter {
            it.companyId == companyId &&
                it.jobId == jobId &&
                it.jobPackVersion == jobPackVersion
        }

        override suspend fun saveEvidence(draft: AnchorInspectionDraft) {
            drafts.removeAll { it.inspectionId == draft.inspectionId }
            drafts += draft
        }

        override suspend fun loadSubmission(
            companyId: String,
            jobId: String,
            jobPackVersion: Long,
        ): InspectionSubmissionIntent? = intent?.takeIf {
            it.companyId == companyId &&
                it.jobId == jobId &&
                it.jobPackVersion == jobPackVersion
        }

        override suspend fun queueSubmission(
            intent: InspectionSubmissionIntent,
            frozenEvidence: List<AnchorInspectionDraft>,
        ): InspectionSubmissionIntent {
            this.intent?.let { return it }
            this.intent = intent
            drafts.removeAll {
                it.companyId == intent.companyId &&
                    it.jobId == intent.jobId &&
                    it.jobPackVersion == intent.jobPackVersion
            }
            drafts += frozenEvidence
            return intent
        }
    }

    private fun draft(expectedAnchorId: String) = AnchorInspectionDraft(
        companyId = "company-a",
        jobId = "job-001",
        jobPackVersion = 1L,
        inspectionId = "inspection-001",
        expectedAnchorId = expectedAnchorId,
        createdAtEpochMillis = 1_000L,
    )

    private fun opened() = OpenedJobPack(
        stored = StoredJobPack(
            pack = pack(listOf(anchor("anchor-001"))),
            lease = OfflineAuthorizationLease(
                companyId = "company-a",
                userId = "inspector-a",
                jobId = "job-001",
                issuedAtEpochMillis = 1_000L,
                expiresAtEpochMillis = Long.MAX_VALUE,
                issuedAtElapsedRealtimeMillis = 1L,
            ),
        ),
        source = JobPackOpenSource.CACHED,
    )

    private fun session() = FieldSession(
        accessToken = "session-token",
        companyId = "company-a",
        sessionId = "session-001",
        userId = "inspector-a",
        email = "inspector@example.test",
        role = ProductRole.INSPECTOR,
        mfaSatisfied = false,
        expiresAtEpochMillis = Long.MAX_VALUE,
    )

    private fun pack(anchors: List<JobPackAnchor>) = FieldJobPack(
        companyId = "company-a",
        jobId = "job-001",
        siteId = "site-001",
        jurisdiction = SupportedJurisdiction.NSW,
        reference = "JOB-001",
        plannedDate = "2026-09-15",
        workflowStatus = "in_progress",
        jobPackVersion = 1L,
        siteName = "Site 001",
        siteAddress = "1 Example Street",
        siteReference = "SITE-001",
        accessNotes = null,
        anchors = anchors,
    )

    private fun anchor(
        anchorId: String,
        manufacturer: String? = "Example manufacturer",
    ) = JobPackAnchor(
        companyId = "company-a",
        anchorId = anchorId,
        siteId = "site-001",
        label = "A-$anchorId",
        registerId = "REG-$anchorId",
        location = "North roof",
        anchorType = "single_point",
        manufacturer = manufacturer,
        model = manufacturer?.let { "Example model" },
        installContext = manufacturer?.let { "Installed roof anchor" },
        registerStatus = "active",
        notes = null,
        createdAtEpochMillis = 1L,
        updatedAtEpochMillis = 2L,
    )
}
