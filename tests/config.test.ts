import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(import.meta.dirname, '.tmp-config');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function writeConfig(content: string): string {
  const path = join(TEST_DIR, 'config.yaml');
  writeFileSync(path, content, 'utf8');
  return path;
}

describe('loadConfig', () => {
  it('loads a valid config', () => {
    const path = writeConfig(`
packages:
  - name: "@aztec/aztec.js"
    tags: [rc, latest]
notify: {}
    `);

    const config = loadConfig(path);
    expect(config.packages).toHaveLength(1);
    expect(config.packages[0].name).toBe('@aztec/aztec.js');
    expect(config.packages[0].tags).toEqual(['rc', 'latest']);
  });

  it('applies default values', () => {
    const path = writeConfig(`
packages:
  - name: "@aztec/aztec.js"
    tags: [latest]
    `);

    const config = loadConfig(path);
    expect(config.digest_window_seconds).toBe(300);
    expect(config.state_path).toBe('data/state.json');
    expect(config.notify).toEqual({});
  });

  it('interpolates ${ENV_VAR} from process.env', () => {
    process.env['TEST_WEBHOOK'] = 'https://hooks.slack.com/test';
    try {
      const path = writeConfig(`
packages:
  - name: "@aztec/aztec.js"
    tags: [latest]
notify:
  slack:
    webhook_url: \${TEST_WEBHOOK}
      `);

      const config = loadConfig(path);
      expect(config.notify.slack?.webhook_url).toBe('https://hooks.slack.com/test');
    } finally {
      delete process.env['TEST_WEBHOOK'];
    }
  });

  it('throws when env var is not set', () => {
    delete process.env['MISSING_VAR'];
    const path = writeConfig(`
packages:
  - name: "@aztec/aztec.js"
    tags: [latest]
notify:
  slack:
    webhook_url: \${MISSING_VAR}
    `);

    expect(() => loadConfig(path)).toThrow('MISSING_VAR');
  });

  it('throws when config file is missing', () => {
    expect(() => loadConfig('/nonexistent/path.yaml')).toThrow('not found');
  });

  it('throws when packages array is empty', () => {
    const path = writeConfig(`
packages: []
    `);

    expect(() => loadConfig(path)).toThrow('at least one');
  });

  it('throws when packages key is missing', () => {
    const path = writeConfig(`
notify: {}
    `);

    expect(() => loadConfig(path)).toThrow('at least one');
  });

  it('respects custom state_path', () => {
    const path = writeConfig(`
packages:
  - name: "@aztec/aztec.js"
    tags: [latest]
state_path: custom/path.json
    `);

    const config = loadConfig(path);
    expect(config.state_path).toBe('custom/path.json');
  });

  it('parses check_schnorr_class_id flag', () => {
    const path = writeConfig(`
packages:
  - name: "@aztec/accounts"
    tags: [rc]
    check_schnorr_class_id: true
    `);

    const config = loadConfig(path);
    expect(config.packages[0].check_schnorr_class_id).toBe(true);
  });
});
