package au.com.heightsafety.app.icons

import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h891dp")
class HeightSafetyIconsScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun tileAndFreeVariantsRenderFromTheGeneratedVectors() {
        composeRule.setContent {
            IconSample()
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/height_safety_icons_grid.png")
    }
}

@Composable
private fun IconSample() {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .background(Color(0xFFF7F8FA))
            .padding(10.dp),
    ) {
        HeightSafetyIcons.all.chunked(6).forEach { rowEntries ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                rowEntries.forEach { entry ->
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Image(
                            imageVector = entry.tile,
                            contentDescription = null,
                            modifier = Modifier.size(32.dp),
                        )
                        Image(
                            imageVector = entry.free,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }
            }
        }
    }
}
