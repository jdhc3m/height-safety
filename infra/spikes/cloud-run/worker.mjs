import { createServer } from 'node:http';
import process from 'node:process';

import { executeJob, validateJob } from './worker-support.mjs';

const port = Number(process.env.PORT ?? '8080');
let activeRequests = 0;

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 4096) throw new Error('request body exceeds 4096 bytes');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"status":"ok"}\n');
    return;
  }
  if (request.method !== 'POST' || request.url !== '/render') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end('{"error":"not found"}\n');
    return;
  }

  activeRequests += 1;
  const startedAt = Date.now();
  let job;
  try {
    job = validateJob(await readJson(request));
    const result = await executeJob(job);
    console.log(JSON.stringify({ event: 'render-complete', jobId: job.jobId, mode: job.mode, durationMs: Date.now() - startedAt }));
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(`${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(JSON.stringify({ event: 'render-failed', jobId: job?.jobId ?? 'unparsed', mode: job?.mode ?? 'unparsed', message: error.message }));
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end('{"error":"render failed"}\n');
  } finally {
    activeRequests -= 1;
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'worker-ready', port, rendererConcurrency: 1 }));
});

process.on('SIGTERM', () => {
  console.log(JSON.stringify({ event: 'worker-stopping', activeRequests }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(143), 9000).unref();
});
