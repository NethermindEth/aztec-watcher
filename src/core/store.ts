import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import type { VersionChange } from '../types.js';

/**
 * Simple JSON file that maps "package@tag" → version string.
 * Example: { "@aztec/aztec.js@rc": "4.1.0-rc.5" }
 */

type StateMap = Record<string, string>;

export class VersionStore {
  private state: StateMap;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
    mkdirSync(dirname(this.filePath), { recursive: true });

    if (existsSync(this.filePath)) {
      try {
        this.state = JSON.parse(readFileSync(this.filePath, 'utf8'));
      } catch {
        console.warn(`[store] Warning: ${this.filePath} is corrupted — starting fresh`);
        this.state = {};
      }
    } else {
      this.state = {};
    }
  }

  private key(packageName: string, tag: string): string {
    return `${packageName}@${tag}`;
  }

  getVersion(packageName: string, tag: string): string | null {
    return this.state[this.key(packageName, tag)] ?? null;
  }

  applyChanges(changes: VersionChange[]): void {
    for (const c of changes) {
      this.state[this.key(c.packageName, c.tag)] = c.newVersion;
    }
  }

  isEmpty(): boolean {
    return Object.keys(this.state).length === 0;
  }

  save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.state, null, 2) + '\n', 'utf8');
  }
}
