package au.com.heightsafety.app.theme

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.sp
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
class HeightSafetyThemeScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun lightSchemeMatchesTokenBaseline() {
        composeRule.setContent {
            ThemeSample(darkTheme = false)
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/height_safety_theme_light.png")
    }

    @Test
    fun darkSchemeMatchesTokenBaseline() {
        composeRule.setContent {
            ThemeSample(darkTheme = true)
        }
        composeRule.onRoot()
            .captureRoboImage("src/test/screenshots/height_safety_theme_dark.png")
    }

    @Test
    fun lightSchemeRolesComeFromGeneratedTokens() {
        assertEquals(DesignTokens.LightColors.brandPrimary, HeightSafetyLightColors.primary)
        assertEquals(DesignTokens.LightColors.surface, HeightSafetyLightColors.surface)
        assertEquals(DesignTokens.LightColors.background, HeightSafetyLightColors.background)
        assertEquals(DesignTokens.LightColors.textPrimary, HeightSafetyLightColors.onSurface)
        assertEquals(DesignTokens.LightColors.textSecondary, HeightSafetyLightColors.onSurfaceVariant)
        assertEquals(DesignTokens.LightColors.teal, HeightSafetyLightColors.secondary)
        assertEquals(DesignTokens.LightColors.purple, HeightSafetyLightColors.tertiary)
        assertEquals(DesignTokens.LightColors.red, HeightSafetyLightColors.error)
    }

    @Test
    fun darkSchemeRolesComeFromGeneratedTokens() {
        assertEquals(DesignTokens.DarkColors.brandPrimary, HeightSafetyDarkColors.primary)
        assertEquals(DesignTokens.DarkColors.surface, HeightSafetyDarkColors.surface)
        assertEquals(DesignTokens.DarkColors.background, HeightSafetyDarkColors.background)
        assertEquals(DesignTokens.DarkColors.textPrimary, HeightSafetyDarkColors.onSurface)
        assertEquals(DesignTokens.DarkColors.textSecondary, HeightSafetyDarkColors.onSurfaceVariant)
        assertEquals(DesignTokens.DarkColors.teal, HeightSafetyDarkColors.secondary)
        assertEquals(DesignTokens.DarkColors.purple, HeightSafetyDarkColors.tertiary)
        assertEquals(DesignTokens.DarkColors.red, HeightSafetyDarkColors.error)
    }

    @Test
    fun typographyMeetsFieldMinimumsFromTokens() {
        assertEquals(
            DesignTokens.TypeScale.androidBodyLargeSp.sp,
            HeightSafetyTypography.bodyLarge.fontSize,
        )
        assertEquals(
            DesignTokens.TypeScale.androidTitleLargeSp.sp,
            HeightSafetyTypography.titleLarge.fontSize,
        )
        assertTrue(HeightSafetyTypography.bodyLarge.fontSize.value >= 16f)
        assertTrue(HeightSafetyTypography.titleLarge.fontSize.value >= 22f)
    }

    @Test
    fun outcomeAccentsStayFixedAcrossModes() {
        assertEquals(DesignTokens.LightColors.green, HeightSafetyDarkSemanticColors.success)
        assertEquals(DesignTokens.LightColors.yellow, HeightSafetyDarkSemanticColors.warning)
        assertEquals(DesignTokens.LightColors.red, HeightSafetyDarkSemanticColors.danger)
        assertEquals(DesignTokens.LightColors.purple, HeightSafetyDarkSemanticColors.discovery)
    }
}

@Composable
private fun ThemeSample(darkTheme: Boolean) {
    HeightSafetyTheme(darkTheme = darkTheme) {
        val semanticColors = LocalHeightSafetySemanticColors.current
        Surface(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.padding(DesignTokens.Spacing.pageMarginPhone)) {
                Text(
                    text = "Anchor ANC-0013",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = "Parapet north A3",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    shape = MaterialTheme.shapes.medium,
                    modifier = Modifier.padding(vertical = DesignTokens.Spacing.grid),
                ) {
                    Text(
                        text = "Saved on device",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(DesignTokens.Spacing.grid),
                    )
                }
                Row {
                    Surface(
                        color = semanticColors.successContainer,
                        contentColor = semanticColors.onSuccessContainer,
                        shape = MaterialTheme.shapes.small,
                    ) {
                        Text(
                            text = "Serviceable",
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.padding(DesignTokens.Spacing.grid),
                        )
                    }
                    Surface(
                        color = semanticColors.dangerContainer,
                        contentColor = semanticColors.onDangerContainer,
                        shape = MaterialTheme.shapes.small,
                    ) {
                        Text(
                            text = "Defective",
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.padding(DesignTokens.Spacing.grid),
                        )
                    }
                }
                Button(onClick = {}) {
                    Text(
                        text = "Next anchor",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
            }
        }
    }
}
