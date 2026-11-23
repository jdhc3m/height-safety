import { performance } from 'node:perf_hooks';

export const REPORT_RENDER_TIMEOUT_MS = 60_000;

export interface ReportRenderDeadline {
  readonly deadlineAtMonotonicMs: number;
}

export class ReportRenderDeadlineExceededError extends Error {
  constructor(stage: string) {
    super(`${stage} exceeded the report render deadline`);
    this.name = 'ReportRenderDeadlineExceededError';
  }
}

export function createReportRenderDeadline(
  timeoutMs = REPORT_RENDER_TIMEOUT_MS,
): ReportRenderDeadline {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > REPORT_RENDER_TIMEOUT_MS
  ) {
    throw new RangeError(
      `report render timeout must be between 1 and ${REPORT_RENDER_TIMEOUT_MS} ms`,
    );
  }
  return { deadlineAtMonotonicMs: performance.now() + timeoutMs };
}

export function remainingReportRenderTimeMs(
  deadline: ReportRenderDeadline,
  stage: string,
): number {
  const remaining = deadline.deadlineAtMonotonicMs - performance.now();
  if (remaining <= 0) {
    throw new ReportRenderDeadlineExceededError(stage);
  }
  return Math.max(1, Math.ceil(remaining));
}

export function assertReportRenderTimeRemaining(
  deadline: ReportRenderDeadline,
  stage: string,
): void {
  remainingReportRenderTimeMs(deadline, stage);
}

export async function withReportRenderDeadline<T>(
  deadline: ReportRenderDeadline,
  stage: string,
  operation: (signal: AbortSignal) => Promise<T>,
  cancel?: () => void | Promise<void>,
): Promise<T> {
  const timeoutMs = remainingReportRenderTimeMs(deadline, stage);
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          const error = new ReportRenderDeadlineExceededError(stage);
          controller.abort(error);
          try {
            const cancellation = cancel?.();
            if (cancellation) void cancellation.catch(() => undefined);
          } catch {
            // The deadline error remains authoritative; bounded teardown checks
            // whether the underlying browser actually stopped.
          }
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
