package au.com.heightsafety.app

import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import au.com.heightsafety.app.theme.HeightSafetyLightSemanticColors
import au.com.heightsafety.app.theme.HeightSafetyTheme

// Compatibility entry points while the field screens move off the old
// Signal Field theme. Both delegate to the token-driven HeightSafetyTheme.
@Deprecated("Use HeightSafetyTheme", ReplaceWith("HeightSafetyTheme(content)"))
@Composable
fun SignalFieldTheme(content: @Composable () -> Unit) {
    HeightSafetyTheme(content = content)
}

// Legacy static access kept for existing screens that read accents outside a
// theme-aware slot. Values are derived from the generated light tokens; new
// screens should read LocalHeightSafetySemanticColors instead.
object SignalSemanticColors {
    val success = HeightSafetyLightSemanticColors.success
    val successContainer = HeightSafetyLightSemanticColors.successContainer
    val onSuccessContainer = HeightSafetyLightSemanticColors.onSuccessContainer
    val warning = HeightSafetyLightSemanticColors.warning
    val warningContainer = HeightSafetyLightSemanticColors.warningContainer
    val onWarningContainer = HeightSafetyLightSemanticColors.onWarningContainer
    val danger = HeightSafetyLightSemanticColors.danger
    val dangerContainer = HeightSafetyLightSemanticColors.dangerContainer
    val onDangerContainer = HeightSafetyLightSemanticColors.onDangerContainer
    val discovery = HeightSafetyLightSemanticColors.discovery
    val discoveryContainer = HeightSafetyLightSemanticColors.discoveryContainer
    val onDiscoveryContainer = HeightSafetyLightSemanticColors.onDiscoveryContainer
}

fun ComponentActivity.enableSignalFieldEdgeToEdge() {
    enableEdgeToEdge(
        statusBarStyle = SystemBarStyle.light(
            android.graphics.Color.TRANSPARENT,
            android.graphics.Color.TRANSPARENT,
        ),
        navigationBarStyle = SystemBarStyle.light(
            android.graphics.Color.TRANSPARENT,
            android.graphics.Color.TRANSPARENT,
        ),
    )
}
