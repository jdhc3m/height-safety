export function calculateIntervalCpuPercent(previousCpuByPid, currentCpuByPid, elapsedMs) {
  if (!previousCpuByPid || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  const cpuDeltaMs = [...currentCpuByPid].reduce(
    (total, [pid, cpuTimeMs]) => previousCpuByPid.has(pid)
      ? total + Math.max(0, cpuTimeMs - previousCpuByPid.get(pid))
      : total,
    0,
  );
  return (cpuDeltaMs / elapsedMs) * 100;
}

export function createProcessMonitor({ rootPid, processSnapshot, sampleIntervalMs = 100, now = () => performance.now(), setIntervalFn = setInterval, clearIntervalFn = clearInterval }) {
  let peakRssKiB = 0;
  let peakIntervalCpuPercent = 0;
  let previousCpuByPid;
  let previousSampleAt;
  let sampleError;
  const sample = () => {
    try {
      const sampledAt = now();
      const rows = processSnapshot(rootPid);
      peakRssKiB = Math.max(peakRssKiB, rows.reduce((total, row) => total + row.rssKiB, 0));
      const currentCpuByPid = new Map(rows.map(({ pid, cpuTimeMs }) => [pid, cpuTimeMs]));
      if (previousCpuByPid && sampledAt > previousSampleAt) {
        peakIntervalCpuPercent = Math.max(
          peakIntervalCpuPercent,
          calculateIntervalCpuPercent(previousCpuByPid, currentCpuByPid, sampledAt - previousSampleAt),
        );
      }
      previousCpuByPid = currentCpuByPid;
      previousSampleAt = sampledAt;
    } catch (error) {
      sampleError ??= error;
    }
  };
  sample();
  const timer = setIntervalFn(sample, sampleIntervalMs);
  return () => {
    clearIntervalFn(timer);
    sample();
    if (sampleError) throw new Error('Process metric sampling failed; benchmark evidence is invalid', { cause: sampleError });
    return {
      peakRssMiB: Math.round(peakRssKiB / 1024),
      peakIntervalCpuPercent: Math.round(peakIntervalCpuPercent),
    };
  };
}

export function collectWorkerResult(child, argumentsList = []) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', (error) => finish(reject, error));
    child.once('close', (code, signal) => {
      if (code !== 0) {
        finish(reject, Object.assign(new Error(`worker failed ${code ?? signal} for ${argumentsList.join(' ')}: ${stderr}`), { code, signal }));
        return;
      }
      try {
        const resultLine = stdout.trim().split('\n').at(-1);
        if (!resultLine) throw new Error('worker produced no JSON output');
        finish(resolve, { code, signal, result: JSON.parse(resultLine) });
      } catch (error) {
        finish(reject, new Error(`worker returned invalid JSON for ${argumentsList.join(' ')}: ${error.message}; stderr: ${stderr}`, { cause: error }));
      }
    });
  });
}

export function singleRenderMemoryWithinLimit(cold, warm, limitMiB) {
  return Math.max(cold.peakRssMiB, warm.peakRssMiB) <= limitMiB;
}

export async function runMeasured(name, operation, startMonitor, now = () => performance.now()) {
  const stop = startMonitor();
  const started = now();
  let value;
  let measurements;
  try {
    value = await operation();
  } finally {
    measurements = stop();
  }
  return { name, durationMs: Math.round(now() - started), ...measurements, value };
}

export function evaluatePdfInspection(inspection, fixture) {
  return {
    expectedPageCount: inspection.pageCount === fixture.anchorCount + 1,
    expectedPageContent: inspection.expectedContentPresent === true,
    expectedPhotoCount: inspection.imageCount === fixture.anchorCount * fixture.photosPerAnchor,
    embeddedNotoSans: inspection.notoSansEmbedded === true,
  };
}
