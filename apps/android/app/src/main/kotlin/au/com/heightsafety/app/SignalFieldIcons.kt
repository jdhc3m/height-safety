package au.com.heightsafety.app

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics

/**
 * Filled, multi-colour symbols used by the field UI.
 *
 * These are deliberately local vector drawings rather than copied third-party
 * artwork. Keeping the shapes here makes the colour treatment consistent with
 * Blue Horizon while keeping the app's icon assets editable and auditable.
 */
internal enum class SignalGlyph {
    Industry,
    RoofAnchor,
    Pack,
    Location,
    AddLocation,
    Person,
    Calendar,
    Camera,
    CloudCheck,
    CloudUpload,
    Info,
    Check,
    Lock,
    Queue,
    Note,
    DeviceSave,
    Warning,
    Search,
    Replace,
    Duplicate,
    Visibility,
    ArrowBack,
    ArrowForward,
    Refresh,
}

@Composable
internal fun SignalGlyphIcon(
    glyph: SignalGlyph,
    modifier: Modifier = Modifier,
    tint: Color? = null,
    contentDescription: String? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val ink = tint ?: when (glyph) {
        SignalGlyph.Pack,
        SignalGlyph.Note,
        -> scheme.tertiary
        SignalGlyph.Warning -> SignalSemanticColors.warning
        SignalGlyph.Check -> SignalSemanticColors.success
        SignalGlyph.CloudCheck,
        SignalGlyph.Location,
        SignalGlyph.AddLocation,
        SignalGlyph.Person,
        -> scheme.secondary
        else -> scheme.primary
    }
    val semanticsModifier = if (contentDescription == null) {
        modifier
    } else {
        modifier.semantics { this.contentDescription = contentDescription }
    }

    androidx.compose.foundation.Canvas(modifier = semanticsModifier) {
        if (size.width > 0f && size.height > 0f) {
            // Draw in a stable 24x24 coordinate space. The default scale pivot
            // is the canvas centre, which would crop these coordinates on a
            // density-scaled Android device.
            scale(
                scaleX = size.width / 24f,
                scaleY = size.height / 24f,
                pivot = Offset.Zero,
            ) {
                drawSignalGlyph(
                    glyph = glyph,
                    ink = ink,
                    accent = scheme.secondary,
                    blue = scheme.primary,
                    success = SignalSemanticColors.success,
                    warning = SignalSemanticColors.warning,
                )
            }
        }
    }
}

private fun DrawScope.drawSignalGlyph(
    glyph: SignalGlyph,
    ink: Color,
    accent: Color,
    blue: Color,
    success: Color,
    warning: Color,
) {
    when (glyph) {
        SignalGlyph.Industry -> drawIndustry(ink = ink, accent = accent)
        SignalGlyph.RoofAnchor -> drawRoofAnchor(ink = ink, accent = accent)
        SignalGlyph.Pack -> drawPack(ink = ink, accent = blue)
        SignalGlyph.Location -> drawLocation(ink = ink, accent = accent)
        SignalGlyph.AddLocation -> drawAddLocation(ink = ink, accent = accent)
        SignalGlyph.Person -> drawPerson(ink = ink, accent = accent)
        SignalGlyph.Calendar -> drawCalendar(ink = ink, accent = accent)
        SignalGlyph.Camera -> drawCamera(ink = ink, accent = accent)
        SignalGlyph.CloudCheck -> drawCloudCheck(ink = ink, accent = accent)
        SignalGlyph.CloudUpload -> drawCloudUpload(ink = ink, accent = accent)
        SignalGlyph.Info -> drawInfo(ink = ink, accent = accent)
        SignalGlyph.Check -> drawCheck(ink = ink, accent = accent, success = success)
        SignalGlyph.Lock -> drawLock(ink = ink, accent = accent)
        SignalGlyph.Queue -> drawQueue(ink = ink, accent = accent)
        SignalGlyph.Note -> drawNote(ink = ink, accent = accent)
        SignalGlyph.DeviceSave -> drawDeviceSave(ink = ink, accent = accent)
        SignalGlyph.Warning -> drawWarning(ink = ink, accent = accent, warning = warning)
        SignalGlyph.Search -> drawSearch(ink = ink, accent = accent)
        SignalGlyph.Replace -> drawReplace(ink = ink, accent = accent)
        SignalGlyph.Duplicate -> drawDuplicate(ink = ink, accent = accent)
        SignalGlyph.Visibility -> drawVisibility(ink = ink, accent = accent)
        SignalGlyph.ArrowBack -> drawArrowBack(ink = ink, accent = accent)
        SignalGlyph.ArrowForward -> drawArrowForward(ink = ink, accent = accent)
        SignalGlyph.Refresh -> drawRefresh(ink = ink, accent = accent)
    }
}

private fun DrawScope.roundRect(
    color: Color,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
    radius: Float = 1.5f,
) {
    drawRoundRect(
        color = color,
        topLeft = Offset(left, top),
        size = Size(right - left, bottom - top),
        cornerRadius = CornerRadius(radius, radius),
    )
}

private fun DrawScope.drawIndustry(ink: Color, accent: Color) {
    val building = Path().apply {
        moveTo(3f, 20f)
        lineTo(3f, 8.8f)
        lineTo(8f, 11.5f)
        lineTo(8f, 7f)
        lineTo(13f, 9.7f)
        lineTo(13f, 5.8f)
        lineTo(21f, 10.2f)
        lineTo(21f, 20f)
        close()
    }
    drawPath(building, ink)
    listOf(5f, 10f, 15f).forEach { left ->
        roundRect(accent, left, 13.2f, left + 2.1f, 15.8f, radius = .45f)
        roundRect(accent, left, 17f, left + 2.1f, 19.2f, radius = .45f)
    }
    roundRect(accent, 15.4f, 10.7f, 18.2f, 12.2f, radius = .4f)
}

private fun DrawScope.drawRoofAnchor(ink: Color, accent: Color) {
    drawCircle(color = ink, radius = 3.2f, center = Offset(12f, 4.5f))
    drawCircle(color = Color.White, radius = 1.25f, center = Offset(12f, 4.5f))
    roundRect(ink, 10.35f, 4.5f, 13.65f, 17f, radius = 1.25f)

    val arms = Path().apply {
        moveTo(4f, 12.8f)
        cubicTo(4f, 17.8f, 7.55f, 21f, 12f, 21f)
        cubicTo(16.45f, 21f, 20f, 17.8f, 20f, 12.8f)
        lineTo(17f, 12.8f)
        cubicTo(17f, 16.1f, 14.8f, 18.1f, 12f, 18.1f)
        cubicTo(9.2f, 18.1f, 7f, 16.1f, 7f, 12.8f)
        close()
    }
    drawPath(arms, ink)
    roundRect(accent, 4.8f, 10.2f, 19.2f, 12.5f, radius = 1.1f)
    roundRect(ink, 6f, 19f, 18f, 21.4f, radius = .8f)
}

private fun DrawScope.drawPack(ink: Color, accent: Color) {
    val body = Path().apply {
        moveTo(12f, 2.6f)
        lineTo(20.5f, 7.2f)
        lineTo(20.5f, 17f)
        lineTo(12f, 21.4f)
        lineTo(3.5f, 17f)
        lineTo(3.5f, 7.2f)
        close()
    }
    drawPath(body, ink)
    val top = Path().apply {
        moveTo(12f, 2.6f)
        lineTo(20.5f, 7.2f)
        lineTo(12f, 11.7f)
        lineTo(3.5f, 7.2f)
        close()
    }
    drawPath(top, accent)
    roundRect(Color.White, 10.9f, 10.4f, 13.1f, 20.2f, radius = .7f)
    roundRect(ink, 10.2f, 5.8f, 13.8f, 7.2f, radius = .55f)
}

private fun DrawScope.drawLocation(ink: Color, accent: Color) {
    val marker = Path().apply {
        moveTo(12f, 21.5f)
        cubicTo(10.2f, 18.4f, 5.3f, 14.5f, 5.3f, 9.5f)
        cubicTo(5.3f, 5.25f, 8.2f, 2.5f, 12f, 2.5f)
        cubicTo(15.8f, 2.5f, 18.7f, 5.25f, 18.7f, 9.5f)
        cubicTo(18.7f, 14.5f, 13.8f, 18.4f, 12f, 21.5f)
        close()
    }
    drawPath(marker, ink)
    drawCircle(color = Color.White, radius = 3f, center = Offset(12f, 9.3f))
    drawCircle(color = accent, radius = 1.45f, center = Offset(12f, 9.3f))
}

private fun DrawScope.drawAddLocation(ink: Color, accent: Color) {
    drawLocation(ink, accent)
    roundRect(Color.White, 11.15f, 6.15f, 12.85f, 12.45f, radius = .7f)
    roundRect(Color.White, 8.7f, 8.45f, 15.3f, 10.15f, radius = .7f)
}

private fun DrawScope.drawPerson(ink: Color, accent: Color) {
    drawCircle(color = ink, radius = 3f, center = Offset(12f, 7f))
    val body = Path().apply {
        moveTo(5.2f, 20.3f)
        cubicTo(5.7f, 15.6f, 8.2f, 13.2f, 12f, 13.2f)
        cubicTo(15.8f, 13.2f, 18.3f, 15.6f, 18.8f, 20.3f)
        close()
    }
    drawPath(body, ink)
    roundRect(accent, 9.7f, 14.9f, 14.3f, 16.7f, radius = .85f)
}

private fun DrawScope.drawCalendar(ink: Color, accent: Color) {
    roundRect(ink, 3f, 4.5f, 21f, 20.5f, radius = 2f)
    roundRect(Color.White, 5.3f, 8.5f, 18.7f, 18.2f, radius = .8f)
    roundRect(accent, 6.6f, 2.5f, 9f, 7.2f, radius = 1.1f)
    roundRect(accent, 15f, 2.5f, 17.4f, 7.2f, radius = 1.1f)
    roundRect(ink, 7f, 10.5f, 10.1f, 12.2f, radius = .4f)
    roundRect(accent, 11f, 10.5f, 14.1f, 12.2f, radius = .4f)
    roundRect(ink, 15f, 10.5f, 17.1f, 12.2f, radius = .4f)
    roundRect(accent, 7f, 14.1f, 10.1f, 15.8f, radius = .4f)
    roundRect(ink, 11f, 14.1f, 14.1f, 15.8f, radius = .4f)
}

private fun DrawScope.drawCamera(ink: Color, accent: Color) {
    roundRect(ink, 3f, 7f, 21f, 19.8f, radius = 2.4f)
    roundRect(ink, 7f, 4.3f, 13.2f, 8.2f, radius = 1.1f)
    drawCircle(color = Color.White, radius = 5.2f, center = Offset(12f, 13.5f))
    drawCircle(color = accent, radius = 3.35f, center = Offset(12f, 13.5f))
    drawCircle(color = Color.White, radius = 1.1f, center = Offset(12.8f, 12.6f))
    drawCircle(color = accent, radius = 1.1f, center = Offset(17.5f, 10.5f))
}

private fun DrawScope.drawCloudCheck(ink: Color, accent: Color) {
    val cloud = Path().apply {
        moveTo(5.1f, 18.8f)
        cubicTo(2.8f, 18.8f, 2.2f, 15.3f, 4.7f, 14.4f)
        cubicTo(4.35f, 10.2f, 8.5f, 7.2f, 12.2f, 9.2f)
        cubicTo(14.8f, 6.1f, 20.8f, 8.15f, 20.3f, 12.6f)
        cubicTo(23.4f, 13.1f, 22.8f, 18.8f, 19.8f, 18.8f)
        close()
    }
    drawPath(cloud, ink)
    val check = Path().apply {
        moveTo(8.1f, 14.6f)
        lineTo(10.6f, 17.1f)
        lineTo(16.5f, 11.3f)
        lineTo(18.1f, 12.9f)
        lineTo(10.6f, 20.1f)
        lineTo(6.5f, 16f)
        close()
    }
    drawPath(check, Color.White)
    drawCircle(color = accent, radius = 1f, center = Offset(18.1f, 10.7f))
}

private fun DrawScope.drawCloudUpload(ink: Color, accent: Color) {
    val cloud = Path().apply {
        moveTo(5.1f, 19.4f)
        cubicTo(2.8f, 19.4f, 2.2f, 15.7f, 4.8f, 14.7f)
        cubicTo(4.35f, 10.5f, 8.5f, 7.5f, 12.2f, 9.5f)
        cubicTo(14.8f, 6.4f, 20.8f, 8.45f, 20.3f, 12.9f)
        cubicTo(23.4f, 13.4f, 22.8f, 19.4f, 19.8f, 19.4f)
        close()
    }
    drawPath(cloud, ink)
    roundRect(Color.White, 11f, 12.1f, 13f, 18.6f, radius = .7f)
    val arrow = Path().apply {
        moveTo(12f, 9.3f)
        lineTo(8.9f, 12.6f)
        lineTo(10.9f, 12.6f)
        lineTo(10.9f, 15f)
        lineTo(13.1f, 15f)
        lineTo(13.1f, 12.6f)
        lineTo(15.1f, 12.6f)
        close()
    }
    drawPath(arrow, accent)
}

private fun DrawScope.drawInfo(ink: Color, accent: Color) {
    drawCircle(color = ink, radius = 9.4f, center = Offset(12f, 12f))
    roundRect(Color.White, 10.9f, 10.4f, 13.1f, 18.1f, radius = .75f)
    drawCircle(color = Color.White, radius = 1.25f, center = Offset(12f, 6.8f))
    drawCircle(color = accent, radius = .9f, center = Offset(17.3f, 7.1f))
}

private fun DrawScope.drawCheck(ink: Color, accent: Color, success: Color) {
    val check = Path().apply {
        moveTo(3.7f, 12.7f)
        lineTo(7.5f, 16.5f)
        lineTo(17.9f, 6.1f)
        lineTo(21f, 9.2f)
        lineTo(7.5f, 22f)
        lineTo(1.4f, 15.8f)
        close()
    }
    drawPath(check, if (ink == Color.Unspecified) success else ink)
    drawCircle(color = accent, radius = 1f, center = Offset(19.2f, 5.4f))
}

private fun DrawScope.drawLock(ink: Color, accent: Color) {
    roundRect(ink, 5f, 10f, 19f, 21f, radius = 2f)
    roundRect(ink, 7.3f, 3.2f, 16.7f, 13.2f, radius = 4.5f)
    roundRect(Color.White, 9.8f, 6.1f, 14.2f, 12.8f, radius = 2.3f)
    roundRect(Color.White, 11.05f, 13.2f, 12.95f, 18.3f, radius = 1f)
    drawCircle(color = accent, radius = 1.1f, center = Offset(16.5f, 16.8f))
}

private fun DrawScope.drawQueue(ink: Color, accent: Color) {
    roundRect(ink, 3f, 4f, 21f, 7f, radius = 1.2f)
    roundRect(accent, 3f, 9.1f, 21f, 12.1f, radius = 1.2f)
    roundRect(ink, 3f, 14.2f, 21f, 17.2f, radius = 1.2f)
    roundRect(accent, 3f, 19.3f, 16f, 20.8f, radius = .75f)
}

private fun DrawScope.drawNote(ink: Color, accent: Color) {
    val page = Path().apply {
        moveTo(5f, 2.5f)
        lineTo(16f, 2.5f)
        lineTo(20f, 6.5f)
        lineTo(20f, 21.5f)
        lineTo(5f, 21.5f)
        close()
    }
    drawPath(page, ink)
    val fold = Path().apply {
        moveTo(16f, 2.5f)
        lineTo(16f, 6.5f)
        lineTo(20f, 6.5f)
        close()
    }
    drawPath(fold, accent)
    roundRect(Color.White, 8f, 10f, 17f, 11.5f, radius = .55f)
    roundRect(Color.White, 8f, 13.5f, 17f, 15f, radius = .55f)
    roundRect(Color.White, 8f, 17f, 14.5f, 18.5f, radius = .55f)
}

private fun DrawScope.drawDeviceSave(ink: Color, accent: Color) {
    roundRect(ink, 5f, 2f, 19f, 22f, radius = 2.4f)
    roundRect(Color.White, 7.4f, 5f, 16.6f, 15.5f, radius = 1f)
    roundRect(accent, 8.1f, 17.2f, 15.9f, 19.5f, radius = 1f)
    roundRect(ink, 10f, 6.8f, 14f, 8.1f, radius = .5f)
    drawCircle(color = Color.White, radius = .8f, center = Offset(12f, 20.1f))
}

private fun DrawScope.drawWarning(ink: Color, accent: Color, warning: Color) {
    val triangle = Path().apply {
        moveTo(12f, 2.2f)
        lineTo(22f, 20.5f)
        cubicTo(22.45f, 21.35f, 21.8f, 22f, 20.8f, 22f)
        lineTo(3.2f, 22f)
        cubicTo(2.2f, 22f, 1.55f, 21.35f, 2f, 20.5f)
        close()
    }
    drawPath(triangle, if (ink == Color.Unspecified) warning else ink)
    roundRect(Color.White, 10.9f, 8f, 13.1f, 15.3f, radius = 1f)
    drawCircle(color = Color.White, radius = 1.25f, center = Offset(12f, 18.2f))
    drawCircle(color = accent, radius = .7f, center = Offset(17.8f, 8.3f))
}

private fun DrawScope.drawSearch(ink: Color, accent: Color) {
    drawCircle(color = ink, radius = 7.2f, center = Offset(10.2f, 10.2f))
    drawCircle(color = Color.White, radius = 4.2f, center = Offset(10.2f, 10.2f))
    val handle = Path().apply {
        moveTo(15.2f, 15.2f)
        lineTo(20.8f, 20.8f)
        lineTo(18.9f, 22.7f)
        lineTo(13.3f, 17.1f)
        close()
    }
    drawPath(handle, accent)
}

private fun DrawScope.drawReplace(ink: Color, accent: Color) {
    val top = Path().apply {
        moveTo(3f, 8f)
        lineTo(17f, 8f)
        lineTo(14.5f, 5.5f)
        lineTo(17f, 3f)
        lineTo(22f, 8f)
        lineTo(17f, 13f)
        lineTo(14.5f, 10.5f)
        lineTo(16f, 9.2f)
        lineTo(3f, 9.2f)
        close()
    }
    drawPath(top, ink)
    val bottom = Path().apply {
        moveTo(21f, 16f)
        lineTo(7f, 16f)
        lineTo(9.5f, 13.5f)
        lineTo(7f, 11f)
        lineTo(2f, 16f)
        lineTo(7f, 21f)
        lineTo(9.5f, 18.5f)
        lineTo(8f, 17.2f)
        lineTo(21f, 17.2f)
        close()
    }
    drawPath(bottom, accent)
}

private fun DrawScope.drawDuplicate(ink: Color, accent: Color) {
    roundRect(accent, 8f, 3f, 20f, 17f, radius = 1.4f)
    roundRect(Color.White, 10.5f, 5.5f, 17.5f, 14.5f, radius = .5f)
    roundRect(ink, 4f, 7f, 16f, 21f, radius = 1.4f)
    roundRect(Color.White, 6.5f, 9.5f, 13.5f, 11f, radius = .45f)
    roundRect(Color.White, 6.5f, 13f, 13.5f, 14.5f, radius = .45f)
    roundRect(Color.White, 6.5f, 16.5f, 11.5f, 18f, radius = .45f)
}

private fun DrawScope.drawVisibility(ink: Color, accent: Color) {
    val eye = Path().apply {
        moveTo(2.5f, 12f)
        cubicTo(5.2f, 7.2f, 8.4f, 5.1f, 12f, 5.1f)
        cubicTo(15.6f, 5.1f, 18.8f, 7.2f, 21.5f, 12f)
        cubicTo(18.8f, 16.8f, 15.6f, 18.9f, 12f, 18.9f)
        cubicTo(8.4f, 18.9f, 5.2f, 16.8f, 2.5f, 12f)
        close()
    }
    drawPath(eye, ink)
    drawCircle(color = Color.White, radius = 4.4f, center = Offset(12f, 12f))
    drawCircle(color = accent, radius = 2.2f, center = Offset(12f, 12f))
}

private fun DrawScope.drawArrowBack(ink: Color, accent: Color) {
    val arrow = Path().apply {
        moveTo(3f, 12f)
        lineTo(10.2f, 4.8f)
        lineTo(12.5f, 7.1f)
        lineTo(9.2f, 10.4f)
        lineTo(21f, 10.4f)
        lineTo(21f, 13.6f)
        lineTo(9.2f, 13.6f)
        lineTo(12.5f, 16.9f)
        lineTo(10.2f, 19.2f)
        close()
    }
    drawPath(arrow, ink)
    drawCircle(color = accent, radius = 1f, center = Offset(18.5f, 8f))
}

private fun DrawScope.drawArrowForward(ink: Color, accent: Color) {
    val arrow = Path().apply {
        moveTo(3f, 10.4f)
        lineTo(14.8f, 10.4f)
        lineTo(11.5f, 7.1f)
        lineTo(13.8f, 4.8f)
        lineTo(21f, 12f)
        lineTo(13.8f, 19.2f)
        lineTo(11.5f, 16.9f)
        lineTo(14.8f, 13.6f)
        lineTo(3f, 13.6f)
        close()
    }
    drawPath(arrow, ink)
    drawCircle(color = accent, radius = 1f, center = Offset(5.5f, 16f))
}

private fun DrawScope.drawRefresh(ink: Color, accent: Color) {
    drawCircle(color = ink, radius = 9f, center = Offset(12f, 12f))
    drawCircle(color = Color.White, radius = 5.4f, center = Offset(12f, 12f))
    val arrow = Path().apply {
        moveTo(15.2f, 3.9f)
        lineTo(20.1f, 4.4f)
        lineTo(17.1f, 8.1f)
        lineTo(16.7f, 6.4f)
        cubicTo(14.4f, 5.2f, 11.6f, 5.2f, 9.5f, 6.7f)
        lineTo(8.1f, 4.4f)
        cubicTo(10.2f, 2.9f, 12.8f, 2.7f, 15.2f, 3.9f)
        close()
    }
    drawPath(arrow, accent)
    drawCircle(color = ink, radius = 1.1f, center = Offset(19.4f, 17.8f))
}
