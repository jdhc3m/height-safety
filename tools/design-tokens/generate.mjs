#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOKENS_PATH = join(ROOT, "design", "tokens.json");

const WEB_OUT = join(ROOT, "apps", "web", "src", "app", "tokens.css");
const ANDROID_OUT = join(
  ROOT,
  "apps",
  "android",
  "app",
  "src",
  "main",
  "kotlin",
  "au",
  "com",
  "heightsafety",
  "app",
  "theme",
  "DesignTokens.kt",
);

const THEME_KEYS = new Set(["surface", "background", "textPrimary", "textSecondary"]);

const kebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const fixedColors = (tokens) => {
  const entries = Object.entries(tokens.color.light).filter(([key]) => !THEME_KEYS.has(key));
  const dark = tokens.color.dark;
  for (const [key, value] of entries) {
    if (dark[key] !== value) {
      throw new Error(`token "${key}" must be fixed across light and dark, found ${value} vs ${dark[key]}`);
    }
  }
  return entries;
};

const themeColors = (palette) =>
  Object.entries(palette).filter(([key]) => THEME_KEYS.has(key));

const renderCss = (tokens) => {
  const lines = [];
  lines.push("/* Generated from design/tokens.json by tools/design-tokens/generate.mjs. Do not edit. */");
  lines.push(":root {");
  for (const [key, value] of fixedColors(tokens)) {
    lines.push(`  --hs-color-${kebab(key)}: ${value.toLowerCase()};`);
  }
  for (const [key, value] of themeColors(tokens.color.light)) {
    lines.push(`  --hs-color-${kebab(key)}: ${value.toLowerCase()};`);
  }
  lines.push(`  --hs-type-web-font-stack: ${tokens.type.webFontStack};`);
  lines.push(`  --hs-type-web-body: ${tokens.type.webBodyPx}px;`);
  lines.push(`  --hs-type-web-table: ${tokens.type.webTablePx}px;`);
  lines.push(`  --hs-type-web-page-title: ${tokens.type.webPageTitlePx}px;`);
  lines.push(`  --hs-space-grid: ${tokens.space.gridDp}px;`);
  lines.push(`  --hs-space-page-margin-phone: ${tokens.space.pageMarginPhoneDp}px;`);
  lines.push(`  --hs-radius-card: ${tokens.radius.cardDp}px;`);
  lines.push(`  --hs-radius-chip: ${tokens.radius.chipDp}px;`);
  lines.push(`  --hs-radius-tile-ratio: ${tokens.radius.tileRatio};`);
  lines.push(`  --hs-touch-field-control: ${tokens.touch.fieldControlDp}px;`);
  lines.push(`  --hs-touch-outcome-tile: ${tokens.touch.outcomeTileDp}px;`);
  lines.push(`  --hs-touch-photo-add-tile: ${tokens.touch.photoAddTileDp}px;`);
  lines.push(`  --hs-touch-bottom-bar: ${tokens.touch.bottomBarDp}px;`);
  lines.push("}");
  lines.push("");
  lines.push("@media (prefers-color-scheme: dark) {");
  lines.push("  :root {");
  for (const [key, value] of themeColors(tokens.color.dark)) {
    lines.push(`    --hs-color-${kebab(key)}: ${value.toLowerCase()};`);
  }
  lines.push("  }");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
};

const argb = (hex) => `0xFF${hex.replace("#", "").toUpperCase()}`;

const renderKotlin = (tokens) => {
  const lines = [];
  lines.push("package au.com.heightsafety.app.theme");
  lines.push("");
  lines.push("import androidx.compose.ui.graphics.Color");
  lines.push("import androidx.compose.ui.unit.Dp");
  lines.push("import androidx.compose.ui.unit.dp");
  lines.push("");
  lines.push("// Generated from design/tokens.json by tools/design-tokens/generate.mjs. Do not edit.");
  lines.push("object DesignTokens {");
  lines.push("    object LightColors {");
  for (const [key, value] of fixedColors(tokens)) {
    lines.push(`        val ${key} = Color(${argb(value)})`);
  }
  for (const [key, value] of themeColors(tokens.color.light)) {
    lines.push(`        val ${key} = Color(${argb(value)})`);
  }
  lines.push("    }");
  lines.push("");
  lines.push("    object DarkColors {");
  for (const [key, value] of fixedColors(tokens)) {
    lines.push(`        val ${key} = Color(${argb(value)})`);
  }
  for (const [key, value] of themeColors(tokens.color.dark)) {
    lines.push(`        val ${key} = Color(${argb(value)})`);
  }
  lines.push("    }");
  lines.push("");
  lines.push("    object TypeScale {");
  lines.push(`        const val webBodyPx = ${tokens.type.webBodyPx}`);
  lines.push(`        const val webTablePx = ${tokens.type.webTablePx}`);
  lines.push(`        const val webPageTitlePx = ${tokens.type.webPageTitlePx}`);
  lines.push(`        const val androidBodyLargeSp = ${tokens.type.androidBodyLargeSp}`);
  lines.push(`        const val androidTitleLargeSp = ${tokens.type.androidTitleLargeSp}`);
  lines.push("    }");
  lines.push("");
  lines.push("    object Spacing {");
  lines.push(`        val grid: Dp = ${tokens.space.gridDp}.dp`);
  lines.push(`        val pageMarginPhone: Dp = ${tokens.space.pageMarginPhoneDp}.dp`);
  lines.push("    }");
  lines.push("");
  lines.push("    object Radii {");
  lines.push(`        val card: Dp = ${tokens.radius.cardDp}.dp`);
  lines.push(`        val chip: Dp = ${tokens.radius.chipDp}.dp`);
  lines.push(`        const val tileRatio = ${tokens.radius.tileRatio}`);
  lines.push("    }");
  lines.push("");
  lines.push("    object Touch {");
  lines.push(`        val fieldControl: Dp = ${tokens.touch.fieldControlDp}.dp`);
  lines.push(`        val outcomeTile: Dp = ${tokens.touch.outcomeTileDp}.dp`);
  lines.push(`        val photoAddTile: Dp = ${tokens.touch.photoAddTileDp}.dp`);
  lines.push(`        val bottomBar: Dp = ${tokens.touch.bottomBarDp}.dp`);
  lines.push("    }");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
};

const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf8"));
const outputs = [
  [WEB_OUT, renderCss(tokens)],
  [ANDROID_OUT, renderKotlin(tokens)],
];

const mode = process.argv[2] ?? "--check";
if (mode !== "--generate" && mode !== "--check") {
  console.error("Usage: node tools/design-tokens/generate.mjs [--generate|--check]");
  process.exit(1);
}

if (mode === "--generate") {
  for (const [destination, content] of outputs) {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content);
    console.log(`wrote ${relative(ROOT, destination)}`);
  }
  process.exit(0);
}

const staging = join(tmpdir(), `height-safety-design-tokens-${process.pid}`);
rmSync(staging, { recursive: true, force: true });
let failed = false;
for (const [destination, content] of outputs) {
  const staged = join(staging, relative(ROOT, destination));
  mkdirSync(dirname(staged), { recursive: true });
  writeFileSync(staged, content);
  let current = "";
  try {
    current = readFileSync(destination, "utf8");
  } catch {
    current = "";
  }
  if (current !== content) {
    failed = true;
    console.error(`design tokens out of date: ${relative(ROOT, destination)}`);
    console.error("  run: pnpm run design-tokens:generate");
  }
}
rmSync(staging, { recursive: true, force: true });
if (failed) {
  process.exit(1);
}
console.log("design tokens check passed");
