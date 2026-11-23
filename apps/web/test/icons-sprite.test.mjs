import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const spritePath = new URL('../public/icons.svg', import.meta.url);
const sprite = readFileSync(spritePath, 'utf8');
const sourcesDir = new URL('../../../design/icons/', import.meta.url);

const slugs = readdirSync(sourcesDir)
  .filter((name) => name.endsWith('.svg'))
  .map((name) => name.slice(0, -4))
  .sort();

const FORBIDDEN = [
  /certified/i,
  /compliant/i,
  /passed inspection/i,
  /approved by engineer/i,
];

test('sprite carries a free and tile symbol for every authored icon source', () => {
  assert.ok(slugs.length > 0);
  for (const slug of slugs) {
    assert.ok(
      sprite.includes(`<symbol id="hs-${slug}-free"`),
      `missing free symbol for ${slug}`,
    );
    assert.ok(
      sprite.includes(`<symbol id="hs-${slug}-tile"`),
      `missing tile symbol for ${slug}`,
    );
  }
  const symbolCount = (sprite.match(/<symbol /g) || []).length;
  assert.equal(symbolCount, slugs.length * 2);
});

test('free glyphs tint with currentColor plus token bold variables', () => {
  for (const slug of slugs) {
    const symbol = symbolFor(`hs-${slug}-free`);
    const fills = [...symbol.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map(
      (match) => match[1],
    );
    assert.ok(
      fills.some((fill) => fill === 'currentColor'),
      `free symbol ${slug} must tint with currentColor`,
    );
    const stray = fills.filter(
      (fill) =>
        fill !== 'currentColor' &&
        fill !== 'none' &&
        fill !== '#FFFFFF' &&
        !fill.startsWith('var(--hs-color-') &&
        !/^#[0-9a-f]{6}$/i.test(fill),
    );
    assert.deepEqual(stray, [], `free symbol ${slug} has unexpected paints`);
  }
});

test('tile glyphs paint the tile square from a CSS variable', () => {
  for (const slug of slugs) {
    const symbol = symbolFor(`hs-${slug}-tile`);
    const tileRect = symbol.match(/<path data-role="tile" fill="([^"]*)"/);
    assert.ok(tileRect, `tile symbol ${slug} lacks its tile path`);
    assert.match(tileRect[1], /^var\(--hs-color-[\w-]+, #[0-9a-f]{6}\)$/);
    assert.ok(
      /(?:fill|stroke)="#FFFFFF"/.test(symbol),
      `tile symbol ${slug} must render its glyph in white`,
    );
  }
});

test('sprite declares a 24px viewport on every symbol', () => {
  const symbols = [...sprite.matchAll(/<symbol id="[^"]+" viewBox="([^"]+)"/g)];
  assert.equal(symbols.length, slugs.length * 2);
  for (const [, viewBox] of symbols) {
    assert.equal(viewBox, '0 0 24 24');
  }
});

test('sprite carries no forbidden vocabulary', () => {
  for (const pattern of FORBIDDEN) {
    assert.ok(!pattern.test(sprite), `forbidden vocabulary ${pattern}`);
  }
});

function symbolFor(id) {
  const match = sprite.match(
    new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`),
  );
  assert.ok(match, `symbol ${id} not found`);
  return match[0];
}
