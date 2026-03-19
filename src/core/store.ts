import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import type { VersionChange } from '../types.js';

export class VersionStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    const resolved = resolve(dbPath);
    mkdirSync(dirname(resolved), { recursive: true });

    this.db = new DatabaseSync(resolved);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS versions (
        package_name TEXT    NOT NULL,
        tag          TEXT    NOT NULL,
        version      TEXT    NOT NULL,
        updated_at   INTEGER NOT NULL,
        PRIMARY KEY (package_name, tag)
      );

      CREATE TABLE IF NOT EXISTS poll_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        polled_at    INTEGER NOT NULL,
        pkg_count    INTEGER NOT NULL,
        change_count INTEGER NOT NULL
      );
    `);
  }

  getVersion(packageName: string, tag: string): string | null {
    const row = this.db
      .prepare('SELECT version FROM versions WHERE package_name = ? AND tag = ?')
      .get(packageName, tag) as { version: string } | undefined;
    return row?.version ?? null;
  }

  setVersion(packageName: string, tag: string, version: string): void {
    this.db
      .prepare(`
        INSERT INTO versions (package_name, tag, version, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(package_name, tag) DO UPDATE SET
          version    = excluded.version,
          updated_at = excluded.updated_at
      `)
      .run(packageName, tag, version, Date.now());
  }

  applyChanges(changes: VersionChange[]): void {
    const upsert = this.db.prepare(`
      INSERT INTO versions (package_name, tag, version, updated_at)
      VALUES ($packageName, $tag, $newVersion, $detectedAt)
      ON CONFLICT(package_name, tag) DO UPDATE SET
        version    = excluded.version,
        updated_at = excluded.updated_at
    `);

    this.db.exec('BEGIN');
    try {
      for (const c of changes) {
        upsert.run({
          $packageName: c.packageName,
          $tag: c.tag,
          $newVersion: c.newVersion,
          $detectedAt: c.detectedAt,
        });
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  logPollRun(pkgCount: number, changeCount: number): void {
    this.db
      .prepare('INSERT INTO poll_log (polled_at, pkg_count, change_count) VALUES (?, ?, ?)')
      .run(Date.now(), pkgCount, changeCount);
  }

  close(): void {
    this.db.close();
  }
}
