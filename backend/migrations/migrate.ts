require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const db = require('../models/database');

const SCRIPTS_DIR = path.join(__dirname, 'scripts');

const ensureMigrationsTable = () =>
  new Promise<void>((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => { if (err) reject(err); else resolve(); },
    );
  });

const getAppliedMigrations = (): Promise<string[]> =>
  new Promise((resolve, reject) => {
    db.all('SELECT name FROM migrations ORDER BY id ASC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows ? rows.map((r: any) => r.name) : []);
    });
  });

const recordMigration = (name: string) =>
  new Promise<void>((resolve, reject) => {
    db.run('INSERT INTO migrations (name) VALUES (?)', [name], (err) => {
      if (err) reject(err); else resolve();
    });
  });

const removeMigration = (name: string) =>
  new Promise<void>((resolve, reject) => {
    db.run('DELETE FROM migrations WHERE name = ?', [name], (err) => {
      if (err) reject(err); else resolve();
    });
  });

const getAllMigrationFiles = () => {
  if (!fs.existsSync(SCRIPTS_DIR)) return [];
  return fs.readdirSync(SCRIPTS_DIR)
    .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
    .sort();
};

const loadModule = (filename: string) => {
  const fullPath = path.join(SCRIPTS_DIR, filename);
  delete require.cache[require.resolve(fullPath)];
  return require(fullPath);
};

const migrateUp = async () => {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const pending = getAllMigrationFiles().filter((f: string) => !applied.includes(f));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return;
  }

  for (const file of pending) {
    logger.info({ migration: file }, 'Applying migration');
    const mod = loadModule(file);
    if (typeof mod.up !== 'function') throw new Error(`${file} missing up()`);
    await mod.up(db);
    await recordMigration(file);
    logger.info({ migration: file }, 'Applied');
  }
};

const migrateDown = async () => {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  if (applied.length === 0) { logger.info('Nothing to roll back'); return; }

  const last = applied[applied.length - 1];
  logger.info({ migration: last }, 'Rolling back');
  const mod = loadModule(last);
  if (typeof mod.down !== 'function') throw new Error(`${last} missing down()`);
  await mod.down(db);
  await removeMigration(last);
  logger.info({ migration: last }, 'Rolled back');
};

const migrateStatus = async () => {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const all = getAllMigrationFiles();
  console.log('\nMigration status:\n');
  for (const file of all) {
    console.log(`  ${applied.includes(file) ? '✓ applied' : '✗ pending'}  ${file}`);
  }
  console.log('');
};

const main = async () => {
  const cmd = process.argv[2];
  try {
    if (cmd === 'up') await migrateUp();
    else if (cmd === 'down') await migrateDown();
    else if (cmd === 'status') await migrateStatus();
    else { console.log('Usage: tsx migrations/migrate.ts [up|down|status]'); process.exit(1); }
    db.close(() => process.exit(0));
  } catch (err: any) {
    logger.error({ err: err.message }, 'Migration failed');
    db.close(() => process.exit(1));
  }
};

main();
