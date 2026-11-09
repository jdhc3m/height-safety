package au.com.heightsafety.app.icons

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class HeightSafetyIconsInstrumentedTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun tileAndFreeVariantsComposeAndDisplay() {
        composeTestRule.setContent {
            Row {
                Icon(
                    imageVector = HeightSafetyIcons.JobsTile,
                    contentDescription = "Jobs tile icon",
                    modifier = Modifier.size(32.dp),
                )
                Icon(
                    imageVector = HeightSafetyIcons.JobsFree,
                    contentDescription = "Jobs free icon",
                    modifier = Modifier.size(24.dp),
                )
                Icon(
                    imageVector = HeightSafetyIcons.ServiceableTile,
                    contentDescription = "Serviceable tile icon",
                    modifier = Modifier.size(32.dp),
                )
                Icon(
                    imageVector = HeightSafetyIcons.DefectiveFree,
                    contentDescription = "Defective free icon",
                    modifier = Modifier.size(24.dp),
                )
            }
        }
        composeTestRule.onNodeWithContentDescription("Jobs tile icon").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Jobs free icon").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Serviceable tile icon").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Defective free icon").assertIsDisplayed()
    }

    @Test
    fun everyIconBuildsBothVariantsFromTheFullSet() {
        assertEquals(39, HeightSafetyIcons.all.size)
        HeightSafetyIcons.all.forEach { entry ->
            assertEquals("${entry.slug} tile viewport", 24f, entry.tile.viewportWidth)
            assertEquals("${entry.slug} free viewport", 24f, entry.free.viewportWidth)
        }
    }
}
