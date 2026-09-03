package au.com.heightsafety.domain

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldAnchorEvidenceTest {
    @Test
    fun serviceableCaptureRequiresConfirmedIdentityLocationAndObservations() {
        val issues = draft().copy(
            recordedOutcome = RecordedOutcome.SERVICEABLE,
        ).validationIssues(pack())

        assertTrue(issues.has(CaptureValidationCode.MISSING_IDENTITY_CONFIRMATION))
        assertTrue(issues.has(CaptureValidationCode.MISSING_LOCATION_CONFIRMATION))
        assertTrue(issues.has(CaptureValidationCode.MISSING_OBSERVATIONS))

        val complete = draft().copy(
            identityConfirmed = true,
            locationConfirmed = true,
            observations = "No visible damage recorded.",
            recordedOutcome = RecordedOutcome.SERVICEABLE,
        )
        assertTrue(complete.validationIssues(pack()).isEmpty())
    }

    @Test
    fun defectiveCaptureRequiresDefectAndSupportingObservation() {
        val issues = draft().copy(
            identityConfirmed = true,
            locationConfirmed = true,
            recordedOutcome = RecordedOutcome.DEFECTIVE,
        ).validationIssues(pack())

        assertTrue(issues.has(CaptureValidationCode.MISSING_OBSERVATIONS))
        assertTrue(issues.has(CaptureValidationCode.MISSING_DEFECT_DESCRIPTION))

        val complete = draft().copy(
            identityConfirmed = true,
            locationConfirmed = true,
            observations = "Corrosion recorded at the fixing.",
            recordedOutcome = RecordedOutcome.DEFECTIVE,
            defectDescription = "Visible corrosion at the fixing.",
        )
        assertTrue(complete.validationIssues(pack()).isEmpty())
    }

    @Test
    fun notInspectedRequiresExceptionAndRejectsExceptionOnOtherOutcomes() {
        val missing = draft().copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
        ).validationIssues(pack())
        assertTrue(missing.has(CaptureValidationCode.MISSING_EXCEPTION_REASON))

        val missingSearchContext = draft().copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = InspectionExceptionReason.UNABLE_TO_LOCATE,
        ).validationIssues(pack())
        assertTrue(missingSearchContext.has(CaptureValidationCode.MISSING_SEARCH_CONTEXT))

        val invalid = draft().copy(
            recordedOutcome = RecordedOutcome.SERVICEABLE,
            identityConfirmed = true,
            locationConfirmed = true,
            observations = "Recorded observation.",
            exceptionReason = InspectionExceptionReason.INACCESSIBLE,
        ).validationIssues(pack())
        assertTrue(invalid.has(CaptureValidationCode.INVALID_EXCEPTION))

        val complete = draft().copy(
            recordedOutcome = RecordedOutcome.NOT_INSPECTED,
            exceptionReason = InspectionExceptionReason.UNABLE_TO_LOCATE,
            observations = "Searched the north roof access path; anchor not located.",
        )
        assertTrue(complete.validationIssues(pack()).isEmpty())
    }

    @Test
    fun furtherAssessmentRequiresReasonAndFollowUp() {
        val issues = draft().copy(
            identityConfirmed = true,
            locationConfirmed = true,
            recordedOutcome = RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED,
            observations = "Access or condition needs additional assessment.",
        ).validationIssues(pack())
        assertTrue(issues.has(CaptureValidationCode.MISSING_FOLLOW_UP))

        val complete = draft().copy(
            identityConfirmed = true,
            locationConfirmed = true,
            recordedOutcome = RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED,
            observations = "Access or condition needs additional assessment.",
            recommendation = "Refer for further assessment.",
        )
        assertTrue(complete.validationIssues(pack()).isEmpty())
    }

    @Test
    fun reconciliationKeepsProvisionalIdentityExplicit() {
        val newAnchor = draft().copy(
            expectedAnchorId = null,
            provisionalAnchorId = "provisional-001",
            reconciliationProposal = ReconciliationProposal.NEWLY_DISCOVERED,
            location = "South roof",
            identityConfirmed = true,
            locationConfirmed = true,
            observations = "Anchor observed onsite.",
            recordedOutcome = RecordedOutcome.FURTHER_ASSESSMENT_REQUIRED,
            recommendation = "Office review of register proposal.",
        )
        assertTrue(newAnchor.validationIssues(pack()).isEmpty())

        val silent = newAnchor.copy(reconciliationProposal = null)
        assertTrue(silent.validationIssues(pack()).has(CaptureValidationCode.INVALID_RECONCILIATION))
    }

    @Test
    fun partialProofTestIsVisibleAsIncomplete() {
        val issues = draft().copy(
            identityConfirmed = true,
            locationConfirmed = true,
            observations = "Test was recorded by inspector.",
            recordedOutcome = RecordedOutcome.SERVICEABLE,
            proofTest = RecordedProofTest(load = "7.5 kN"),
        ).validationIssues(pack())
        assertTrue(issues.has(CaptureValidationCode.INCOMPLETE_PROOF_TEST))
    }

    @Test
    fun serviceSavesLocalDraftAndPreservesPackIdentity() = runTest {
        val store = FakeEvidenceStore()
        val service = AnchorEvidenceService(
            store = store,
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val opened = opened()
        val created = service.newExpectedDraft(
            session = session(),
            opened = opened,
            anchor = pack().anchors.single(),
            inspectionId = "inspection-001",
        )
        val saved = service.saveDraft(session(), opened, created.copy(observations = "Draft note"))

        assertEquals(EvidenceSyncState.LOCAL, saved.syncState)
        assertEquals(2_000L, saved.updatedAtEpochMillis)
        assertEquals(saved, store.drafts.single())
    }

    @Test
    fun serviceRejectsDraftFromAnotherPackVersion() = runTest {
        val service = AnchorEvidenceService(
            store = FakeEvidenceStore(),
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val error = try {
            service.saveDraft(
                session(),
                opened(),
                draft().copy(jobPackVersion = 2L),
            )
            null
        } catch (exception: AnchorEvidenceValidationException) {
            exception
        }

        assertTrue(error != null)
        assertTrue(error!!.issues.has(CaptureValidationCode.PACK_IDENTITY_MISMATCH))
    }

    @Test
    fun evidenceAccessRejectsExpiredOfflineLease() {
        val service = AnchorEvidenceService(
            store = FakeEvidenceStore(),
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val expired = opened().copy(
            stored = opened().stored.copy(
                lease = opened().stored.lease.copy(expiresAtEpochMillis = 2_000L),
            ),
        )

        val error = try {
            service.newExpectedDraft(session(), expired, pack().anchors.single(), "inspection-002")
            null
        } catch (exception: JobPackAccessException) {
            exception
        }

        assertEquals(JobPackAccessFailure.LEASE_EXPIRED, error?.reason)
    }

    @Test
    fun evidenceAccessRejectsElapsedLeaseExpiryAndClockRollback() {
        val elapsedService = AnchorEvidenceService(
            store = FakeEvidenceStore(),
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = {
                1L + OFFLINE_AUTHORIZATION_LEASE_DURATION_MILLIS
            },
        )
        val elapsedError = try {
            elapsedService.newExpectedDraft(
                session(),
                opened(),
                pack().anchors.single(),
                "inspection-003",
            )
            null
        } catch (exception: JobPackAccessException) {
            exception
        }
        assertEquals(JobPackAccessFailure.ELAPSED_RUNTIME_EXPIRED, elapsedError?.reason)

        val rollbackService = AnchorEvidenceService(
            store = FakeEvidenceStore(),
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val rollbackOpened = opened().copy(
            stored = opened().stored.copy(
                lease = opened().stored.lease.copy(lastObservedEpochMillis = 3_000L),
            ),
        )
        val rollbackError = try {
            rollbackService.newExpectedDraft(
                session(),
                rollbackOpened,
                pack().anchors.single(),
                "inspection-004",
            )
            null
        } catch (exception: JobPackAccessException) {
            exception
        }
        assertEquals(JobPackAccessFailure.CLOCK_ROLLBACK, rollbackError?.reason)
    }

    @Test
    fun newDraftUsesCanonicalAnchorMetadataFromOpenedPack() {
        val service = AnchorEvidenceService(
            store = FakeEvidenceStore(),
            nowEpochMillis = { 2_000L },
            elapsedRealtimeMillis = { 2_000L },
        )
        val spoofedAnchor = pack().anchors.single().copy(location = "Spoofed location")

        val created = service.newExpectedDraft(
            session = session(),
            opened = opened(),
            anchor = spoofedAnchor,
            inspectionId = "inspection-005",
        )

        assertEquals("North roof", created.location)
    }

    private class FakeEvidenceStore : AnchorEvidenceStore {
        val drafts = mutableListOf<AnchorInspectionDraft>()

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
            drafts.removeIf {
                it.companyId == draft.companyId &&
                    it.jobId == draft.jobId &&
                    it.jobPackVersion == draft.jobPackVersion &&
                    it.inspectionId == draft.inspectionId
            }
            drafts += draft
        }
    }

    private fun List<CaptureValidationIssue>.has(code: CaptureValidationCode): Boolean =
        any { it.code == code }

    private fun draft() = AnchorInspectionDraft(
        companyId = "company-a",
        jobId = "job-001",
        jobPackVersion = 1L,
        inspectionId = "inspection-001",
        expectedAnchorId = "anchor-001",
        createdAtEpochMillis = 1_000L,
    )

    private fun opened() = OpenedJobPack(
        stored = StoredJobPack(
            pack = pack(),
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

    private fun pack() = FieldJobPack(
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
        anchors = listOf(
            JobPackAnchor(
                companyId = "company-a",
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
