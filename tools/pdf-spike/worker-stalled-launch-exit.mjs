import { runRendererWorker } from './render.mjs';

setTimeout(() => process.kill(process.pid, 'SIGTERM'), 20);

await runRendererWorker({
  argumentsList: [
    '--render-timeout-ms=1000',
    '--teardown-timeout-ms=20',
  ],
  launchBrowserFn: () => new Promise(() => {}),
});

throw new Error('Stalled-launch regression unexpectedly returned');
