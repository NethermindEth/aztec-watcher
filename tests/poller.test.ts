import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pollPackage, pollAll } from '../src/core/poller.js';
import type { VersionStore } from '../src/core/store.js';

// Minimal mock store
function mockStore(versions: Record<string, string> = {}): VersionStore {
  return {
    getVersion(pkg: string, tag: string) {
      return versions[`${pkg}@${tag}`] ?? null;
    },
  } as VersionStore;
}

describe('pollPackage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects a version change', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: '@aztec/aztec.js', 'dist-tags': { rc: '4.1.0-rc.5', latest: '4.1.0' } }),
    } as Response);

    const store = mockStore({ '@aztec/aztec.js@rc': '4.1.0-rc.4' });
    const result = await pollPackage('@aztec/aztec.js', ['rc'], store);

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].oldVersion).toBe('4.1.0-rc.4');
    expect(result.changes[0].newVersion).toBe('4.1.0-rc.5');
    expect(result.error).toBeUndefined();
  });

  it('reports no changes when version is the same', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: '@aztec/aztec.js', 'dist-tags': { rc: '4.1.0-rc.5' } }),
    } as Response);

    const store = mockStore({ '@aztec/aztec.js@rc': '4.1.0-rc.5' });
    const result = await pollPackage('@aztec/aztec.js', ['rc'], store);

    expect(result.changes).toHaveLength(0);
  });

  it('detects new version when store is empty (first run)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: '@aztec/aztec.js', 'dist-tags': { rc: '4.1.0-rc.5' } }),
    } as Response);

    const store = mockStore(); // empty
    const result = await pollPackage('@aztec/aztec.js', ['rc'], store);

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].oldVersion).toBeNull();
    expect(result.changes[0].newVersion).toBe('4.1.0-rc.5');
  });

  it('skips tags that do not exist on npm', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: '@aztec/aztec.js', 'dist-tags': { latest: '4.1.0' } }),
    } as Response);

    const store = mockStore();
    const result = await pollPackage('@aztec/aztec.js', ['rc', 'nightly'], store);

    // Only 'latest' exists but we didn't ask for it — so 0 changes
    expect(result.changes).toHaveLength(0);
  });

  it('handles 404 (package not found) gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const store = mockStore();
    const result = await pollPackage('@aztec/nonexistent', ['latest'], store);

    expect(result.changes).toHaveLength(0);
    expect(result.error).toContain('not found');
  });

  it('handles network errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const store = mockStore();
    const result = await pollPackage('@aztec/aztec.js', ['rc'], store);

    expect(result.changes).toHaveLength(0);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('checks multiple tags in one call', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: '@aztec/aztec.js', 'dist-tags': { rc: '4.1.0-rc.5', latest: '4.1.0' } }),
    } as Response);

    const store = mockStore({ '@aztec/aztec.js@rc': '4.1.0-rc.4', '@aztec/aztec.js@latest': '4.0.0' });
    const result = await pollPackage('@aztec/aztec.js', ['rc', 'latest'], store);

    expect(result.changes).toHaveLength(2);
  });
});

describe('pollAll', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('polls multiple packages and aggregates changes', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const name = (url as string).split('/').pop()!;
      return {
        ok: true,
        status: 200,
        json: async () => ({ name, 'dist-tags': { latest: '2.0.0' } }),
      } as Response;
    });

    const store = mockStore({ 'pkg-a@latest': '1.0.0', 'pkg-b@latest': '1.0.0' });
    const changes = await pollAll(
      [{ name: 'pkg-a', tags: ['latest'] }, { name: 'pkg-b', tags: ['latest'] }],
      store,
    );

    expect(changes).toHaveLength(2);
  });

  it('continues polling other packages when one fails', async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('network down');
      return {
        ok: true,
        status: 200,
        json: async () => ({ name: 'pkg-b', 'dist-tags': { latest: '2.0.0' } }),
      } as Response;
    });

    const store = mockStore({ 'pkg-b@latest': '1.0.0' });
    const changes = await pollAll(
      [{ name: 'pkg-a', tags: ['latest'] }, { name: 'pkg-b', tags: ['latest'] }],
      store,
    );

    // pkg-a failed but pkg-b still returned a change
    expect(changes).toHaveLength(1);
    expect(changes[0].packageName).toBe('pkg-b');
  });

  it('respects concurrency batching', async () => {
    let maxConcurrent = 0;
    let current = 0;

    vi.mocked(fetch).mockImplementation(async () => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await new Promise(r => setTimeout(r, 10));
      current--;
      return {
        ok: true,
        status: 200,
        json: async () => ({ name: 'x', 'dist-tags': { latest: '1.0.0' } }),
      } as Response;
    });

    const packages = Array.from({ length: 10 }, (_, i) => ({ name: `pkg-${i}`, tags: ['latest'] }));
    const store = mockStore();
    await pollAll(packages, store, 3);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});
