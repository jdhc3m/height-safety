#!/usr/bin/env node
// Generates HeightSafetyIcons.kt from the authored SVG glyph sources in
// design/icons/ (see design/icons/README.md for the source convention).
// Palette values are read from design/tokens.json so hue changes flow through
// a single regeneration.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ICONS_DIR = join(ROOT, "design", "icons");
const TOKENS_PATH = join(ROOT, "design", "tokens.json");
const OUT_PATH = join(
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
  "HeightSafetyIcons.kt",
);

// Hue -> { base, bold } tone pair, resolved from the generated token source.
const HUE_KEYS = {
  blue: ["brandPrimary", "brandPrimaryPressed"],
  teal: ["teal", "tealBold"],
  orange: ["orange", "orangeBold"],
  green: ["green", "greenBold"],
  purple: ["purple", "purpleBold"],
  red: ["red", "redBold"],
  slate: ["slate", "slateBold"],
  yellow: ["yellow", "yellowBold"],
};

const argb = (hex) => `Color(0xFF${hex.replace("#", "").toUpperCase()})`;

const float = (value) => {
  const rounded = Number(value.toFixed(4));
  return `${rounded}f`;
};

// --- Minimal SVG path parsing ------------------------------------------------
// Sources are authored with a restricted SVG subset (see design/icons/README).
// Everything is normalised to absolute M/L/C/Q/A/Z so the Kotlin emitter only
// has to know those nodes.

const ARG_COUNTS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

function tokenizePath(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    if (match[1]) tokens.push({ kind: "cmd", value: match[1] });
    else tokens.push({ kind: "num", value: Number(match[2]) });
  }
  return tokens;
}

function parseSubpaths(d) {
  const tokens = tokenizePath(d);
  const commands = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let previousCubicX = null;
  let previousCubicY = null;
  let previousQuadX = null;
  let previousQuadY = null;
  let index = 0;

  const nextNumber = () => {
    const token = tokens[index];
    if (!token || token.kind !== "num") {
      throw new Error(`expected a path number at token ${index} of "${d}"`);
    }
    index += 1;
    return token.value;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.kind !== "cmd") {
      throw new Error(`unexpected number token where a command was expected: ${JSON.stringify(token)}`);
    }
    index += 1;
    const upper = token.value.toUpperCase();
    const isRelative = token.value !== upper;
    const absoluteX = (value) => (isRelative ? currentX + value : value);
    const absoluteY = (value) => (isRelative ? currentY + value : value);

    if (upper === "Z") {
      commands.push({ type: "Z" });
      currentX = startX;
      currentY = startY;
      previousCubicX = null;
      previousQuadX = null;
      continue;
    }

    const count = ARG_COUNTS[upper];
    if (count === undefined) throw new Error(`unsupported path command ${token.value}`);
    let firstGroup = true;
    for (;;) {
      switch (upper) {
        case "M":
        case "L": {
          const x = absoluteX(nextNumber());
          const y = absoluteY(nextNumber());
          commands.push({ type: upper === "M" && firstGroup ? "M" : "L", x, y });
          currentX = x;
          currentY = y;
          if (upper === "M" && firstGroup) {
            startX = x;
            startY = y;
          }
          previousCubicX = null;
          previousQuadX = null;
          break;
        }
        case "H":
        case "V": {
          const value = nextNumber();
          const x = upper === "H" ? absoluteX(value) : currentX;
          const y = upper === "V" ? absoluteY(value) : currentY;
          commands.push({ type: "L", x, y });
          currentX = x;
          currentY = y;
          previousCubicX = null;
          previousQuadX = null;
          break;
        }
        case "C":
        case "S": {
          const raw1X = nextNumber();
          const raw1Y = nextNumber();
          const raw2X = nextNumber();
          const raw2Y = nextNumber();
          const endX = absoluteX(nextNumber());
          const endY = absoluteY(nextNumber());
          let control1X = absoluteX(raw1X);
          let control1Y = absoluteY(raw1Y);
          const control2X = absoluteX(raw2X);
          const control2Y = absoluteY(raw2Y);
          if (upper === "S") {
            if (previousCubicX !== null) {
              control1X = 2 * currentX - previousCubicX;
              control1Y = 2 * currentY - previousCubicY;
            } else {
              control1X = currentX;
              control1Y = currentY;
            }
          }
          commands.push({
            type: "C",
            x1: control1X,
            y1: control1Y,
            x2: control2X,
            y2: control2Y,
            x: endX,
            y: endY,
          });
          currentX = endX;
          currentY = endY;
          previousCubicX = control2X;
          previousCubicY = control2Y;
          previousQuadX = null;
          break;
        }
        case "Q":
        case "T": {
          const raw1X = nextNumber();
          const raw1Y = nextNumber();
          const endX = absoluteX(nextNumber());
          const endY = absoluteY(nextNumber());
          let controlX = absoluteX(raw1X);
          let controlY = absoluteY(raw1Y);
          if (upper === "T") {
            if (previousQuadX !== null) {
              controlX = 2 * currentX - previousQuadX;
              controlY = 2 * currentY - previousQuadY;
            } else {
              controlX = currentX;
              controlY = currentY;
            }
          }
          commands.push({ type: "Q", x1: controlX, y1: controlY, x: endX, y: endY });
          currentX = endX;
          currentY = endY;
          previousQuadX = controlX;
          previousQuadY = controlY;
          previousCubicX = null;
          break;
        }
        case "A": {
          if (isRelative) throw new Error("relative arcs are not used in this source set");
          const rx = nextNumber();
          const ry = nextNumber();
          const rotation = nextNumber();
          const large = nextNumber();
          const sweep = nextNumber();
          const x = nextNumber();
          const y = nextNumber();
          commands.push({
            type: "A",
            rx,
            ry,
            rotation,
            large: large !== 0,
            sweep: sweep !== 0,
            x,
            y,
          });
          currentX = x;
          currentY = y;
          previousCubicX = null;
          previousQuadX = null;
          break;
        }
        default:
          throw new Error(`unsupported path command ${token.value}`);
      }
      firstGroup = false;
      if (!(tokens[index] && tokens[index].kind === "num")) break;
    }
  }
  return commands;
}

// --- SVG document parsing -----------------------------------------------------

function parseIconSvg(filePath, text) {
  const svgMatch = text.match(/<svg\b[^>]*>/);
  if (!svgMatch) throw new Error(`${filePath}: missing <svg> root`);
  const root = svgMatch[0];
  const name = (root.match(/data-name="([^"]+)"/) || [])[1];
  const colour = (root.match(/data-colour="([^"]+)"/) || [])[1];
  if (!name || !colour) throw new Error(`${filePath}: data-name and data-colour are required`);
  if (!HUE_KEYS[colour]) throw new Error(`${filePath}: unknown data-colour "${colour}"`);

  const shapes = [];
  const pathRe = /<path\b([^>]*?)\/?>/g;
  let pathMatch;
  while ((pathMatch = pathRe.exec(text)) !== null) {
    const attrs = pathMatch[1];
    const role = (attrs.match(/data-role="([^"]+)"/) || [])[1];
    const d = (attrs.match(/\bd="([^"]+)"/) || [])[1];
    if (!role) throw new Error(`${filePath}: path without data-role`);
    if (!["base", "detail", "mark"].includes(role)) {
      throw new Error(`${filePath}: unknown data-role "${role}"`);
    }
    if (!d) throw new Error(`${filePath}: path without d`);
    const filled = !/fill="none"/.test(attrs);
    const strokeWidth = (attrs.match(/stroke-width="([^"]+)"/) || [])[1];
    if (!filled && !strokeWidth) {
      throw new Error(`${filePath}: stroked path without stroke-width`);
    }
    if (filled && strokeWidth) {
      throw new Error(`${filePath}: filled path must not declare stroke-width`);
    }
    const cap = (attrs.match(/stroke-linecap="([^"]+)"/) || [])[1];
    const lineJoin = (attrs.match(/stroke-linejoin="([^"]+)"/) || [])[1];
    if (!filled && (cap !== "butt" || lineJoin !== "round")) {
      throw new Error(`${filePath}: strokes must use butt caps and round joins`);
    }
    shapes.push({
      role,
      filled,
      strokeWidth: strokeWidth ? Number(strokeWidth) : null,
      commands: parseSubpaths(d),
    });
  }
  if (shapes.length === 0) throw new Error(`${filePath}: no glyph paths`);
  return { name, colour, shapes };
}

// --- Kotlin emission -----------------------------------------------------------

function renderNodes(commands) {
  const nodes = commands.map((c) => {
    switch (c.type) {
      case "M":
        return `MoveTo(${float(c.x)}, ${float(c.y)})`;
      case "L":
        return `LineTo(${float(c.x)}, ${float(c.y)})`;
      case "C":
        return `CurveTo(${float(c.x1)}, ${float(c.y1)}, ${float(c.x2)}, ${float(c.y2)}, ${float(c.x)}, ${float(c.y)})`;
      case "Q":
        return `QuadTo(${float(c.x1)}, ${float(c.y1)}, ${float(c.x)}, ${float(c.y)})`;
      case "A":
        return `ArcTo(${float(c.rx)}, ${float(c.ry)}, ${float(c.rotation)}, ${c.large}, ${c.sweep}, ${float(c.x)}, ${float(c.y)})`;
      case "Z":
        return "Close";
      default:
        throw new Error(`unhandled command ${c.type}`);
    }
  });
  return `listOf(\n${nodes.map((n) => `                ${n},`).join("\n")}\n            )`;
}

function renderPathCalls(commands, indent) {
  const calls = commands.map((c) => {
    switch (c.type) {
      case "M":
        return `${indent}moveTo(${float(c.x)}, ${float(c.y)})`;
      case "L":
        return `${indent}lineTo(${float(c.x)}, ${float(c.y)})`;
      case "C":
        return `${indent}curveTo(${float(c.x1)}, ${float(c.y1)}, ${float(c.x2)}, ${float(c.y2)}, ${float(c.x)}, ${float(c.y)})`;
      case "Q":
        return `${indent}quadTo(${float(c.x1)}, ${float(c.y1)}, ${float(c.x)}, ${float(c.y)})`;
      case "A":
        return `${indent}arcTo(${float(c.rx)}, ${float(c.ry)}, ${float(c.rotation)}, ${c.large}, ${c.sweep}, ${float(c.x)}, ${float(c.y)})`;
      case "Z":
        return `${indent}close()`;
      default:
        throw new Error(`unhandled command ${c.type}`);
    }
  });
  return calls.join("\n");
}

function renderShape(shape, colour, indent, pathName) {
  const args = [];
  if (pathName) args.push(`name = "${pathName}"`);
  if (shape.filled) {
    args.push(`fill = SolidColor(${colour})`);
    args.push("fillAlpha = 1.0f");
    args.push("pathFillType = PathFillType.EvenOdd");
  } else {
    args.push(`stroke = SolidColor(${colour})`);
    args.push("strokeAlpha = 1.0f");
    args.push(`strokeLineWidth = ${float(shape.strokeWidth)}`);
    args.push("strokeLineCap = StrokeCap.Butt");
    args.push("strokeLineJoin = StrokeJoin.Round");
  }
  const lines = args.map((arg) => `${indent}    ${arg},`);
  return `${indent}path(\n${lines.join("\n")}\n${indent}) {\n${renderPathCalls(shape.commands, `${indent}    `)}\n${indent}}`;
}

const pascal = (name) => name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (c) => c.toUpperCase());

function renderTileBackground(fn, tileHex) {
  return [
    "        path(",
    `            name = "${fn}TileBackground",`,
    `            fill = SolidColor(${tileHex}),`,
    "            fillAlpha = 1.0f,",
    "        ) {",
    "            moveTo(6.0f, 0.0f)",
    "            lineTo(18.0f, 0.0f)",
    "            arcTo(6.0f, 6.0f, 0.0f, false, true, 24.0f, 6.0f)",
    "            lineTo(24.0f, 18.0f)",
    "            arcTo(6.0f, 6.0f, 0.0f, false, true, 18.0f, 24.0f)",
    "            lineTo(6.0f, 24.0f)",
    "            arcTo(6.0f, 6.0f, 0.0f, false, true, 0.0f, 18.0f)",
    "            lineTo(0.0f, 6.0f)",
    "            arcTo(6.0f, 6.0f, 0.0f, false, true, 6.0f, 0.0f)",
    "            close()",
    "        }",
  ].join("\n");
}

function renderIconFunctions(icon) {
  const fn = pascal(icon.name);
  const tileHex = argb(icon.tileHex);
  const white = "Color(0xFFFFFFFF)";
  const lines = [];
  lines.push(`    private fun ${fn}Free(): ImageVector = glyphVector("${fn}Free") {`);
  icon.shapes.forEach((shape, shapeIndex) => {
    const colour = shape.role === "mark" ? white : shape.role === "detail" ? icon.boldArgb : icon.baseArgb;
    lines.push(renderShape(shape, colour, "        ", `${fn}Glyph${shapeIndex + 1}${pascal(shape.role)}`));
  });
  lines.push("    }");
  lines.push("");
  lines.push(`    private fun ${fn}Tile(): ImageVector = glyphVector("${fn}Tile") {`);
  lines.push(renderTileBackground(fn, tileHex));
  icon.shapes.forEach((shape, shapeIndex) => {
    const colour = shape.role === "mark" ? tileHex : white;
    lines.push(renderShape(shape, colour, "        ", `${fn}Glyph${shapeIndex + 1}${pascal(shape.role)}`));
  });
  lines.push("    }");
  return lines.join("\n");
}

function renderKotlin(icons, tokensVersion) {
  const lines = [];
  lines.push("// Generated from design/icons by tools/design-icons/generate.mjs. Do not edit.");
  lines.push(`// Source convention: design/icons/README.md (design tokens v${tokensVersion}).`);
  lines.push("package au.com.heightsafety.app.theme");
  lines.push("");
  lines.push("import androidx.compose.foundation.layout.size");
  lines.push("import androidx.compose.material3.Icon");
  lines.push("import androidx.compose.runtime.Composable");
  lines.push("import androidx.compose.ui.Modifier");
  lines.push("import androidx.compose.ui.graphics.Color");
  lines.push("import androidx.compose.ui.graphics.PathFillType");
  lines.push("import androidx.compose.ui.graphics.SolidColor");
  lines.push("import androidx.compose.ui.graphics.StrokeCap");
  lines.push("import androidx.compose.ui.graphics.StrokeJoin");
  lines.push("import androidx.compose.ui.graphics.vector.ImageVector");
  lines.push("import androidx.compose.ui.graphics.vector.path");
  lines.push("import androidx.compose.ui.unit.Dp");
  lines.push("import androidx.compose.ui.unit.dp");
  lines.push("");
  lines.push("enum class HeightSafetyIcon(val label: String, val tileColor: Color) {");
  for (const icon of icons) {
    lines.push(`    ${pascal(icon.name)}("${icon.label}", ${argb(icon.tileHex)}),`);
  }
  lines.push("}");
  lines.push("");
  lines.push("// Free glyphs and tiles carry their fixed hue tokens; contentDescription is");
  lines.push("// supplied at each call site that is not purely decorative (DESIGN.md section 9).");
  lines.push("object HeightSafetyIcons {");
  for (const icon of icons) {
    const fn = pascal(icon.name);
    lines.push(`    val ${fn}: ImageVector by lazy { ${fn}Free() }`);
    lines.push(`    val ${fn}Tile: ImageVector by lazy { ${fn}Tile() }`);
  }
  lines.push("");
  lines.push("    fun freeVectorFor(icon: HeightSafetyIcon): ImageVector = when (icon) {");
  for (const icon of icons) {
    lines.push(`        HeightSafetyIcon.${pascal(icon.name)} -> ${pascal(icon.name)}`);
  }
  lines.push("    }");
  lines.push("");
  lines.push("    fun tileVectorFor(icon: HeightSafetyIcon): ImageVector = when (icon) {");
  for (const icon of icons) {
    lines.push(`        HeightSafetyIcon.${pascal(icon.name)} -> ${pascal(icon.name)}Tile`);
  }
  lines.push("    }");
  lines.push("}");
  lines.push("");
  lines.push("private inline fun glyphVector(");
  lines.push("    name: String,");
  lines.push("    builder: ImageVector.Builder.() -> Unit,");
  lines.push("): ImageVector = ImageVector.Builder(");
  lines.push("    name = name,");
  lines.push("    defaultWidth = 24.dp,");
  lines.push("    defaultHeight = 24.dp,");
  lines.push("    viewportWidth = 24.0f,");
  lines.push("    viewportHeight = 24.0f,");
  lines.push(").apply(builder).build()");
  lines.push("");
  for (const icon of icons) {
    lines.push(renderIconFunctions(icon));
    lines.push("");
  }
  lines.push("@Composable");
  lines.push("fun HeightSafetyIconTile(");
  lines.push("    icon: HeightSafetyIcon,");
  lines.push("    contentDescription: String?,");
  lines.push("    modifier: Modifier = Modifier,");
  lines.push("    size: Dp = 24.dp,");
  lines.push(") {");
  lines.push("    Icon(");
  lines.push("        imageVector = HeightSafetyIcons.tileVectorFor(icon),");
  lines.push("        contentDescription = contentDescription,");
  lines.push("        modifier = modifier.size(size),");
  lines.push("        tint = Color.Unspecified,");
  lines.push("    )");
  lines.push("}");
  lines.push("");
  lines.push("@Composable");
  lines.push("fun HeightSafetyFreeGlyph(");
  lines.push("    icon: HeightSafetyIcon,");
  lines.push("    contentDescription: String?,");
  lines.push("    modifier: Modifier = Modifier,");
  lines.push("    size: Dp = 24.dp,");
  lines.push(") {");
  lines.push("    Icon(");
  lines.push("        imageVector = HeightSafetyIcons.freeVectorFor(icon),");
  lines.push("        contentDescription = contentDescription,");
  lines.push("        modifier = modifier.size(size),");
  lines.push("        tint = Color.Unspecified,");
  lines.push("    )");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

// --- Main ----------------------------------------------------------------------

const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf8"));
const light = tokens.color.light;

const files = readdirSync(ICONS_DIR)
  .filter((file) => file.endsWith(".svg"))
  .sort();

const icons = files.map((file) => {
  const parsed = parseIconSvg(file, readFileSync(join(ICONS_DIR, file), "utf8"));
  const [baseKey, boldKey] = HUE_KEYS[parsed.colour];
  return {
    ...parsed,
    label: parsed.name,
    tileHex: light[baseKey],
    baseArgb: argb(light[baseKey]),
    boldArgb: argb(light[boldKey]),
  };
});

const names = new Set(icons.map((icon) => icon.name));
if (names.size !== icons.length) throw new Error("duplicate data-name values in design/icons");

const content = renderKotlin(icons, tokens.meta.version);

const mode = process.argv[2] ?? "--check";
if (mode !== "--generate" && mode !== "--check") {
  console.error("Usage: node tools/design-icons/generate.mjs [--generate|--check]");
  process.exit(1);
}

if (mode === "--generate") {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, content);
  console.log(`wrote ${relative(ROOT, OUT_PATH)}`);
  process.exit(0);
}

const staging = join(tmpdir(), `height-safety-design-icons-${process.pid}`);
rmSync(staging, { recursive: true, force: true });
const staged = join(staging, relative(ROOT, OUT_PATH));
mkdirSync(dirname(staged), { recursive: true });
writeFileSync(staged, content);
let current = "";
try {
  current = readFileSync(OUT_PATH, "utf8");
} catch {
  current = "";
}
rmSync(staging, { recursive: true, force: true });
if (current !== content) {
  console.error(`design icons out of date: ${relative(ROOT, OUT_PATH)}`);
  console.error("  run: pnpm run design-icons:generate");
  process.exit(1);
}
console.log("design icons check passed");
