import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const [databasePath, key, markerPath] = process.argv.slice(2);
if (!databasePath || !key || !markerPath) {
  throw new Error('Usage: sqlite-lock-crash.mjs <database> <report-key> <marker>');
}

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA busy_timeout = 5000');
database.exec('BEGIN IMMEDIATE');
database.prepare(`
  INSERT OR REPLACE INTO report_leases (
    report_key, owner_token, owner_pid, owner_hostname, lease_expires_at_ms
  ) VALUES (?, ?, ?, ?, ?)
`).run(key, 'uncommitted-owner', process.pid, 'local-test', Date.now() + 60000);
await writeFile(markerPath, 'transaction started\n', 'utf8');
await new Promise(() => {});
