import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VersionStore } from '../src/core/store.js';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(import.meta.dirname, '.tmp-store');
const STATE_PATH = join(TEST_DIR, 'state.json');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('VersionStore', () => {
  it('starts empty when no file exists', () => {
    const store = new VersionStore(STATE_PATH);
    expect(store.isEmpty()).toBe(true);
    expect(store.getVersion('@aztec/aztec.js', 'rc')).toBeNull();
  });

  it('creates the data directory if missing', () => {
    const nested = join(TEST_DIR, 'deep', 'nested', 'state.json');
    const store = new VersionStore(nested);
    store.save();
    expect(existsSync(nested)).toBe(true);
  });

  it('stores and retrieves versions after applyChanges + save', () => {
    const store = new VersionStore(STATE_PATH);
    store.applyChanges([
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: null, newVersion: '4.1.0-rc.5', detectedAt: Date.now() },
      { packageName: '@aztec/pxe', tag: 'latest', oldVersion: '4.0.0', newVersion: '4.1.0', detectedAt: Date.now() },
    ]);
    store.save();

    // Reload from disk
    const store2 = new VersionStore(STATE_PATH);
    expect(store2.isEmpty()).toBe(false);
    expect(store2.getVersion('@aztec/aztec.js', 'rc')).toBe('4.1.0-rc.5');
    expect(store2.getVersion('@aztec/pxe', 'latest')).toBe('4.1.0');
    expect(store2.getVersion('@aztec/pxe', 'rc')).toBeNull(); // different tag
  });

  it('overwrites older version on re-apply', () => {
    const store = new VersionStore(STATE_PATH);
    store.applyChanges([
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: null, newVersion: '4.1.0-rc.4', detectedAt: Date.now() },
    ]);
    store.applyChanges([
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: Date.now() },
    ]);
    store.save();

    const store2 = new VersionStore(STATE_PATH);
    expect(store2.getVersion('@aztec/aztec.js', 'rc')).toBe('4.1.0-rc.5');
  });

  it('recovers gracefully from corrupted JSON', () => {
    writeFileSync(STATE_PATH, 'not valid json {{{', 'utf8');
    const store = new VersionStore(STATE_PATH);
    expect(store.isEmpty()).toBe(true); // fell back to empty
  });

  it('recovers from empty file', () => {
    writeFileSync(STATE_PATH, '', 'utf8');
    const store = new VersionStore(STATE_PATH);
    expect(store.isEmpty()).toBe(true);
  });

  it('does not persist until save() is called', () => {
    const store = new VersionStore(STATE_PATH);
    store.applyChanges([
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: null, newVersion: '4.1.0-rc.5', detectedAt: Date.now() },
    ]);
    // No save() — file should not exist
    expect(existsSync(STATE_PATH)).toBe(false);
  });

  it('writes valid JSON to disk', () => {
    const store = new VersionStore(STATE_PATH);
    store.applyChanges([
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: null, newVersion: '4.1.0-rc.5', detectedAt: Date.now() },
    ]);
    store.save();

    const raw = readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ '@aztec/aztec.js@rc': '4.1.0-rc.5' });
  });
});
