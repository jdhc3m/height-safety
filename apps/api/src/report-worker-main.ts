import { NestFactory } from '@nestjs/core';

import { createTenantContext } from './database/tenant-context';
import { AppModule } from './app.module';
import {
  ReportGenerationWorker,
  type ReportWorkerOutcome,
} from './reports/report-generation-worker';
import { ReportWorkerTerminationRequiredError } from './reports/report-renderer';

function workerCompanyId(): string {
  const companyId = process.env.HEIGHT_SAFETY_REPORT_WORKER_COMPANY_ID?.trim();
  if (!companyId) {
    throw new Error(
      'HEIGHT_SAFETY_REPORT_WORKER_COMPANY_ID is required for the scoped local report worker',
    );
  }
  return createTenantContext(companyId).companyId;
}

function pollIntervalMs(): number {
  const value = Number(
    process.env.HEIGHT_SAFETY_REPORT_WORKER_POLL_MS ?? '1000',
  );
  if (!Number.isSafeInteger(value) || value < 100 || value > 60_000) {
    throw new Error(
      'report worker poll interval must be between 100 and 60000 ms',
    );
  }
  return value;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function run(): Promise<void> {
  const companyId = workerCompanyId();
  const once = process.argv.includes('--once');
  const pollMs = pollIntervalMs();
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const worker = application.get(ReportGenerationWorker);
    do {
      const outcome: ReportWorkerOutcome = await worker.runOnce(companyId);
      process.stdout.write(`report_worker outcome=${outcome}\n`);
      if (once) break;
      if (outcome === 'idle') await wait(pollMs);
    } while (true);
  } finally {
    await application.close();
  }
}

run().catch((error: unknown) => {
  if (error instanceof ReportWorkerTerminationRequiredError) {
    process.stderr.write('report_worker renderer_shutdown=required\n');
    process.exit(70);
  }
  process.stderr.write('report_worker failed\n');
  process.exitCode = 1;
});
