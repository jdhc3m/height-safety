package au.com.heightsafety.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class DebugDemoActivityTest {
    @get:Rule
    val composeTestRule = createAndroidComposeRule<DebugDemoActivity>()

    @Test
    fun startsAtTemporaryCompanyIdLogin() {
        composeTestRule.onNodeWithText(
            "Temporary demo login: enter company ID aaa.",
        ).assertIsDisplayed()
        composeTestRule.onNodeWithText("Company ID").assertIsDisplayed()
        composeTestRule.onNodeWithText("Sign in").assertIsDisplayed()
    }
}
