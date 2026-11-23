package au.com.heightsafety.app.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Derived support colours are mixed from the generated tokens only; no new
// palette hexes are introduced here. The brand primary token is the design
// seed #1D7AFC.
private fun blend(foreground: Color, background: Color, fraction: Float): Color {
    val amount = fraction.coerceIn(0f, 1f)
    fun channel(fg: Float, bg: Float) = fg * (1f - amount) + bg * amount
    return Color(
        red = channel(foreground.red, background.red),
        green = channel(foreground.green, background.green),
        blue = channel(foreground.blue, background.blue),
        alpha = 1f,
    )
}

private fun lighten(color: Color, fraction: Float) = blend(color, Color.White, fraction)

private fun darken(color: Color, fraction: Float) = blend(color, Color.Black, fraction)

val HeightSafetyLightColors: ColorScheme = lightColorScheme(
    primary = DesignTokens.LightColors.brandPrimary,
    onPrimary = DesignTokens.LightColors.surface,
    primaryContainer = lighten(DesignTokens.LightColors.brandPrimary, 0.85f),
    onPrimaryContainer = darken(DesignTokens.LightColors.brandPrimary, 0.68f),
    secondary = DesignTokens.LightColors.teal,
    onSecondary = DesignTokens.LightColors.surface,
    secondaryContainer = lighten(DesignTokens.LightColors.teal, 0.85f),
    onSecondaryContainer = darken(DesignTokens.LightColors.tealBold, 0.35f),
    tertiary = DesignTokens.LightColors.purple,
    onTertiary = DesignTokens.LightColors.surface,
    tertiaryContainer = lighten(DesignTokens.LightColors.purple, 0.85f),
    onTertiaryContainer = darken(DesignTokens.LightColors.purpleBold, 0.45f),
    background = DesignTokens.LightColors.background,
    onBackground = DesignTokens.LightColors.textPrimary,
    surface = DesignTokens.LightColors.surface,
    onSurface = DesignTokens.LightColors.textPrimary,
    surfaceVariant = blend(
        DesignTokens.LightColors.surface,
        DesignTokens.LightColors.textSecondary,
        0.10f,
    ),
    onSurfaceVariant = DesignTokens.LightColors.textSecondary,
    outline = blend(DesignTokens.LightColors.textSecondary, DesignTokens.LightColors.surface, 0.45f),
    outlineVariant = blend(
        DesignTokens.LightColors.textSecondary,
        DesignTokens.LightColors.surface,
        0.78f,
    ),
    error = DesignTokens.LightColors.red,
    onError = DesignTokens.LightColors.surface,
    errorContainer = lighten(DesignTokens.LightColors.red, 0.88f),
    onErrorContainer = darken(DesignTokens.LightColors.redBold, 0.45f),
)

val HeightSafetyDarkColors: ColorScheme = darkColorScheme(
    primary = DesignTokens.DarkColors.brandPrimary,
    onPrimary = DesignTokens.DarkColors.surface,
    primaryContainer = darken(DesignTokens.DarkColors.brandPrimary, 0.55f),
    onPrimaryContainer = lighten(DesignTokens.DarkColors.brandPrimary, 0.55f),
    secondary = DesignTokens.DarkColors.teal,
    onSecondary = DesignTokens.DarkColors.surface,
    secondaryContainer = darken(DesignTokens.DarkColors.teal, 0.55f),
    onSecondaryContainer = lighten(DesignTokens.DarkColors.teal, 0.55f),
    tertiary = DesignTokens.DarkColors.purple,
    onTertiary = DesignTokens.DarkColors.surface,
    tertiaryContainer = darken(DesignTokens.DarkColors.purple, 0.60f),
    onTertiaryContainer = lighten(DesignTokens.DarkColors.purple, 0.55f),
    background = DesignTokens.DarkColors.background,
    onBackground = DesignTokens.DarkColors.textPrimary,
    surface = DesignTokens.DarkColors.surface,
    onSurface = DesignTokens.DarkColors.textPrimary,
    surfaceVariant = blend(
        DesignTokens.DarkColors.surface,
        DesignTokens.DarkColors.textSecondary,
        0.10f,
    ),
    onSurfaceVariant = DesignTokens.DarkColors.textSecondary,
    outline = blend(DesignTokens.DarkColors.textSecondary, DesignTokens.DarkColors.surface, 0.55f),
    outlineVariant = blend(
        DesignTokens.DarkColors.textSecondary,
        DesignTokens.DarkColors.surface,
        0.25f,
    ),
    error = DesignTokens.DarkColors.red,
    onError = DesignTokens.DarkColors.surface,
    errorContainer = darken(DesignTokens.DarkColors.red, 0.70f),
    onErrorContainer = lighten(DesignTokens.DarkColors.red, 0.60f),
)

// Fixed-meaning outcome and status accents. Outcome colours come from the
// generated tokens and are identical across light and dark; containers are
// derived from the same tokens per mode.
data class HeightSafetySemanticColors(
    val success: Color,
    val successContainer: Color,
    val onSuccessContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val onWarningContainer: Color,
    val danger: Color,
    val dangerContainer: Color,
    val onDangerContainer: Color,
    val discovery: Color,
    val discoveryContainer: Color,
    val onDiscoveryContainer: Color,
)

val HeightSafetyLightSemanticColors = HeightSafetySemanticColors(
    success = DesignTokens.LightColors.greenBold,
    successContainer = lighten(DesignTokens.LightColors.green, 0.85f),
    onSuccessContainer = darken(DesignTokens.LightColors.greenBold, 0.30f),
    warning = darken(DesignTokens.LightColors.yellowBold, 0.55f),
    warningContainer = lighten(DesignTokens.LightColors.yellow, 0.80f),
    onWarningContainer = darken(DesignTokens.LightColors.yellowBold, 0.70f),
    danger = DesignTokens.LightColors.red,
    dangerContainer = lighten(DesignTokens.LightColors.red, 0.88f),
    onDangerContainer = darken(DesignTokens.LightColors.redBold, 0.45f),
    discovery = DesignTokens.LightColors.purpleBold,
    discoveryContainer = lighten(DesignTokens.LightColors.purple, 0.85f),
    onDiscoveryContainer = darken(DesignTokens.LightColors.purpleBold, 0.45f),
)

val HeightSafetyDarkSemanticColors = HeightSafetySemanticColors(
    success = DesignTokens.DarkColors.green,
    successContainer = darken(DesignTokens.DarkColors.green, 0.55f),
    onSuccessContainer = lighten(DesignTokens.DarkColors.green, 0.35f),
    warning = DesignTokens.DarkColors.yellow,
    warningContainer = darken(DesignTokens.DarkColors.yellow, 0.55f),
    onWarningContainer = lighten(DesignTokens.DarkColors.yellow, 0.15f),
    danger = DesignTokens.DarkColors.red,
    dangerContainer = darken(DesignTokens.DarkColors.red, 0.55f),
    onDangerContainer = lighten(DesignTokens.DarkColors.red, 0.35f),
    discovery = DesignTokens.DarkColors.purple,
    discoveryContainer = darken(DesignTokens.DarkColors.purple, 0.55f),
    onDiscoveryContainer = lighten(DesignTokens.DarkColors.purple, 0.35f),
)

val LocalHeightSafetySemanticColors = staticCompositionLocalOf<HeightSafetySemanticColors> {
    error("HeightSafetySemanticColors is provided by HeightSafetyTheme")
}

// Field typography minimums come from the generated type tokens:
// bodyLarge is at least 16sp and titleLarge is 22sp for anchor labels.
val HeightSafetyTypography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = DesignTokens.TypeScale.androidBodyLargeSp.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = DesignTokens.TypeScale.androidTitleLargeSp.sp,
        lineHeight = 28.sp,
    ),
)

private val HeightSafetyShapes = Shapes(
    small = RoundedCornerShape(DesignTokens.Radii.chip),
    medium = RoundedCornerShape(DesignTokens.Radii.card),
    large = RoundedCornerShape(DesignTokens.Radii.card),
)

@Composable
fun HeightSafetyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) HeightSafetyDarkColors else HeightSafetyLightColors
    val semanticColors = if (darkTheme) {
        HeightSafetyDarkSemanticColors
    } else {
        HeightSafetyLightSemanticColors
    }
    CompositionLocalProvider(LocalHeightSafetySemanticColors provides semanticColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = HeightSafetyTypography,
            shapes = HeightSafetyShapes,
            content = content,
        )
    }
}
