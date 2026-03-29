import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(import.meta.dirname, '.tmp-scheduler');
const STATE_PATH = join(TEST_DIR, 'state.json');
const CONFIG_PATH = join(TEST_DIR, 'config.yaml');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function writeTestConfig(statePath: string = STATE_PATH): void {
  writeFileSync(CONFIG_PATH, `
packages:
  - name: "@aztec/aztec.js"
    tags: [rc]
notify: {}
state_path: ${statePath}
  `, 'utf8');
}

function mockNpmResponse(version: string) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ name: '@aztec/aztec.js', 'dist-tags': { rc: version } }),
  } as Response);
}

// Import after mocking
async function importScheduler() {
  const { runOnce, buildSinks } = await import('../src/core/scheduler.js');
  const { loadConfig } = await import('../src/config.js');
  return { runOnce, buildSinks, loadConfig };
}

describe('scheduler.runOnce', () => {
  it('seeds state on first run without notifying', async () => {
    writeTestConfig();
    mockNpmResponse('4.1.0-rc.5');

    const { runOnce, loadConfig } = await importScheduler();
    const config = loadConfig(CONFIG_PATH);
    config.state_path = STATE_PATH;

    await runOnce(config);

    const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    expect(state['@aztec/aztec.js@rc']).toBe('4.1.0-rc.5');
  });

  it('detects no changes on second run with same version', async () => {
    writeTestConfig();
    mockNpmResponse('4.1.0-rc.5');

    const { runOnce, loadConfig } = await importScheduler();
    const config = loadConfig(CONFIG_PATH);
    config.state_path = STATE_PATH;

    // First run: seed
    await runOnce(config);

    // Second run: no changes
    await runOnce(config);

    // State unchanged
    const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    expect(state['@aztec/aztec.js@rc']).toBe('4.1.0-rc.5');
  });

  it('detects version change on subsequent run', async () => {
    writeTestConfig();

    // Seed with old version
    writeFileSync(STATE_PATH, JSON.stringify({ '@aztec/aztec.js@rc': '4.1.0-rc.4' }), 'utf8');
    mockNpmResponse('4.1.0-rc.5');

    const { runOnce, loadConfig } = await importScheduler();
    const config = loadConfig(CONFIG_PATH);
    config.state_path = STATE_PATH;

    // No sinks configured, so it just logs changes and saves state
    await runOnce(config);

    const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    expect(state['@aztec/aztec.js@rc']).toBe('4.1.0-rc.5');
  });
});

describe('buildSinks', () => {
  it('returns empty array when no notify config', async () => {
    const { buildSinks } = await importScheduler();
    const sinks = buildSinks({
      packages: [],
      notify: {},
      state_path: STATE_PATH,
    });
    expect(sinks).toHaveLength(0);
  });

  it('creates SlackSink when webhook is configured', async () => {
    const { buildSinks } = await importScheduler();
    const sinks = buildSinks({
      packages: [],
      notify: { slack: { webhook_url: 'https://hooks.slack.com/test' } },
      state_path: STATE_PATH,
    });
    expect(sinks).toHaveLength(1);
    expect(sinks[0].name).toBe('slack');
  });
});
