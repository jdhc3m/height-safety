import path from 'node:path';

import { runRendererWorker } from './render.mjs';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('Usage: worker-forced-exit.mjs <output-directory>');

const stalledBrowser = {
  close() {
    return new Promise(() => {});
  },
  async newPage() {
    return {
      async route() {},
      async setContent() {},
      async waitForFunction() {},
      pdf() { return new Promise(() => {}); },
      close() { return new Promise(() => {}); },
    };
  },
};

await runRendererWorker({
  argumentsList: [
    `--output-dir=${path.resolve(outputDir)}`,
    '--variant=forced-exit-regression',
    '--render-timeout-ms=20',
    '--teardown-timeout-ms=20',
  ],
  launchBrowserFn: async () => stalledBrowser,
});

throw new Error('Forced-exit regression unexpectedly returned');
