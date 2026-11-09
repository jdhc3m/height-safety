package au.com.heightsafety.app.icons

import au.com.heightsafety.app.theme.DesignTokens
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HeightSafetyIconsTest {

    @Test
    fun iconSetCoversEveryDesignGlyph() {
        assertEquals(39, HeightSafetyIcons.all.size)
        assertEquals(39, HeightSafetyIcons.all.map { it.slug }.distinct().size)
        assertEquals(39, HeightSafetyIcons.all.map { it.name }.distinct().size)
        assertTrue(HeightSafetyIcons.all.none { it.slug.isEmpty() || it.name.isEmpty() })
    }

    @Test
    fun everyIconHasTileAndFreeVariantsOnThe24pxViewport() {
        HeightSafetyIcons.all.forEach { entry ->
            assertEquals(24f, entry.tile.viewportWidth)
            assertEquals(24f, entry.tile.viewportHeight)
            assertEquals(24f, entry.free.viewportWidth)
            assertEquals(24f, entry.free.viewportHeight)
            val pascalSlug = entry.slug
                .split("-")
                .joinToString("") { part -> part.replaceFirstChar { it.uppercase() } }
            assertEquals("${pascalSlug}Tile", entry.tile.name)
            assertEquals("${pascalSlug}Free", entry.free.name)
        }
    }

    @Test
    fun tileColorsUseTheSharedTokenHues() {
        val tokenForHue = mapOf(
            "blue" to DesignTokens.LightColors.brandPrimary,
            "teal" to DesignTokens.LightColors.teal,
            "purple" to DesignTokens.LightColors.purple,
            "green" to DesignTokens.LightColors.green,
            "orange" to DesignTokens.LightColors.orange,
            "red" to DesignTokens.LightColors.red,
            "yellow" to DesignTokens.LightColors.yellow,
            "slate" to DesignTokens.LightColors.slate,
        )
        HeightSafetyIcons.all.forEach { entry ->
            assertEquals(
                "tile colour for ${entry.slug} (${entry.hue})",
                tokenForHue.getValue(entry.hue),
                entry.tileColor,
            )
        }
    }

    @Test
    fun knownStatusIconsCarryTheirDesignHues() {
        assertEquals("green", HeightSafetyIcons.all.first { it.slug == "serviceable" }.hue)
        assertEquals("red", HeightSafetyIcons.all.first { it.slug == "defective" }.hue)
        assertEquals("slate", HeightSafetyIcons.all.first { it.slug == "not-inspected" }.hue)
        assertEquals("yellow", HeightSafetyIcons.all.first { it.slug == "further-assessment" }.hue)
    }
}
