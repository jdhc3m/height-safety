#!/usr/bin/env node
// Derives the tile and free-glyph SVG variants and the owner-review contact
// sheet from the authored glyph sources in design/icons/ (see
// design/icons/README.md for the source convention and design/DESIGN.md §9
// for the icon system rules). Palette values are read from design/tokens.json
// so hue changes flow through a single regeneration.
//
// This ticket (T2a, issue #35) stops at SVG sources, variants and the contact
// sheet. Generating Android ImageVectors or the web SVG sprite is T2b
// (issue #66) and must not start until the owner approves this source set.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ICONS_DIR = join(ROOT, "design", "icons");
const TOKENS_PATH = join(ROOT, "design", "tokens.json");
const FREE_DIR = join(ICONS_DIR, "free");
const TILE_DIR = join(ICONS_DIR, "tile");
const SHEET_PATH = join(ICONS_DIR, "contact-sheet.html");

// Icon inventory from design/DESIGN.md §9, in display order. The generator
// fails unless every entry has an authored source and no extra sources exist.
const INVENTORY = [
  ["jobs", "Jobs", "blue", "navigation"],
  ["sites", "Sites", "teal", "navigation"],
  ["anchors", "Anchors", "orange", "navigation"],
  ["reports", "Reports", "green", "navigation"],
  ["review-queue", "Review queue", "purple", "navigation"],
  ["sync", "Sync", "blue", "navigation"],
  ["account", "Account", "blue", "navigation"],
  ["settings", "Settings", "slate", "navigation"],
  ["roof-anchor", "Roof anchor", "teal", "navigation"],
  ["roof-zone", "Roof zone", "teal", "navigation"],
  ["building", "Building", "purple", "navigation"],
  ["client", "Client", "purple", "navigation"],
  ["job-pack", "Job pack", "purple", "navigation"],
  ["register", "Register", "teal", "navigation"],
  ["photo", "Photo", "purple", "navigation"],
  ["location", "Location", "blue", "navigation"],
  ["schedule", "Schedule", "teal", "navigation"],
  ["inspect", "Inspect", "blue", "action"],
  ["capture-photo", "Capture photo", "purple", "action"],
  ["sign", "Sign", "green", "action"],
  ["submit", "Submit", "blue", "action"],
  ["export-pdf", "Export PDF", "purple", "action"],
  ["comment", "Comment", "blue", "action"],
  ["request-changes", "Request changes", "orange", "action"],
  ["found-anchor", "Found anchor (new)", "purple", "action"],
  ["retry", "Retry", "red", "action"],
  ["serviceable", "Serviceable", "green", "status"],
  ["defective", "Defective", "red", "status"],
  ["not-inspected", "Not inspected", "slate", "status"],
  ["further-assessment", "Further assessment", "yellow", "status"],
  ["overdue-lease-ending", "Overdue / lease ending", "red", "status"],
  ["not-synced", "Not synced", "slate", "status"],
  ["sending", "Sending", "blue", "status"],
  ["synced", "Synced", "green", "status"],
  ["conflict", "Conflict", "orange", "status"],
  ["offline", "Offline", "yellow", "status"],
  ["changes-requested", "Changes requested", "yellow", "status"],
  ["under-review", "Under review", "purple", "status"],
  ["removed-from-service", "Removed from service", "slate", "status"],
];

const SECTION_TITLES = {
  navigation: "Navigation and objects",
  action: "Actions",
  status: "Status (fixed meanings)",
};

const ROLES = new Set(["base", "detail", "mark", "accent", "accent-mark"]);
// Vocabulary the product never claims (AGENTS.md language rule).
const FORBIDDEN = [/certified/i, /compliant/i, /passed inspection/i, /approved by engineer/i];

const fail = (message) => {
  throw new Error(`design-icons: ${message}`);
};

const readTokens = () => {
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf8"));
  const keyPairs = {
    blue: ["brandPrimary", "brandPrimaryPressed"],
    teal: ["teal", "tealBold"],
    purple: ["purple", "purpleBold"],
    green: ["green", "greenBold"],
    orange: ["orange", "orangeBold"],
    red: ["red", "redBold"],
    yellow: ["yellow", "yellowBold"],
    slate: ["slate", "slateBold"],
  };
  const hues = {};
  for (const [hue, [baseKey, boldKey]] of Object.entries(keyPairs)) {
    const base = tokens.color.light[baseKey];
    const bold = tokens.color.light[boldKey];
    if (!base || !bold) fail(`tokens.json is missing ${baseKey}/${boldKey} for hue "${hue}"`);
    if (tokens.color.dark[baseKey] !== base || tokens.color.dark[boldKey] !== bold) {
      fail(`hue "${hue}" must be fixed across light and dark themes (DESIGN.md §9)`);
    }
    hues[hue] = [base, bold];
  }
  return hues;
};

const parseAttrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

const parseSource = (slug, expectedName, expectedColour) => {
  const file = join(ICONS_DIR, `${slug}.svg`);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    fail(`missing source design/icons/${slug}.svg for "${expectedName}"`);
  }
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) fail(`forbidden vocabulary in design/icons/${slug}.svg`);
  }
  const rootMatch = text.match(/<svg\b([^>]*)>/);
  if (!rootMatch) fail(`design/icons/${slug}.svg has no <svg> root`);
  const root = parseAttrs(rootMatch[1]);
  if (root.viewBox !== "0 0 24 24") fail(`design/icons/${slug}.svg must use viewBox="0 0 24 24"`);
  if (root["data-name"] !== expectedName) {
    fail(`design/icons/${slug}.svg data-name is "${root["data-name"]}", expected "${expectedName}" (DESIGN.md §9)`);
  }
  if (root["data-colour"] !== expectedColour) {
    fail(`design/icons/${slug}.svg data-colour is "${root["data-colour"]}", expected "${expectedColour}" (DESIGN.md §9)`);
  }

  const bodyStart = text.indexOf(">", text.indexOf("<svg")) + 1;
  const body = text.slice(bodyStart, text.lastIndexOf("</svg>"));
  const elements = [...body.matchAll(/<path\b([^>]*?)\/>/g)];
  const stray = body.replace(/<path\b[^>]*?\/>/g, "").trim();
  if (stray) fail(`design/icons/${slug}.svg contains non-<path> content: ${stray.slice(0, 60)}`);
  if (elements.length === 0) fail(`design/icons/${slug}.svg contains no <path> elements`);

  const paths = elements.map((match, index) => {
    const attrs = parseAttrs(match[1]);
    if (!attrs["data-role"]) fail(`design/icons/${slug}.svg path ${index + 1} is missing data-role`);
    if (!ROLES.has(attrs["data-role"])) {
      fail(`design/icons/${slug}.svg path ${index + 1} has unknown data-role "${attrs["data-role"]}"`);
    }
    if (!attrs.d) fail(`design/icons/${slug}.svg path ${index + 1} is missing d`);
    const stroked = attrs.fill === "none";
    if (stroked) {
      if (!attrs["stroke-width"] || !attrs["stroke-linecap"] || !attrs["stroke-linejoin"]) {
        fail(`design/icons/${slug}.svg stroked path ${index + 1} must set stroke-width, stroke-linecap and stroke-linejoin`);
      }
      if (attrs.stroke) {
        fail(`design/icons/${slug}.svg stroked path ${index + 1} must not set stroke; the role decides the colour`);
      }
      if (attrs["data-role"] === "accent" || attrs["data-role"] === "accent-mark") {
        fail(`design/icons/${slug}.svg stroked path ${index + 1}: stroked accent paths are not supported`);
      }
    } else {
      if (attrs["data-role"] === "accent") {
        if (!attrs.fill) {
          fail(`design/icons/${slug}.svg accent path ${index + 1} must carry an explicit fill (fixed colour meaning)`);
        }
      } else if (attrs.fill) {
        fail(`design/icons/${slug}.svg path ${index + 1} must not set fill; the role decides the colour`);
      }
    }
    return { role: attrs["data-role"], stroked, attrs };
  });
  return { slug, name: expectedName, colour: expectedColour, paths };
};

const renderSvg = (source, variant, hues) => {
  const [base, bold] = hues[source.colour];
  const glyphColour = (p) => {
    if (p.role === "accent") return p.attrs.fill;
    if (p.role === "accent-mark") return "#FFFFFF";
    if (variant === "free") {
      if (p.role === "base") return base;
      if (p.role === "detail") return bold;
      return "#FFFFFF";
    }
    if (p.role === "base" || p.role === "detail") return "#FFFFFF";
    return base;
  };
  const glyph = source.paths.map((p) => {
    const colour = glyphColour(p);
    const kept = ["d", "stroke-width", "stroke-linecap", "stroke-linejoin"]
      .filter((key) => p.attrs[key] !== undefined)
      .map((key) => `${key}="${p.attrs[key]}"`);
    const paint = p.stroked
      ? `fill="none" stroke="${colour}"`
      : `fill="${colour}" fill-rule="evenodd"`;
    return `  <path data-role="${p.role}" ${paint} ${kept.join(" ")}/>`;
  });
  const header =
    `<!-- Generated from design/icons/${source.slug}.svg by tools/design-icons/generate.mjs. Do not edit. -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-name="${source.name}" data-colour="${source.colour}" data-variant="${variant}">\n`;
  if (variant === "tile") {
    const tileRect = `  <rect data-role="tile" x="0" y="0" width="24" height="24" rx="6" fill="${base}"/>\n`;
    return header + tileRect + glyph.join("\n") + "\n</svg>\n";
  }
  return header + glyph.join("\n") + "\n</svg>\n";
};

const buildSources = () => {
  const present = new Set(
    readdirSync(ICONS_DIR).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)),
  );
  const sources = INVENTORY.map(([slug, name, colour]) => {
    present.delete(slug);
    return parseSource(slug, name, colour);
  });
  if (present.size > 0) {
    fail(`unlisted glyph sources present in design/icons/: ${[...present].sort().join(", ")} (DESIGN.md §9 is the full set)`);
  }
  return sources;
};

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const inlineSvg = (svg) => svg.replace(/^[\s\S]*?<svg/, "<svg").replace(/<\/svg>\s*$/, "</svg>");

const renderSheet = (sources, variants) => {
  const bySlug = new Map(sources.map((s) => [s.slug, s]));
  const card = (slug) => {
    const source = bySlug.get(slug);
    return `      <figure class="card">
        <span class="art"><span class="tile">${variants.tile[slug]}</span><span class="glyph">${variants.free[slug]}</span></span>
        <figcaption><strong>${escapeHtml(source.name)}</strong><em>${source.colour}</em></figcaption>
      </figure>`;
  };
  const section = (kind) => {
    const slugs = INVENTORY.filter((entry) => entry[3] === kind).map((entry) => entry[0]);
    return `    <section>
      <h2>${SECTION_TITLES[kind]}</h2>
      <div class="grid">
${slugs.map(card).join("\n")}
      </div>
    </section>`;
  };
  const theme = (name, label, hint) => `  <section class="theme ${name}">
    <h1>Height Safety icon set — ${label} contact sheet</h1>
    <p class="meta">${hint}</p>
${["navigation", "action", "status"].map(section).join("\n")}
  </section>`;
  const inventoryRows = sources
    .map(
      (s) =>
        `      <tr><td><code>design/icons/${s.slug}.svg</code></td><td>${escapeHtml(s.name)}</td><td>${s.colour}</td><td><code>design/icons/tile/${s.slug}.svg</code>, <code>design/icons/free/${s.slug}.svg</code></td></tr>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Height Safety icon set — T2a owner review contact sheet</title>
<style>
  body { margin: 0; font: 14px/1.5 Inter, system-ui, sans-serif; color: #172B4D; }
  .theme { padding: 28px 32px 36px; }
  .theme.light { background: #FFFFFF; }
  .theme.dark { background: #1E1F22; color: #F1F2F4; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; opacity: .75; margin: 26px 0 12px; }
  .meta { margin: 0 0 6px; opacity: .8; max-width: 80ch; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 10px; }
  .card { margin: 0; padding: 12px 10px 10px; border-radius: 12px; display: grid; justify-items: center; gap: 8px; background: rgba(127,127,127,.08); }
  .art { display: flex; align-items: center; gap: 14px; }
  .art svg { display: block; }
  .art .tile svg { width: 32px; height: 32px; }
  .art .glyph svg { width: 24px; height: 24px; }
  figcaption { display: grid; justify-items: center; gap: 2px; font-size: 11px; text-align: center; }
  figcaption em { font-style: normal; opacity: .65; }
  .footer { padding: 24px 32px; background: #F7F8FA; color: #172B4D; }
  .footer h2 { margin-top: 0; }
  .footer table { border-collapse: collapse; font-size: 12px; margin-top: 10px; }
  .footer td, .footer th { border: 1px solid rgba(23,43,77,.15); padding: 4px 10px; text-align: left; }
</style>
</head>
<body>
${theme("light", "light", "Draft for owner review (T2a, issue #35). The authored files under design/icons/ are the source of truth; the tile and free-glyph variants shown here are derived from them by tools/design-icons/generate.mjs. Tile colours and glyph hues are fixed tokens from design/tokens.json and do not change between themes. This ticket stops at SVG: Android ImageVector and web sprite generation is T2b (issue #66) and starts only after this set is approved and merged.")}
${theme("dark", "dark", "Dark theme: tile colours are unchanged and free glyphs keep the same fixed hues; only surfaces change (design/DESIGN.md §9).")}
<section class="footer">
  <h2>Source inventory (${sources.length} glyphs)</h2>
  <table>
    <tr><th>Authored source</th><th>Name (DESIGN.md §9)</th><th>Hue</th><th>Derived variants</th></tr>
${inventoryRows}
  </table>
  <p>The variants and this sheet are generated outputs gated by <code>tools/design-icons.sh --check</code>. Edit the authored sources, then regenerate with <code>tools/design-icons.sh --generate</code>.</p>
</section>
</body>
</html>
`;
};

const renderVariants = (sources, hues) => {
  const variants = { free: {}, tile: {} };
  for (const source of sources) {
    variants.free[source.slug] = renderSvg(source, "free", hues);
    variants.tile[source.slug] = renderSvg(source, "tile", hues);
  }
  return variants;
};

const walkSvgTree = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkSvgTree(path);
    return [path];
  });

const writeOutputs = (sources, hues) => {
  const variants = renderVariants(sources, hues);
  rmSync(FREE_DIR, { recursive: true, force: true });
  rmSync(TILE_DIR, { recursive: true, force: true });
  mkdirSync(FREE_DIR, { recursive: true });
  mkdirSync(TILE_DIR, { recursive: true });
  for (const source of sources) {
    writeFileSync(join(FREE_DIR, `${source.slug}.svg`), variants.free[source.slug]);
    writeFileSync(join(TILE_DIR, `${source.slug}.svg`), variants.tile[source.slug]);
  }
  writeFileSync(SHEET_PATH, renderSheet(sources, { free: mapInline(variants.free), tile: mapInline(variants.tile) }));
};

const mapInline = (map) =>
  Object.fromEntries(Object.entries(map).map(([slug, svg]) => [slug, inlineSvg(svg)]));

const main = () => {
  const mode = process.argv[2] ?? "--check";
  if (mode !== "--check" && mode !== "--generate") {
    console.error("Usage: generate.mjs [--check|--generate]");
    process.exit(2);
  }
  const hues = readTokens();
  const sources = buildSources();
  if (mode === "--generate") {
    writeOutputs(sources, hues);
    console.log(`design-icons: generated ${sources.length * 2} variant SVGs and the contact sheet`);
    return;
  }
  const variants = renderVariants(sources, hues);
  const inline = { free: mapInline(variants.free), tile: mapInline(variants.tile) };
  let drifted = false;
  const drift = (message) => {
    console.error(`design-icons: ${message}; run tools/design-icons.sh --generate`);
    drifted = true;
  };
  for (const source of sources) {
    const pairs = [
      [join(FREE_DIR, `${source.slug}.svg`), variants.free[source.slug]],
      [join(TILE_DIR, `${source.slug}.svg`), variants.tile[source.slug]],
    ];
    for (const [target, expected] of pairs) {
      let actual;
      try {
        actual = readFileSync(target, "utf8");
      } catch {
        drift(`missing generated variant ${target.replace(ROOT + "/", "")}`);
        continue;
      }
      if (actual !== expected) drift(`generated variant drifted from sources: ${target.replace(ROOT + "/", "")}`);
    }
  }
  let sheet;
  try {
    sheet = readFileSync(SHEET_PATH, "utf8");
  } catch {
    drift("missing design/icons/contact-sheet.html");
  }
  if (sheet !== undefined && sheet !== renderSheet(sources, inline)) {
    drift("contact sheet drifted from sources");
  }
  for (const path of walkSvgTree(ICONS_DIR)) {
    if (path === SHEET_PATH) continue;
    const text = readFileSync(path, "utf8");
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) fail(`forbidden vocabulary in ${path.replace(ROOT + "/", "")}`);
    }
  }
  if (drifted) process.exit(1);
  console.log(`design-icons: ${sources.length} sources, ${sources.length * 2} variants and the contact sheet are in sync`);
};

main();
