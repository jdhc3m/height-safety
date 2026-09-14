package au.com.heightsafety.app

import android.graphics.Color as AndroidColor
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape

private val SignalFieldLightColors = lightColorScheme(
    // Blue Horizon: deep ocean blue, balanced with teal information states
    // and purple discovery states from the reviewed mobile visual direction.
    primary = Color(0xFF1558B0),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE5EFFF),
    onPrimaryContainer = Color(0xFF092E67),
    secondary = Color(0xFF006E70),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD5F3F0),
    onSecondaryContainer = Color(0xFF003735),
    tertiary = Color(0xFF65429A),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFEEE5FB),
    onTertiaryContainer = Color(0xFF27134E),
    background = Color(0xFFF4F8FD),
    onBackground = Color(0xFF142235),
    surface = Color.White,
    onSurface = Color(0xFF142235),
    surfaceVariant = Color(0xFFE9F1F8),
    onSurfaceVariant = Color(0xFF4D6175),
    outline = Color(0xFF567087),
    outlineVariant = Color(0xFFC1CFDB),
    error = Color(0xFFB3261E),
    onError = Color.White,
    errorContainer = Color(0xFFF9DEDC),
    onErrorContainer = Color(0xFF410E0B),
)

object SignalSemanticColors {
    val success = Color(0xFF176B49)
    val successContainer = Color(0xFFD7F2E3)
    val onSuccessContainer = Color(0xFF073B28)
    val warning = Color(0xFF7A4E00)
    val warningContainer = Color(0xFFFFF1C7)
    val onWarningContainer = Color(0xFF3C2800)
    val danger = Color(0xFFB3261E)
    val dangerContainer = Color(0xFFF9DEDC)
    val onDangerContainer = Color(0xFF410E0B)
    val discovery = Color(0xFF65429A)
    val discoveryContainer = Color(0xFFEEE5FB)
    val onDiscoveryContainer = Color(0xFF27134E)
}

private val SignalFieldShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
)

fun ComponentActivity.enableSignalFieldEdgeToEdge() {
    enableEdgeToEdge(
        statusBarStyle = SystemBarStyle.light(
            AndroidColor.TRANSPARENT,
            AndroidColor.TRANSPARENT,
        ),
        navigationBarStyle = SystemBarStyle.light(
            AndroidColor.TRANSPARENT,
            AndroidColor.TRANSPARENT,
        ),
    )
}

@Composable
fun SignalFieldTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SignalFieldLightColors,
        shapes = SignalFieldShapes,
        content = content,
    )
}
