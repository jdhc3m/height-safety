package au.com.heightsafety.app

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import au.com.heightsafety.app.theme.HeightSafetyTheme
import au.com.heightsafety.domain.EvidenceSyncState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * JVM coverage for the navigation shell: the state-implied destinations, the
 * tab bar reachability, the sync badge and the capture discard guard. The
 * instrumented suite (FieldScreenTest) repeats these on a device.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35])
class FieldNavShellTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun tabsReachSyncAccountAndJobsRoots() {
        composeRule.setContent {
            HeightSafetyTheme {
                FieldScreen(
                    state = FieldUiState.JobsLoaded(
                        FieldNavShellTestFixtures.referenceAccount(),
                        listOf(FieldNavShellTestFixtures.referenceJob()),
                    ),
                    onSignIn = {},
                    onRetry = {},
                    onRefresh = {},
                    onSignOut = {},
                )
            }
        }

        composeRule.onNodeWithText("JOB-001").assertIsDisplayed()

        composeRule.onNodeWithText("Sync").performClick()
        composeRule.onNodeWithText(
            "Records saved on this device appear here while they send. Server acknowledgement is shown per record.",
        ).assertIsDisplayed()

        composeRule.onNodeWithText("Account").performClick()
        composeRule.onNodeWithText("Role: Inspector").assertIsDisplayed()

        composeRule.onNodeWithText("Jobs").performClick()
        composeRule.onNodeWithText("JOB-001").assertIsDisplayed()
    }

    @Test
    fun syncBadgeShowsUnsentCountsWhileAJobPackIsOpen() {
        composeRule.setContent {
            HeightSafetyTheme {
                FieldScreen(
                    state = FieldNavShellTestFixtures.referenceJobPackOpenedState().copy(
                        evidence = listOf(
                            FieldNavShellTestFixtures.referenceDraft()
                                .copy(syncState = EvidenceSyncState.LOCAL),
                        ),
                    ),
                    onSignIn = {},
                    onRetry = {},
                    onRefresh = {},
                    onSignOut = {},
                )
            }
        }

        composeRule.onNodeWithText("Job pack").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Unsent records: 1", useUnmergedTree = true)
            .assertIsDisplayed()
    }

    @Test
    fun jobPackBackClosesThroughTheStateAction() {
        var packClosed = false
        composeRule.setContent {
            HeightSafetyTheme {
                FieldScreen(
                    state = FieldNavShellTestFixtures.referenceJobPackOpenedState(),
                    onSignIn = {},
                    onRetry = {},
                    onRefresh = {},
                    onSignOut = {},
                    onCloseJobPack = { packClosed = true },
                )
            }
        }

        composeRule.onNodeWithText("Job pack").assertIsDisplayed()
        composeRule.activity.onBackPressedDispatcher.onBackPressed()

        assertTrue(packClosed)
    }

    @Test
    fun unsavedCaptureBackShowsTheDiscardGuard() {
        var captureClosed = false
        composeRule.setContent {
            HeightSafetyTheme {
                FieldScreen(
                    state = FieldNavShellTestFixtures.anchorCaptureState(),
                    onSignIn = {},
                    onRetry = {},
                    onRefresh = {},
                    onSignOut = {},
                    onCloseAnchor = { captureClosed = true },
                )
            }
        }

        composeRule.onNodeWithText("Anchor capture").assertIsDisplayed()
        composeRule.activity.onBackPressedDispatcher.onBackPressed()

        composeRule.onNodeWithText("Discard changes?").assertIsDisplayed()
        composeRule.onNodeWithText("Keep editing").performClick()
        assertFalse(captureClosed)

        composeRule.activity.onBackPressedDispatcher.onBackPressed()
        composeRule.onNodeWithText("Discard").performClick()

        assertTrue(captureClosed)
    }

    @Test
    fun savedCaptureClosesOnBackWithoutTheDiscardGuard() {
        var captureClosed = false
        val capture = FieldNavShellTestFixtures.anchorCaptureState().copy(
            evidence = listOf(FieldNavShellTestFixtures.anchorCaptureState().draft),
            saveState = EvidenceSaveState.SAVED_LOCALLY,
        )
        composeRule.setContent {
            HeightSafetyTheme {
                FieldScreen(
                    state = capture,
                    onSignIn = {},
                    onRetry = {},
                    onRefresh = {},
                    onSignOut = {},
                    onCloseAnchor = { captureClosed = true },
                )
            }
        }

        composeRule.onNodeWithText("Anchor capture").assertIsDisplayed()
        composeRule.activity.onBackPressedDispatcher.onBackPressed()

        assertTrue(captureClosed)
    }

    @Test
    fun signedOutStateNeverShowsTheTabBar() {
        composeRule.setContent {
            HeightSafetyTheme {
                FieldScreen(
                    state = FieldUiState.SignedOut,
                    onSignIn = {},
                    onRetry = {},
                    onRefresh = {},
                    onSignOut = {},
                )
            }
        }

        composeRule.onNodeWithText("Inspector sign-in").assertIsDisplayed()
        composeRule.onNodeWithText("Sync").assertDoesNotExist()
    }
}
