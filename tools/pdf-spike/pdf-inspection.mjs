import { readFile } from 'node:fs/promises';

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const IMAGE_OPERATORS = new Set([
  OPS.paintImageMaskXObject,
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
]);

export async function inspectReportPdf(pdfPath, fixture) {
  const bytes = await readFile(pdfPath);
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    fontExtraProperties: true,
  });
  const document = await loadingTask.promise;
  const pageCount = document.numPages;
  const fontRecords = new Map();
  let imageCount = 0;
  let expectedContentPresent = true;
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(({ str }) => str).join(' ');
      const expectedText = pageNumber === 1
        ? [fixture.title, fixture.jurisdiction]
        : [`Anchor A-${String(pageNumber - 1).padStart(3, '0')}`];
      if (!expectedText.every((text) => pageText.includes(text))) expectedContentPresent = false;

      const operatorList = await page.getOperatorList();
      imageCount += operatorList.fnArray.filter((operator) => IMAGE_OPERATORS.has(operator)).length;
      for (const fontId of Object.keys(textContent.styles)) {
        const font = page.commonObjs.get(fontId);
        fontRecords.set(fontId, { name: font.name, missingFile: font.missingFile });
      }
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const fonts = [...fontRecords.values()];
  const hasEmbeddedFontStream = /\/FontFile(?:2|3)?\b/.test(bytes.toString('latin1'));
  return {
    pageCount,
    imageCount,
    expectedContentPresent,
    fontNames: [...new Set(fonts.map(({ name }) => name))].sort(),
    notoSansEmbedded: hasEmbeddedFontStream
      && fonts.some(({ name, missingFile }) => /NotoSans/i.test(name) && missingFile === false),
  };
}
