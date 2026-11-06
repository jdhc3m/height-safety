// Generated from design/icons by tools/design-icons/generate.mjs. Do not edit.
// Source convention: design/icons/README.md (design tokens v1).
package au.com.heightsafety.app.theme

import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class HeightSafetyIcon(val label: String, val tileColor: Color) {
    Account("Account", Color(0xFF1D7AFC)),
    Anchors("Anchors", Color(0xFFF38A3F)),
    Defective("Defective", Color(0xFFF15B50)),
    FurtherAssessment("Further assessment", Color(0xFFF5CD47)),
    Jobs("Jobs", Color(0xFF1D7AFC)),
    NotInspected("Not inspected", Color(0xFF758195)),
    Reports("Reports", Color(0xFF22A06B)),
    ReviewQueue("Review queue", Color(0xFF9F8FEF)),
    Serviceable("Serviceable", Color(0xFF22A06B)),
    Sites("Sites", Color(0xFF2898BD)),
    Sync("Sync", Color(0xFF1D7AFC)),
}

// Free glyphs and tiles carry their fixed hue tokens; contentDescription is
// supplied at each call site that is not purely decorative (DESIGN.md section 9).
object HeightSafetyIcons {
    val Account: ImageVector by lazy { AccountFree() }
    val AccountTile: ImageVector by lazy { AccountTile() }
    val Anchors: ImageVector by lazy { AnchorsFree() }
    val AnchorsTile: ImageVector by lazy { AnchorsTile() }
    val Defective: ImageVector by lazy { DefectiveFree() }
    val DefectiveTile: ImageVector by lazy { DefectiveTile() }
    val FurtherAssessment: ImageVector by lazy { FurtherAssessmentFree() }
    val FurtherAssessmentTile: ImageVector by lazy { FurtherAssessmentTile() }
    val Jobs: ImageVector by lazy { JobsFree() }
    val JobsTile: ImageVector by lazy { JobsTile() }
    val NotInspected: ImageVector by lazy { NotInspectedFree() }
    val NotInspectedTile: ImageVector by lazy { NotInspectedTile() }
    val Reports: ImageVector by lazy { ReportsFree() }
    val ReportsTile: ImageVector by lazy { ReportsTile() }
    val ReviewQueue: ImageVector by lazy { ReviewQueueFree() }
    val ReviewQueueTile: ImageVector by lazy { ReviewQueueTile() }
    val Serviceable: ImageVector by lazy { ServiceableFree() }
    val ServiceableTile: ImageVector by lazy { ServiceableTile() }
    val Sites: ImageVector by lazy { SitesFree() }
    val SitesTile: ImageVector by lazy { SitesTile() }
    val Sync: ImageVector by lazy { SyncFree() }
    val SyncTile: ImageVector by lazy { SyncTile() }

    fun freeVectorFor(icon: HeightSafetyIcon): ImageVector = when (icon) {
        HeightSafetyIcon.Account -> Account
        HeightSafetyIcon.Anchors -> Anchors
        HeightSafetyIcon.Defective -> Defective
        HeightSafetyIcon.FurtherAssessment -> FurtherAssessment
        HeightSafetyIcon.Jobs -> Jobs
        HeightSafetyIcon.NotInspected -> NotInspected
        HeightSafetyIcon.Reports -> Reports
        HeightSafetyIcon.ReviewQueue -> ReviewQueue
        HeightSafetyIcon.Serviceable -> Serviceable
        HeightSafetyIcon.Sites -> Sites
        HeightSafetyIcon.Sync -> Sync
    }

    fun tileVectorFor(icon: HeightSafetyIcon): ImageVector = when (icon) {
        HeightSafetyIcon.Account -> AccountTile
        HeightSafetyIcon.Anchors -> AnchorsTile
        HeightSafetyIcon.Defective -> DefectiveTile
        HeightSafetyIcon.FurtherAssessment -> FurtherAssessmentTile
        HeightSafetyIcon.Jobs -> JobsTile
        HeightSafetyIcon.NotInspected -> NotInspectedTile
        HeightSafetyIcon.Reports -> ReportsTile
        HeightSafetyIcon.ReviewQueue -> ReviewQueueTile
        HeightSafetyIcon.Serviceable -> ServiceableTile
        HeightSafetyIcon.Sites -> SitesTile
        HeightSafetyIcon.Sync -> SyncTile
    }
}

private inline fun glyphVector(
    name: String,
    builder: ImageVector.Builder.() -> Unit,
): ImageVector = ImageVector.Builder(
    name = name,
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24.0f,
    viewportHeight = 24.0f,
).apply(builder).build()

    private fun AccountFree(): ImageVector = glyphVector("AccountFree") {
        path(
            name = "AccountGlyph1Base",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(15.4f, 7.3f)
            arcTo(3.4f, 3.4f, 0f, true, true, 8.6f, 7.3f)
            arcTo(3.4f, 3.4f, 0f, true, true, 15.4f, 7.3f)
            close()
        }
        path(
            name = "AccountGlyph2Base",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(4.7f, 19.6f)
            curveTo(4.9f, 15.5f, 7.9f, 13.1f, 12f, 13.1f)
            curveTo(16.1f, 13.1f, 19.1f, 15.5f, 19.3f, 19.6f)
            arcTo(1.2f, 1.2f, 0f, false, true, 18.1f, 20.8f)
            lineTo(5.9f, 20.8f)
            arcTo(1.2f, 1.2f, 0f, false, true, 4.7f, 19.6f)
            close()
        }
    }

    private fun AccountTile(): ImageVector = glyphVector("AccountTile") {
        path(
            name = "AccountTileBackground",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "AccountGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(15.4f, 7.3f)
            arcTo(3.4f, 3.4f, 0f, true, true, 8.6f, 7.3f)
            arcTo(3.4f, 3.4f, 0f, true, true, 15.4f, 7.3f)
            close()
        }
        path(
            name = "AccountGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(4.7f, 19.6f)
            curveTo(4.9f, 15.5f, 7.9f, 13.1f, 12f, 13.1f)
            curveTo(16.1f, 13.1f, 19.1f, 15.5f, 19.3f, 19.6f)
            arcTo(1.2f, 1.2f, 0f, false, true, 18.1f, 20.8f)
            lineTo(5.9f, 20.8f)
            arcTo(1.2f, 1.2f, 0f, false, true, 4.7f, 19.6f)
            close()
        }
    }

    private fun AnchorsFree(): ImageVector = glyphVector("AnchorsFree") {
        path(
            name = "AnchorsGlyph1Base",
            fill = SolidColor(Color(0xFFF38A3F)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(11.9f, 10.4f)
            lineTo(12.1f, 10.4f)
            arcTo(1.2f, 1.2f, 0f, false, true, 13.3f, 11.6f)
            lineTo(13.3f, 14.7f)
            arcTo(1.2f, 1.2f, 0f, false, true, 12.1f, 15.9f)
            lineTo(11.9f, 15.9f)
            arcTo(1.2f, 1.2f, 0f, false, true, 10.7f, 14.7f)
            lineTo(10.7f, 11.6f)
            arcTo(1.2f, 1.2f, 0f, false, true, 11.9f, 10.4f)
            close()
        }
        path(
            name = "AnchorsGlyph2Base",
            fill = SolidColor(Color(0xFFF38A3F)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(5.6f, 15.6f)
            lineTo(18.4f, 15.6f)
            lineTo(20.8f, 18.7f)
            arcTo(1.4f, 1.4f, 0f, false, true, 19.5f, 20.2f)
            lineTo(4.5f, 20.2f)
            arcTo(1.4f, 1.4f, 0f, false, true, 3.2f, 18.7f)
            close()
            moveTo(8.05f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 6.15f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 8.05f, 17.9f)
            close()
            moveTo(17.85f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 15.95f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 17.85f, 17.9f)
            close()
        }
        path(
            name = "AnchorsGlyph3Detail",
            fill = SolidColor(Color(0xFFE56910)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(15.8f, 7.2f)
            arcTo(3.8f, 3.8f, 0f, true, true, 8.2f, 7.2f)
            arcTo(3.8f, 3.8f, 0f, true, true, 15.8f, 7.2f)
            close()
            moveTo(13.8f, 7.2f)
            arcTo(1.8f, 1.8f, 0f, true, true, 10.2f, 7.2f)
            arcTo(1.8f, 1.8f, 0f, true, true, 13.8f, 7.2f)
            close()
        }
    }

    private fun AnchorsTile(): ImageVector = glyphVector("AnchorsTile") {
        path(
            name = "AnchorsTileBackground",
            fill = SolidColor(Color(0xFFF38A3F)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "AnchorsGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(11.9f, 10.4f)
            lineTo(12.1f, 10.4f)
            arcTo(1.2f, 1.2f, 0f, false, true, 13.3f, 11.6f)
            lineTo(13.3f, 14.7f)
            arcTo(1.2f, 1.2f, 0f, false, true, 12.1f, 15.9f)
            lineTo(11.9f, 15.9f)
            arcTo(1.2f, 1.2f, 0f, false, true, 10.7f, 14.7f)
            lineTo(10.7f, 11.6f)
            arcTo(1.2f, 1.2f, 0f, false, true, 11.9f, 10.4f)
            close()
        }
        path(
            name = "AnchorsGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(5.6f, 15.6f)
            lineTo(18.4f, 15.6f)
            lineTo(20.8f, 18.7f)
            arcTo(1.4f, 1.4f, 0f, false, true, 19.5f, 20.2f)
            lineTo(4.5f, 20.2f)
            arcTo(1.4f, 1.4f, 0f, false, true, 3.2f, 18.7f)
            close()
            moveTo(8.05f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 6.15f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 8.05f, 17.9f)
            close()
            moveTo(17.85f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 15.95f, 17.9f)
            arcTo(0.95f, 0.95f, 0f, true, true, 17.85f, 17.9f)
            close()
        }
        path(
            name = "AnchorsGlyph3Detail",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(15.8f, 7.2f)
            arcTo(3.8f, 3.8f, 0f, true, true, 8.2f, 7.2f)
            arcTo(3.8f, 3.8f, 0f, true, true, 15.8f, 7.2f)
            close()
            moveTo(13.8f, 7.2f)
            arcTo(1.8f, 1.8f, 0f, true, true, 10.2f, 7.2f)
            arcTo(1.8f, 1.8f, 0f, true, true, 13.8f, 7.2f)
            close()
        }
    }

    private fun DefectiveFree(): ImageVector = glyphVector("DefectiveFree") {
        path(
            name = "DefectiveGlyph1Base",
            fill = SolidColor(Color(0xFFF15B50)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(12f, 4.6f)
            arcTo(1.25f, 1.25f, 0f, false, true, 13.25f, 5.85f)
            lineTo(13.25f, 13.15f)
            arcTo(1.25f, 1.25f, 0f, false, true, 12f, 14.4f)
            arcTo(1.25f, 1.25f, 0f, false, true, 10.75f, 13.15f)
            lineTo(10.75f, 5.85f)
            arcTo(1.25f, 1.25f, 0f, false, true, 12f, 4.6f)
            close()
        }
        path(
            name = "DefectiveGlyph2Base",
            fill = SolidColor(Color(0xFFF15B50)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(13.75f, 18.3f)
            arcTo(1.75f, 1.75f, 0f, true, true, 10.25f, 18.3f)
            arcTo(1.75f, 1.75f, 0f, true, true, 13.75f, 18.3f)
            close()
        }
    }

    private fun DefectiveTile(): ImageVector = glyphVector("DefectiveTile") {
        path(
            name = "DefectiveTileBackground",
            fill = SolidColor(Color(0xFFF15B50)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "DefectiveGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(12f, 4.6f)
            arcTo(1.25f, 1.25f, 0f, false, true, 13.25f, 5.85f)
            lineTo(13.25f, 13.15f)
            arcTo(1.25f, 1.25f, 0f, false, true, 12f, 14.4f)
            arcTo(1.25f, 1.25f, 0f, false, true, 10.75f, 13.15f)
            lineTo(10.75f, 5.85f)
            arcTo(1.25f, 1.25f, 0f, false, true, 12f, 4.6f)
            close()
        }
        path(
            name = "DefectiveGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(13.75f, 18.3f)
            arcTo(1.75f, 1.75f, 0f, true, true, 10.25f, 18.3f)
            arcTo(1.75f, 1.75f, 0f, true, true, 13.75f, 18.3f)
            close()
        }
    }

    private fun FurtherAssessmentFree(): ImageVector = glyphVector("FurtherAssessmentFree") {
        path(
            name = "FurtherAssessmentGlyph1Base",
            stroke = SolidColor(Color(0xFFF5CD47)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.6f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(8.2f, 9.2f)
            curveTo(8.2f, 6.8f, 9.8f, 5.1f, 12f, 5.1f)
            curveTo(14.2f, 5.1f, 15.8f, 6.8f, 15.8f, 9f)
            curveTo(15.8f, 10.7f, 14.8f, 11.6f, 13.5f, 12.5f)
            curveTo(12.6f, 13.1f, 12.4f, 13.8f, 12.4f, 14.9f)
        }
        path(
            name = "FurtherAssessmentGlyph2Base",
            fill = SolidColor(Color(0xFFF5CD47)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(14.05f, 18.5f)
            arcTo(1.75f, 1.75f, 0f, true, true, 10.55f, 18.5f)
            arcTo(1.75f, 1.75f, 0f, true, true, 14.05f, 18.5f)
            close()
        }
    }

    private fun FurtherAssessmentTile(): ImageVector = glyphVector("FurtherAssessmentTile") {
        path(
            name = "FurtherAssessmentTileBackground",
            fill = SolidColor(Color(0xFFF5CD47)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "FurtherAssessmentGlyph1Base",
            stroke = SolidColor(Color(0xFFFFFFFF)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.6f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(8.2f, 9.2f)
            curveTo(8.2f, 6.8f, 9.8f, 5.1f, 12f, 5.1f)
            curveTo(14.2f, 5.1f, 15.8f, 6.8f, 15.8f, 9f)
            curveTo(15.8f, 10.7f, 14.8f, 11.6f, 13.5f, 12.5f)
            curveTo(12.6f, 13.1f, 12.4f, 13.8f, 12.4f, 14.9f)
        }
        path(
            name = "FurtherAssessmentGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(14.05f, 18.5f)
            arcTo(1.75f, 1.75f, 0f, true, true, 10.55f, 18.5f)
            arcTo(1.75f, 1.75f, 0f, true, true, 14.05f, 18.5f)
            close()
        }
    }

    private fun JobsFree(): ImageVector = glyphVector("JobsFree") {
        path(
            name = "JobsGlyph1Base",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(2.5f, 13.5f)
            lineTo(2.5f, 9.5f)
            arcTo(2f, 2f, 0f, false, true, 4.5f, 7.5f)
            lineTo(19.5f, 7.5f)
            arcTo(2f, 2f, 0f, false, true, 21.5f, 9.5f)
            lineTo(21.5f, 13.5f)
            close()
            moveTo(10.6f, 13.5f)
            lineTo(10.6f, 13f)
            arcTo(0.8f, 0.8f, 0f, false, true, 11.4f, 12.2f)
            lineTo(12.6f, 12.2f)
            arcTo(0.8f, 0.8f, 0f, false, true, 13.4f, 13f)
            lineTo(13.4f, 13.5f)
            close()
        }
        path(
            name = "JobsGlyph2Base",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(9.5f, 4.2f)
            lineTo(14.5f, 4.2f)
            arcTo(1.5f, 1.5f, 0f, false, true, 16f, 5.7f)
            lineTo(16f, 7.5f)
            lineTo(8f, 7.5f)
            lineTo(8f, 5.7f)
            arcTo(1.5f, 1.5f, 0f, false, true, 9.5f, 4.2f)
            close()
            moveTo(11f, 5.7f)
            lineTo(13f, 5.7f)
            arcTo(1f, 1f, 0f, false, true, 14f, 6.7f)
            lineTo(14f, 7.5f)
            lineTo(10f, 7.5f)
            lineTo(10f, 6.7f)
            arcTo(1f, 1f, 0f, false, true, 11f, 5.7f)
            close()
        }
        path(
            name = "JobsGlyph3Detail",
            fill = SolidColor(Color(0xFF0C66E4)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(2.5f, 13.5f)
            lineTo(21.5f, 13.5f)
            lineTo(21.5f, 17.5f)
            arcTo(2f, 2f, 0f, false, true, 19.5f, 19.5f)
            lineTo(4.5f, 19.5f)
            arcTo(2f, 2f, 0f, false, true, 2.5f, 17.5f)
            close()
            moveTo(10.6f, 13.5f)
            lineTo(13.4f, 13.5f)
            lineTo(13.4f, 14f)
            arcTo(0.8f, 0.8f, 0f, false, true, 12.6f, 14.8f)
            lineTo(11.4f, 14.8f)
            arcTo(0.8f, 0.8f, 0f, false, true, 10.6f, 14f)
            close()
        }
    }

    private fun JobsTile(): ImageVector = glyphVector("JobsTile") {
        path(
            name = "JobsTileBackground",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "JobsGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(2.5f, 13.5f)
            lineTo(2.5f, 9.5f)
            arcTo(2f, 2f, 0f, false, true, 4.5f, 7.5f)
            lineTo(19.5f, 7.5f)
            arcTo(2f, 2f, 0f, false, true, 21.5f, 9.5f)
            lineTo(21.5f, 13.5f)
            close()
            moveTo(10.6f, 13.5f)
            lineTo(10.6f, 13f)
            arcTo(0.8f, 0.8f, 0f, false, true, 11.4f, 12.2f)
            lineTo(12.6f, 12.2f)
            arcTo(0.8f, 0.8f, 0f, false, true, 13.4f, 13f)
            lineTo(13.4f, 13.5f)
            close()
        }
        path(
            name = "JobsGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(9.5f, 4.2f)
            lineTo(14.5f, 4.2f)
            arcTo(1.5f, 1.5f, 0f, false, true, 16f, 5.7f)
            lineTo(16f, 7.5f)
            lineTo(8f, 7.5f)
            lineTo(8f, 5.7f)
            arcTo(1.5f, 1.5f, 0f, false, true, 9.5f, 4.2f)
            close()
            moveTo(11f, 5.7f)
            lineTo(13f, 5.7f)
            arcTo(1f, 1f, 0f, false, true, 14f, 6.7f)
            lineTo(14f, 7.5f)
            lineTo(10f, 7.5f)
            lineTo(10f, 6.7f)
            arcTo(1f, 1f, 0f, false, true, 11f, 5.7f)
            close()
        }
        path(
            name = "JobsGlyph3Detail",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(2.5f, 13.5f)
            lineTo(21.5f, 13.5f)
            lineTo(21.5f, 17.5f)
            arcTo(2f, 2f, 0f, false, true, 19.5f, 19.5f)
            lineTo(4.5f, 19.5f)
            arcTo(2f, 2f, 0f, false, true, 2.5f, 17.5f)
            close()
            moveTo(10.6f, 13.5f)
            lineTo(13.4f, 13.5f)
            lineTo(13.4f, 14f)
            arcTo(0.8f, 0.8f, 0f, false, true, 12.6f, 14.8f)
            lineTo(11.4f, 14.8f)
            arcTo(0.8f, 0.8f, 0f, false, true, 10.6f, 14f)
            close()
        }
    }

    private fun NotInspectedFree(): ImageVector = glyphVector("NotInspectedFree") {
        path(
            name = "NotInspectedGlyph1Base",
            fill = SolidColor(Color(0xFF758195)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(6.1f, 10.7f)
            lineTo(17.9f, 10.7f)
            arcTo(1.3f, 1.3f, 0f, false, true, 19.2f, 12f)
            arcTo(1.3f, 1.3f, 0f, false, true, 17.9f, 13.3f)
            lineTo(6.1f, 13.3f)
            arcTo(1.3f, 1.3f, 0f, false, true, 4.8f, 12f)
            arcTo(1.3f, 1.3f, 0f, false, true, 6.1f, 10.7f)
            close()
        }
    }

    private fun NotInspectedTile(): ImageVector = glyphVector("NotInspectedTile") {
        path(
            name = "NotInspectedTileBackground",
            fill = SolidColor(Color(0xFF758195)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "NotInspectedGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(6.1f, 10.7f)
            lineTo(17.9f, 10.7f)
            arcTo(1.3f, 1.3f, 0f, false, true, 19.2f, 12f)
            arcTo(1.3f, 1.3f, 0f, false, true, 17.9f, 13.3f)
            lineTo(6.1f, 13.3f)
            arcTo(1.3f, 1.3f, 0f, false, true, 4.8f, 12f)
            arcTo(1.3f, 1.3f, 0f, false, true, 6.1f, 10.7f)
            close()
        }
    }

    private fun ReportsFree(): ImageVector = glyphVector("ReportsFree") {
        path(
            name = "ReportsGlyph1Base",
            fill = SolidColor(Color(0xFF22A06B)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(6.7f, 3f)
            lineTo(13.9f, 3f)
            lineTo(19f, 8.1f)
            lineTo(19f, 19.8f)
            arcTo(1.2f, 1.2f, 0f, false, true, 17.8f, 21f)
            lineTo(6.7f, 21f)
            arcTo(1.2f, 1.2f, 0f, false, true, 5.5f, 19.8f)
            lineTo(5.5f, 4.2f)
            arcTo(1.2f, 1.2f, 0f, false, true, 6.7f, 3f)
            close()
            moveTo(8.6f, 10.2f)
            lineTo(15.9f, 10.2f)
            arcTo(0.7f, 0.7f, 0f, false, true, 16.6f, 10.9f)
            arcTo(0.7f, 0.7f, 0f, false, true, 15.9f, 11.6f)
            lineTo(8.6f, 11.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 7.9f, 10.9f)
            arcTo(0.7f, 0.7f, 0f, false, true, 8.6f, 10.2f)
            close()
            moveTo(8.6f, 13.9f)
            lineTo(15.9f, 13.9f)
            arcTo(0.7f, 0.7f, 0f, false, true, 16.6f, 14.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 15.9f, 15.3f)
            lineTo(8.6f, 15.3f)
            arcTo(0.7f, 0.7f, 0f, false, true, 7.9f, 14.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 8.6f, 13.9f)
            close()
            moveTo(8.6f, 17.6f)
            lineTo(11.7f, 17.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 12.4f, 18.3f)
            arcTo(0.7f, 0.7f, 0f, false, true, 11.7f, 19f)
            lineTo(8.6f, 19f)
            arcTo(0.7f, 0.7f, 0f, false, true, 7.9f, 18.3f)
            arcTo(0.7f, 0.7f, 0f, false, true, 8.6f, 17.6f)
            close()
        }
        path(
            name = "ReportsGlyph2Detail",
            fill = SolidColor(Color(0xFF1F845A)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(13.9f, 3f)
            lineTo(19f, 8.1f)
            lineTo(13.9f, 8.1f)
            close()
        }
    }

    private fun ReportsTile(): ImageVector = glyphVector("ReportsTile") {
        path(
            name = "ReportsTileBackground",
            fill = SolidColor(Color(0xFF22A06B)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "ReportsGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(6.7f, 3f)
            lineTo(13.9f, 3f)
            lineTo(19f, 8.1f)
            lineTo(19f, 19.8f)
            arcTo(1.2f, 1.2f, 0f, false, true, 17.8f, 21f)
            lineTo(6.7f, 21f)
            arcTo(1.2f, 1.2f, 0f, false, true, 5.5f, 19.8f)
            lineTo(5.5f, 4.2f)
            arcTo(1.2f, 1.2f, 0f, false, true, 6.7f, 3f)
            close()
            moveTo(8.6f, 10.2f)
            lineTo(15.9f, 10.2f)
            arcTo(0.7f, 0.7f, 0f, false, true, 16.6f, 10.9f)
            arcTo(0.7f, 0.7f, 0f, false, true, 15.9f, 11.6f)
            lineTo(8.6f, 11.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 7.9f, 10.9f)
            arcTo(0.7f, 0.7f, 0f, false, true, 8.6f, 10.2f)
            close()
            moveTo(8.6f, 13.9f)
            lineTo(15.9f, 13.9f)
            arcTo(0.7f, 0.7f, 0f, false, true, 16.6f, 14.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 15.9f, 15.3f)
            lineTo(8.6f, 15.3f)
            arcTo(0.7f, 0.7f, 0f, false, true, 7.9f, 14.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 8.6f, 13.9f)
            close()
            moveTo(8.6f, 17.6f)
            lineTo(11.7f, 17.6f)
            arcTo(0.7f, 0.7f, 0f, false, true, 12.4f, 18.3f)
            arcTo(0.7f, 0.7f, 0f, false, true, 11.7f, 19f)
            lineTo(8.6f, 19f)
            arcTo(0.7f, 0.7f, 0f, false, true, 7.9f, 18.3f)
            arcTo(0.7f, 0.7f, 0f, false, true, 8.6f, 17.6f)
            close()
        }
        path(
            name = "ReportsGlyph2Detail",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(13.9f, 3f)
            lineTo(19f, 8.1f)
            lineTo(13.9f, 8.1f)
            close()
        }
    }

    private fun ReviewQueueFree(): ImageVector = glyphVector("ReviewQueueFree") {
        path(
            name = "ReviewQueueGlyph1Detail",
            fill = SolidColor(Color(0xFF6E5DC6)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(5.4f, 5.5f)
            lineTo(18.6f, 5.5f)
            arcTo(2.4f, 2.4f, 0f, false, true, 21f, 7.9f)
            lineTo(21f, 12.4f)
            lineTo(3f, 12.4f)
            lineTo(3f, 7.9f)
            arcTo(2.4f, 2.4f, 0f, false, true, 5.4f, 5.5f)
            close()
        }
        path(
            name = "ReviewQueueGlyph2Base",
            fill = SolidColor(Color(0xFF9F8FEF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(3f, 12.4f)
            lineTo(21f, 12.4f)
            lineTo(21f, 18.4f)
            arcTo(2.4f, 2.4f, 0f, false, true, 18.6f, 20.8f)
            lineTo(5.4f, 20.8f)
            arcTo(2.4f, 2.4f, 0f, false, true, 3f, 18.4f)
            close()
        }
        path(
            name = "ReviewQueueGlyph3Mark",
            stroke = SolidColor(Color(0xFFFFFFFF)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.1f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(8.5f, 8.9f)
            lineTo(11f, 11.4f)
            lineTo(15.5f, 6.9f)
        }
    }

    private fun ReviewQueueTile(): ImageVector = glyphVector("ReviewQueueTile") {
        path(
            name = "ReviewQueueTileBackground",
            fill = SolidColor(Color(0xFF9F8FEF)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "ReviewQueueGlyph1Detail",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(5.4f, 5.5f)
            lineTo(18.6f, 5.5f)
            arcTo(2.4f, 2.4f, 0f, false, true, 21f, 7.9f)
            lineTo(21f, 12.4f)
            lineTo(3f, 12.4f)
            lineTo(3f, 7.9f)
            arcTo(2.4f, 2.4f, 0f, false, true, 5.4f, 5.5f)
            close()
        }
        path(
            name = "ReviewQueueGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(3f, 12.4f)
            lineTo(21f, 12.4f)
            lineTo(21f, 18.4f)
            arcTo(2.4f, 2.4f, 0f, false, true, 18.6f, 20.8f)
            lineTo(5.4f, 20.8f)
            arcTo(2.4f, 2.4f, 0f, false, true, 3f, 18.4f)
            close()
        }
        path(
            name = "ReviewQueueGlyph3Mark",
            stroke = SolidColor(Color(0xFF9F8FEF)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.1f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(8.5f, 8.9f)
            lineTo(11f, 11.4f)
            lineTo(15.5f, 6.9f)
        }
    }

    private fun ServiceableFree(): ImageVector = glyphVector("ServiceableFree") {
        path(
            name = "ServiceableGlyph1Base",
            stroke = SolidColor(Color(0xFF22A06B)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 3f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(4.7f, 12.9f)
            lineTo(10.1f, 18.3f)
            lineTo(19.3f, 7.7f)
        }
    }

    private fun ServiceableTile(): ImageVector = glyphVector("ServiceableTile") {
        path(
            name = "ServiceableTileBackground",
            fill = SolidColor(Color(0xFF22A06B)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "ServiceableGlyph1Base",
            stroke = SolidColor(Color(0xFFFFFFFF)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 3f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(4.7f, 12.9f)
            lineTo(10.1f, 18.3f)
            lineTo(19.3f, 7.7f)
        }
    }

    private fun SitesFree(): ImageVector = glyphVector("SitesFree") {
        path(
            name = "SitesGlyph1Base",
            fill = SolidColor(Color(0xFF2898BD)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(4.6f, 3f)
            lineTo(12.9f, 3f)
            arcTo(1.6f, 1.6f, 0f, false, true, 14.5f, 4.6f)
            lineTo(14.5f, 19.4f)
            arcTo(1.6f, 1.6f, 0f, false, true, 12.9f, 21f)
            lineTo(4.6f, 21f)
            arcTo(1.6f, 1.6f, 0f, false, true, 3f, 19.4f)
            lineTo(3f, 4.6f)
            arcTo(1.6f, 1.6f, 0f, false, true, 4.6f, 3f)
            close()
            moveTo(5.9f, 5.8f)
            lineTo(7.3f, 5.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.7f, 6.2f)
            lineTo(7.7f, 7.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.3f, 8f)
            lineTo(5.9f, 8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.5f, 7.6f)
            lineTo(5.5f, 6.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.9f, 5.8f)
            close()
            moveTo(10.2f, 5.8f)
            lineTo(11.6f, 5.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 12f, 6.2f)
            lineTo(12f, 7.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 11.6f, 8f)
            lineTo(10.2f, 8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 9.8f, 7.6f)
            lineTo(9.8f, 6.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 10.2f, 5.8f)
            close()
            moveTo(5.9f, 10.6f)
            lineTo(7.3f, 10.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.7f, 11f)
            lineTo(7.7f, 12.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.3f, 12.8f)
            lineTo(5.9f, 12.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.5f, 12.4f)
            lineTo(5.5f, 11f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.9f, 10.6f)
            close()
            moveTo(10.2f, 10.6f)
            lineTo(11.6f, 10.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 12f, 11f)
            lineTo(12f, 12.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 11.6f, 12.8f)
            lineTo(10.2f, 12.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 9.8f, 12.4f)
            lineTo(9.8f, 11f)
            arcTo(0.4f, 0.4f, 0f, false, true, 10.2f, 10.6f)
            close()
            moveTo(5.9f, 15.4f)
            lineTo(7.3f, 15.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.7f, 15.8f)
            lineTo(7.7f, 17.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.3f, 17.6f)
            lineTo(5.9f, 17.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.5f, 17.2f)
            lineTo(5.5f, 15.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.9f, 15.4f)
            close()
            moveTo(10.2f, 15.4f)
            lineTo(11.6f, 15.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 12f, 15.8f)
            lineTo(12f, 17.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 11.6f, 17.6f)
            lineTo(10.2f, 17.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 9.8f, 17.2f)
            lineTo(9.8f, 15.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 10.2f, 15.4f)
            close()
        }
        path(
            name = "SitesGlyph2Detail",
            fill = SolidColor(Color(0xFF227D9B)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(17.4f, 20.8f)
            curveTo(15.9f, 18.3f, 13.9f, 16.6f, 13.9f, 13.6f)
            arcTo(3.5f, 3.5f, 0f, false, true, 20.9f, 13.6f)
            curveTo(20.9f, 16.6f, 18.9f, 18.3f, 17.4f, 20.8f)
            close()
            moveTo(18.8f, 13.6f)
            arcTo(1.4f, 1.4f, 0f, true, true, 16f, 13.6f)
            arcTo(1.4f, 1.4f, 0f, true, true, 18.8f, 13.6f)
            close()
        }
    }

    private fun SitesTile(): ImageVector = glyphVector("SitesTile") {
        path(
            name = "SitesTileBackground",
            fill = SolidColor(Color(0xFF2898BD)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "SitesGlyph1Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(4.6f, 3f)
            lineTo(12.9f, 3f)
            arcTo(1.6f, 1.6f, 0f, false, true, 14.5f, 4.6f)
            lineTo(14.5f, 19.4f)
            arcTo(1.6f, 1.6f, 0f, false, true, 12.9f, 21f)
            lineTo(4.6f, 21f)
            arcTo(1.6f, 1.6f, 0f, false, true, 3f, 19.4f)
            lineTo(3f, 4.6f)
            arcTo(1.6f, 1.6f, 0f, false, true, 4.6f, 3f)
            close()
            moveTo(5.9f, 5.8f)
            lineTo(7.3f, 5.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.7f, 6.2f)
            lineTo(7.7f, 7.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.3f, 8f)
            lineTo(5.9f, 8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.5f, 7.6f)
            lineTo(5.5f, 6.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.9f, 5.8f)
            close()
            moveTo(10.2f, 5.8f)
            lineTo(11.6f, 5.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 12f, 6.2f)
            lineTo(12f, 7.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 11.6f, 8f)
            lineTo(10.2f, 8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 9.8f, 7.6f)
            lineTo(9.8f, 6.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 10.2f, 5.8f)
            close()
            moveTo(5.9f, 10.6f)
            lineTo(7.3f, 10.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.7f, 11f)
            lineTo(7.7f, 12.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.3f, 12.8f)
            lineTo(5.9f, 12.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.5f, 12.4f)
            lineTo(5.5f, 11f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.9f, 10.6f)
            close()
            moveTo(10.2f, 10.6f)
            lineTo(11.6f, 10.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 12f, 11f)
            lineTo(12f, 12.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 11.6f, 12.8f)
            lineTo(10.2f, 12.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 9.8f, 12.4f)
            lineTo(9.8f, 11f)
            arcTo(0.4f, 0.4f, 0f, false, true, 10.2f, 10.6f)
            close()
            moveTo(5.9f, 15.4f)
            lineTo(7.3f, 15.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.7f, 15.8f)
            lineTo(7.7f, 17.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 7.3f, 17.6f)
            lineTo(5.9f, 17.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.5f, 17.2f)
            lineTo(5.5f, 15.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 5.9f, 15.4f)
            close()
            moveTo(10.2f, 15.4f)
            lineTo(11.6f, 15.4f)
            arcTo(0.4f, 0.4f, 0f, false, true, 12f, 15.8f)
            lineTo(12f, 17.2f)
            arcTo(0.4f, 0.4f, 0f, false, true, 11.6f, 17.6f)
            lineTo(10.2f, 17.6f)
            arcTo(0.4f, 0.4f, 0f, false, true, 9.8f, 17.2f)
            lineTo(9.8f, 15.8f)
            arcTo(0.4f, 0.4f, 0f, false, true, 10.2f, 15.4f)
            close()
        }
        path(
            name = "SitesGlyph2Detail",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(17.4f, 20.8f)
            curveTo(15.9f, 18.3f, 13.9f, 16.6f, 13.9f, 13.6f)
            arcTo(3.5f, 3.5f, 0f, false, true, 20.9f, 13.6f)
            curveTo(20.9f, 16.6f, 18.9f, 18.3f, 17.4f, 20.8f)
            close()
            moveTo(18.8f, 13.6f)
            arcTo(1.4f, 1.4f, 0f, true, true, 16f, 13.6f)
            arcTo(1.4f, 1.4f, 0f, true, true, 18.8f, 13.6f)
            close()
        }
    }

    private fun SyncFree(): ImageVector = glyphVector("SyncFree") {
        path(
            name = "SyncGlyph1Base",
            stroke = SolidColor(Color(0xFF1D7AFC)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.5f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(4.47f, 10.4f)
            arcTo(7.7f, 7.7f, 0f, false, true, 19.53f, 10.4f)
        }
        path(
            name = "SyncGlyph2Base",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(21.4f, 9.4f)
            lineTo(20.1f, 13.2f)
            lineTo(17.4f, 10.5f)
            arcTo(7.7f, 7.7f, 0f, false, false, 19.5f, 10.4f)
            close()
        }
        path(
            name = "SyncGlyph3Detail",
            stroke = SolidColor(Color(0xFF0C66E4)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.5f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(19.53f, 13.6f)
            arcTo(7.7f, 7.7f, 0f, false, true, 4.47f, 13.6f)
        }
        path(
            name = "SyncGlyph4Detail",
            fill = SolidColor(Color(0xFF0C66E4)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(6.3f, 14.6f)
            lineTo(5f, 10.8f)
            lineTo(2.4f, 13.5f)
            arcTo(7.7f, 7.7f, 0f, false, false, 4.5f, 13.6f)
            close()
        }
    }

    private fun SyncTile(): ImageVector = glyphVector("SyncTile") {
        path(
            name = "SyncTileBackground",
            fill = SolidColor(Color(0xFF1D7AFC)),
            fillAlpha = 1.0f,
        ) {
            moveTo(6.0f, 0.0f)
            lineTo(18.0f, 0.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)
            lineTo(24.0f, 18.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)
            lineTo(6.0f, 24.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)
            lineTo(0.0f, 6.0f)
            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)
            close()
        }
        path(
            name = "SyncGlyph1Base",
            stroke = SolidColor(Color(0xFFFFFFFF)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.5f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(4.47f, 10.4f)
            arcTo(7.7f, 7.7f, 0f, false, true, 19.53f, 10.4f)
        }
        path(
            name = "SyncGlyph2Base",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(21.4f, 9.4f)
            lineTo(20.1f, 13.2f)
            lineTo(17.4f, 10.5f)
            arcTo(7.7f, 7.7f, 0f, false, false, 19.5f, 10.4f)
            close()
        }
        path(
            name = "SyncGlyph3Detail",
            stroke = SolidColor(Color(0xFFFFFFFF)),
            strokeAlpha = 1.0f,
            strokeLineWidth = 2.5f,
            strokeLineCap = StrokeCap.Butt,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(19.53f, 13.6f)
            arcTo(7.7f, 7.7f, 0f, false, true, 4.47f, 13.6f)
        }
        path(
            name = "SyncGlyph4Detail",
            fill = SolidColor(Color(0xFFFFFFFF)),
            fillAlpha = 1.0f,
            pathFillType = PathFillType.EvenOdd,
        ) {
            moveTo(6.3f, 14.6f)
            lineTo(5f, 10.8f)
            lineTo(2.4f, 13.5f)
            arcTo(7.7f, 7.7f, 0f, false, false, 4.5f, 13.6f)
            close()
        }
    }

@Composable
fun HeightSafetyIconTile(
    icon: HeightSafetyIcon,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp,
) {
    Icon(
        imageVector = HeightSafetyIcons.tileVectorFor(icon),
        contentDescription = contentDescription,
        modifier = modifier.size(size),
        tint = Color.Unspecified,
    )
}

@Composable
fun HeightSafetyFreeGlyph(
    icon: HeightSafetyIcon,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp,
) {
    Icon(
        imageVector = HeightSafetyIcons.freeVectorFor(icon),
        contentDescription = contentDescription,
        modifier = modifier.size(size),
        tint = Color.Unspecified,
    )
}
