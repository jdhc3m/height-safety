package au.com.heightsafety.app.theme

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.VectorPath
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
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
    fun lightContactSheetMatchesBaseline() {
        composeRule.setContent {
            ContactSheet(darkTheme = false)
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/height_safety_icons_light.png")
    }

    @Test
    fun darkContactSheetMatchesBaseline() {
        composeRule.setContent {
            ContactSheet(darkTheme = true)
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/height_safety_icons_dark.png")
    }

    @Test
    fun everyCoreIconHasTileAndFreeVariants() {
        assertTrue(HeightSafetyIcon.entries.size >= 11)
        for (icon in HeightSafetyIcon.entries) {
            val free = HeightSafetyIcons.freeVectorFor(icon)
            val tile = HeightSafetyIcons.tileVectorFor(icon)
            assertTrue(icon.label, free.pathCount() >= 1)
            assertTrue(icon.label, tile.pathCount() >= 2)
            assertEquals(icon.label, icon.tileColor, tile.tileFillColor())
        }
    }

    @Test
    fun tileVariantsPaintTheGlyphWhite() {
        for (icon in HeightSafetyIcon.entries) {
            val tile = HeightSafetyIcons.tileVectorFor(icon)
            val glyphPaths = tile.paths().drop(1)
            assertTrue(icon.label, glyphPaths.isNotEmpty())
            assertTrue(
                icon.label,
                glyphPaths.any { path ->
                    path.isWhiteFill() || path.isWhiteStroke()
                },
            )
        }
    }

    @Test
    fun reviewQueueTickIsWhiteInFreeAndTileColouredInTile() {
        val free = HeightSafetyIcons.freeVectorFor(HeightSafetyIcon.ReviewQueue)
        val markPaths = free.paths().filter { it.roleName()?.endsWith("Mark") == true }
        assertTrue(markPaths.isNotEmpty())
        assertTrue(markPaths.all { it.isWhiteFill() || it.isWhiteStroke() })

        val tile = HeightSafetyIcons.tileVectorFor(HeightSafetyIcon.ReviewQueue)
        val tileMarks = tile.paths().filter { it.roleName()?.endsWith("Mark") == true }
        assertTrue(tileMarks.isNotEmpty())
        assertTrue(
            tileMarks.all { path ->
                (path.fill as? SolidColor)?.value == HeightSafetyIcon.ReviewQueue.tileColor ||
                    (path.stroke as? SolidColor)?.value == HeightSafetyIcon.ReviewQueue.tileColor
            },
        )
    }
}

private fun ImageVector.pathCount(): Int = paths().size

private fun ImageVector.paths(): List<VectorPath> =
    root.let { group ->
        buildList {
            group.asIterable().forEach { node ->
                if (node is VectorPath) add(node)
            }
        }
    }

private fun VectorPath.roleName(): String? = name

private fun VectorPath.isWhiteFill(): Boolean =
    (fill as? SolidColor)?.value == Color(0xFFFFFFFF)

private fun VectorPath.isWhiteStroke(): Boolean =
    (stroke as? SolidColor)?.value == Color(0xFFFFFFFF)

private fun ImageVector.tileFillColor(): Color =
    (paths().first().fill as? SolidColor)?.value
        ?: error("tile vector has no filled background path")

@Composable
private fun ContactSheet(darkTheme: Boolean) {
    HeightSafetyTheme(darkTheme = darkTheme) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                HeightSafetyIcon.entries.forEach { icon ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        HeightSafetyIconTile(
                            icon = icon,
                            contentDescription = null,
                            size = 40.dp,
                        )
                        HeightSafetyIconTile(
                            icon = icon,
                            contentDescription = null,
                            size = 24.dp,
                        )
                        HeightSafetyFreeGlyph(
                            icon = icon,
                            contentDescription = null,
                            size = 24.dp,
                        )
                        HeightSafetyFreeGlyph(
                            icon = icon,
                            contentDescription = null,
                            size = 16.dp,
                        )
                        Text(
                            text = icon.label,
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                }
            }
        }
    }
}
