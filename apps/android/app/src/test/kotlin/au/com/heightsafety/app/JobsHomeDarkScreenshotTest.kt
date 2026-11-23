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
 * Dark phone screenshots for the T4 Jobs home and job checklist. The night
 * qualifier drives the shell theme, which reads the system dark setting.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h891dp-night")
class JobsHomeDarkScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun jobsHomeDarkMatchesIntent() {
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
            .captureRoboImage("src/test/screenshots/jobs_home_dark.png")
    }

    @Test
    fun jobChecklistDarkMatchesIntent() {
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
            .captureRoboImage("src/test/screenshots/job_checklist_dark.png")
    }
}
