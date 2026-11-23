package au.com.heightsafety.app

import au.com.heightsafety.domain.AnchorEvidencePhoto
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.EvidenceSyncState
import au.com.heightsafety.domain.InspectionSubmissionIntent
import au.com.heightsafety.domain.PhotoUploadState
import au.com.heightsafety.domain.ProductRole
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldDestinationsTest {

    @Test
    fun signedOutAndSigningStatesMapToSignInDestination() {
        assertEquals(FieldDestination.SignIn, fieldDestinationFor(FieldUiState.SignedOut))
        assertEquals(
            FieldDestination.SignIn,
            fieldDestinationFor(FieldUiState.SigningIn("company-a")),
        )
        assertEquals(
            FieldDestination.SignIn,
            fieldDestinationFor(FieldUiState.RestoringSession()),
        )
        assertEquals(
            FieldDestination.SignIn,
            fieldDestinationFor(FieldUiState.SessionExpired()),
        )
        assertEquals(
            FieldDestination.SignIn,
            fieldDestinationFor(
                FieldUiState.Error(message = "Unable to sign in. Try again.", canRetry = true),
            ),
        )
    }

    @Test
    fun lockedAndRevokedStatesMapToTheirDestinations() {
        assertEquals(
            FieldDestination.Locked,
            fieldDestinationFor(FieldUiState.AppLocked(referenceAccount())),
        )
        assertEquals(
            FieldDestination.Revoked,
            fieldDestinationFor(FieldUiState.AccountRevoked(referenceAccount())),
        )
    }

    @Test
    fun signedInJobListStatesMapToJobsDestination() {
        assertEquals(
            FieldDestination.Jobs,
            fieldDestinationFor(FieldUiState.LoadingJobs(referenceAccount())),
        )
        assertEquals(
            FieldDestination.Jobs,
            fieldDestinationFor(FieldUiState.EmptyJobs(referenceAccount())),
        )
        assertEquals(
            FieldDestination.Jobs,
            fieldDestinationFor(
                FieldUiState.Error(
                    message = "Unable to sync jobs. Try again.",
                    canRetry = true,
                    account = referenceAccount(),
                ),
            ),
        )
    }

    @Test
    fun captureFlowStatesMapToTheirPushedDestinations() {
        val packState = referenceJobPackState()
        assertEquals(FieldDestination.JobPack, fieldDestinationFor(packState))

        val captureState = referenceDefectiveAnchorState()
        assertEquals(FieldDestination.Capture, fieldDestinationFor(captureState))
    }

    @Test
    fun destinationsExposeStableDepthsForTheBackStack() {
        assertTrue(
            FieldDestination.Capture.depth > FieldDestination.JobPack.depth,
        )
        assertTrue(
            FieldDestination.SubmissionReview.depth > FieldDestination.JobPack.depth,
        )
        assertTrue(FieldDestination.JobPack.depth > FieldDestination.Jobs.depth)
        assertEquals(
            FieldDestination.Jobs.depth,
            FieldDestination.Sync.depth,
        )
        assertEquals(
            FieldDestination.Jobs.depth,
            FieldDestination.Account.depth,
        )
    }

    @Test
    fun plainJobListStatesCarryNoSyncBadgeCounts() {
        assertNull(fieldSyncBadgeCount(FieldUiState.LoadingJobs(referenceAccount())))
        assertNull(fieldSyncBadgeCount(FieldUiState.EmptyJobs(referenceAccount())))
    }

    @Test
    fun unsynchronisedEvidenceRecordsDriveTheSyncBadge() {
        val packState = referenceJobPackState()
        val draft = draftFor(packState)
        val withDraft = packState.copy(
            evidence = listOf(
                draft.copy(syncState = EvidenceSyncState.LOCAL),
            ),
        )

        assertEquals(1, fieldSyncBadgeCount(withDraft))

        val synchronised = withDraft.copy(
            evidence = listOf(
                draft.copy(syncState = EvidenceSyncState.SYNCHRONISED),
            ),
        )
        assertEquals(0, fieldSyncBadgeCount(synchronised))
    }

    @Test
    fun queuedSubmissionCountsAsOneUnsentRecord() {
        val packState = referenceJobPackState()
        val draft = draftFor(packState).copy(syncState = EvidenceSyncState.PENDING)
        val intent = InspectionSubmissionIntent(
            companyId = packState.account.companyId,
            jobId = packState.job.jobId,
            jobPackVersion = packState.opened.stored.pack.jobPackVersion,
            submissionId = "submission-001",
            mutationId = "mutation-001",
            inspectorUserId = packState.account.userId,
            sessionId = "session-001",
            createdAtEpochMillis = 1_000L,
            syncState = EvidenceSyncState.PENDING,
        )
        val queued = packState.copy(
            evidence = listOf(draft),
            submissionIntent = intent,
        )

        assertEquals(1, fieldSyncBadgeCount(queued))

        val acknowledged = queued.copy(
            submissionIntent = intent.copy(syncState = EvidenceSyncState.SYNCHRONISED),
        )
        assertEquals(0, fieldSyncBadgeCount(acknowledged))
    }

    @Test
    fun pendingAndFailedPhotosCountTowardTheSyncBadge() {
        val packState = referenceJobPackState()
        val draft = draftFor(packState).copy(syncState = EvidenceSyncState.SYNCHRONISED)
        val photo = AnchorEvidencePhoto(
            companyId = packState.account.companyId,
            jobId = packState.job.jobId,
            anchorInspectionId = draft.inspectionId,
            localId = "photo-001",
            storageReference = "private/photo-001.jpg",
            capturedAtEpochMillis = 1_100L,
            checksum = "sha256-photo-001",
        )
        val withPhotos = packState.copy(
            evidence = listOf(
                draft.copy(
                    photos = listOf(
                        photo.copy(localId = "photo-001", uploadState = PhotoUploadState.PENDING_UPLOAD),
                        photo.copy(localId = "photo-002", uploadState = PhotoUploadState.FAILED),
                        photo.copy(localId = "photo-003", uploadState = PhotoUploadState.UPLOADED),
                    ),
                ),
            ),
        )

        assertEquals(2, fieldSyncBadgeCount(withPhotos))
    }

    @Test
    fun unsavedCaptureEditsRequestTheDiscardGuard() {
        val captureState = referenceDefectiveAnchorState()
        // A brand-new draft has no stored copy yet, so closing would discard it.
        assertTrue(captureHasUnsavedEdits(captureState))

        val savedState = captureState.copy(
            evidence = listOf(captureState.draft),
            saveState = EvidenceSaveState.SAVED_LOCALLY,
        )
        assertFalse(captureHasUnsavedEdits(savedState))

        val editedState = savedState.copy(
            draft = captureState.draft.copy(observations = "Updated observations."),
        )
        assertTrue(captureHasUnsavedEdits(editedState))
    }

    @Test
    fun savingCaptureBlocksTheDiscardGuardUntilTheSaveSettles() {
        val captureState = referenceDefectiveAnchorState().copy(
            evidence = listOf(referenceDefectiveAnchorState().draft),
            saveState = EvidenceSaveState.SAVING,
        )

        assertTrue(captureHasUnsavedEdits(captureState))
    }

    private fun referenceAccount() = AccountSummary(
        companyId = "company-a",
        userId = "inspector-a",
        email = "inspector-a@example.test",
        role = ProductRole.INSPECTOR,
    )

    private fun draftFor(state: FieldUiState.JobPackOpened): AnchorInspectionDraft {
        val pack = state.opened.stored.pack
        return AnchorInspectionDraft(
            companyId = pack.companyId,
            jobId = pack.jobId,
            jobPackVersion = pack.jobPackVersion,
            inspectionId = "inspection-001",
            expectedAnchorId = pack.anchors.single().anchorId,
            createdAtEpochMillis = 1_000L,
        )
    }
}
