package au.com.heightsafety.app

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Phone screenshots for the T4 Jobs home and job checklist
 * (DESIGN.md §6.1). Baselines are committed and gated through
 * `tools/android-theme.sh --check` in the root verify command. Dark variants
 * live in JobsHomeDarkScreenshotTest because the field shell applies its own
 * theme from the system dark setting.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h891dp")
class JobsHomeScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun jobsHomeLightMatchesIntent() {
        composeRule.setContent {
            FieldScreen(
                state = JobsHomeScreenshotFixtures.jobsHomeState(),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/jobs_home_light.png")
    }

    @Test
    fun jobChecklistLightMatchesIntent() {
        composeRule.setContent {
            FieldScreen(
                state = JobsHomeScreenshotFixtures.checklistState(),
                onSignIn = {},
                onRetry = {},
                onRefresh = {},
                onSignOut = {},
            )
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/job_checklist_light.png")
    }
}
