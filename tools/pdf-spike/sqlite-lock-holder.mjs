import { writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const [databasePath, markerPath, holdMsText] = process.argv.slice(2);
const holdMs = Number(holdMsText);
if (!databasePath || !markerPath || !Number.isFinite(holdMs) || holdMs <= 0) {
  throw new Error('Usage: sqlite-lock-holder.mjs <database> <marker> <hold-ms>');
}

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA busy_timeout = 5000');
database.exec('BEGIN IMMEDIATE');
await writeFile(markerPath, 'transaction started\n', 'utf8');
await new Promise((resolve) => setTimeout(resolve, holdMs));
database.exec('COMMIT');
database.close();
