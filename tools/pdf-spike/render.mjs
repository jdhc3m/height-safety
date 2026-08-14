import process from 'node:process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  closeBrowserBounded,
  launchBrowser,
  loadFixture,
  renderReport,
  ROOT,
  WorkerTerminationRequiredError,
} from './render-core.mjs';

function option(argumentsList, name, fallback) {
  const prefix = `--${name}=`;
  return argumentsList.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

async function launchBrowserBounded(launchBrowserFn, signal, timeoutMs) {
  const launch = new AbortController();
  const abortLaunch = () => launch.abort(signal.reason ?? new Error('Renderer shutdown during browser launch'));
  if (signal.aborted) abortLaunch();
  else signal.addEventListener('abort', abortLaunch, { once: true });
  const timer = setTimeout(
    () => launch.abort(new Error(`Browser launch exceeded ${timeoutMs} ms`)),
    timeoutMs,
  );
  try {
    if (launch.signal.aborted) throw launch.signal.reason;
    return await Promise.race([
      Promise.resolve().then(launchBrowserFn),
      new Promise((_, reject) => {
        launch.signal.addEventListener('abort', () => reject(launch.signal.reason), { once: true });
      }),
    ]);
  } catch (error) {
    if (launch.signal.aborted) {
      throw new WorkerTerminationRequiredError(
        `${launch.signal.reason?.message ?? 'Browser launch interrupted'}; browser launch state is unknown`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abortLaunch);
  }
}

export async function runRendererWorker({
  argumentsList = process.argv.slice(2),
  launchBrowserFn = launchBrowser,
} = {}) {
  const fixturePath = path.resolve(option(argumentsList, 'fixture', path.join(ROOT, 'fixtures/reports/representative-photo-heavy-report.json')));
  const outputDir = path.resolve(option(argumentsList, 'output-dir', path.join(ROOT, '.tools/pdf-spike/manual')));
  const variant = option(argumentsList, 'variant', 'baseline');
  const delayMs = Number(option(argumentsList, 'delay-ms', '0'));
  const postRenderDelayMs = Number(option(argumentsList, 'post-render-delay-ms', '0'));
  const renderTimeoutMs = Number(option(argumentsList, 'render-timeout-ms', '60000'));
  const teardownTimeoutMs = Number(option(argumentsList, 'teardown-timeout-ms', '1000'));
  const contentionMarker = option(argumentsList, 'contention-marker', '');
  const shutdown = new AbortController();
  let browser;
  let stopping = false;

  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = signal === 'SIGTERM' ? 143 : 130;
    shutdown.abort(new Error(`Render interrupted by ${signal}`));
  };
  const onSigterm = () => stop('SIGTERM');
  const onSigint = () => stop('SIGINT');
  process.on('SIGTERM', onSigterm);
  process.on('SIGINT', onSigint);

  try {
    browser = await launchBrowserBounded(launchBrowserFn, shutdown.signal, renderTimeoutMs);
    const result = await renderReport({
      browser,
      fixture: await loadFixture(fixturePath),
      outputDir,
      variant,
      delayMs,
      postRenderDelayMs,
      renderTimeoutMs,
      teardownTimeoutMs,
      signal: shutdown.signal,
      onLockContention: contentionMarker ? () => writeFile(contentionMarker, 'waiting\n', 'utf8') : undefined,
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    if (error?.workerTerminationRequired) {
      console.error(`${error.message}; forcing renderer worker exit`);
      process.exit(70);
    }
    if (!stopping) throw error;
  } finally {
    process.off('SIGTERM', onSigterm);
    process.off('SIGINT', onSigint);
    try {
      await closeBrowserBounded(browser, teardownTimeoutMs, 'Browser termination during renderer worker exit');
    } catch {
      console.error('Browser termination failed during renderer worker exit; forcing exit');
      process.exit(70);
    }
  }
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  await runRendererWorker();
}
