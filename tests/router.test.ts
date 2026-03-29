import { describe, it, expect, vi } from 'vitest';
import { groupIntoEvents, dispatchEvents } from '../src/notify/router.js';
import type { VersionChange } from '../src/types.js';
import type { NotificationSink, ReleaseEvent } from '../src/notify/types.js';

describe('groupIntoEvents', () => {
  it('returns empty array for no changes', () => {
    expect(groupIntoEvents([])).toEqual([]);
  });

  it('groups monorepo bumps into one event', () => {
    const changes: VersionChange[] = [
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
      { packageName: '@aztec/accounts', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
      { packageName: '@aztec/pxe', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
    ];

    const events = groupIntoEvents(changes);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Aztec 4.1.0-rc.5');
    expect(events[0].changes).toHaveLength(3);
    expect(events[0].isDigest).toBe(true);
  });

  it('creates separate events for different tags', () => {
    const changes: VersionChange[] = [
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
      { packageName: '@aztec/aztec.js', tag: 'latest', oldVersion: '4.0.0', newVersion: '4.1.0', detectedAt: 1 },
    ];

    const events = groupIntoEvents(changes);
    expect(events).toHaveLength(2);
  });

  it('creates separate events for different versions on the same tag', () => {
    const changes: VersionChange[] = [
      { packageName: '@aztec/aztec.js', tag: 'latest', oldVersion: '4.0.0', newVersion: '4.1.0', detectedAt: 1 },
      { packageName: 'viem', tag: 'latest', oldVersion: '1.0.0', newVersion: '2.0.0', detectedAt: 1 },
    ];

    const events = groupIntoEvents(changes);
    expect(events).toHaveLength(2);
    // Title should show package count since versions differ
    const titles = events.map(e => e.title);
    expect(titles).toContain('Aztec 4.1.0');
    expect(titles).toContain('Aztec 2.0.0');
  });

  it('includes install command with tag shorthand when versions match', () => {
    const changes: VersionChange[] = [
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
      { packageName: '@aztec/pxe', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
    ];

    const events = groupIntoEvents(changes);
    expect(events[0].installCommand).toBe('npm install @aztec/aztec.js@rc @aztec/pxe@rc');
  });

  it('single package event is not a digest', () => {
    const changes: VersionChange[] = [
      { packageName: '@aztec/aztec.js', tag: 'rc', oldVersion: '4.1.0-rc.4', newVersion: '4.1.0-rc.5', detectedAt: 1 },
    ];

    const events = groupIntoEvents(changes);
    expect(events[0].isDigest).toBe(false);
  });
});

describe('dispatchEvents', () => {
  function makeSink(name: string, fn: () => Promise<void>): NotificationSink {
    return { name, send: fn };
  }

  it('returns true when sink succeeds', async () => {
    const sink = makeSink('test', async () => {});
    const event: ReleaseEvent = {
      title: 'Test',
      isDigest: false,
      changes: [{ packageName: 'x', tag: 'latest', oldVersion: '1', newVersion: '2' }],
      installCommand: 'npm install x@latest',
    };

    const result = await dispatchEvents([event], [sink]);
    expect(result).toBe(true);
  });

  it('returns false when all sinks fail', async () => {
    const sink = makeSink('broken', async () => { throw new Error('down'); });
    const event: ReleaseEvent = {
      title: 'Test',
      isDigest: false,
      changes: [{ packageName: 'x', tag: 'latest', oldVersion: '1', newVersion: '2' }],
      installCommand: 'npm install x@latest',
    };

    const result = await dispatchEvents([event], [sink]);
    expect(result).toBe(false);
  });

  it('returns true if at least one sink succeeds', async () => {
    const good = makeSink('good', async () => {});
    const bad = makeSink('bad', async () => { throw new Error('down'); });
    const event: ReleaseEvent = {
      title: 'Test',
      isDigest: false,
      changes: [{ packageName: 'x', tag: 'latest', oldVersion: '1', newVersion: '2' }],
      installCommand: 'npm install x@latest',
    };

    const result = await dispatchEvents([event], [good, bad]);
    expect(result).toBe(true);
  });

  it('returns false for empty events', async () => {
    const sink = makeSink('test', async () => {});
    const result = await dispatchEvents([], [sink]);
    expect(result).toBe(false);
  });

  it('calls send for each event × sink combination', async () => {
    const sendFn = vi.fn(async () => {});
    const sink = makeSink('test', sendFn);
    const events: ReleaseEvent[] = [
      { title: 'E1', isDigest: false, changes: [{ packageName: 'a', tag: 'latest', oldVersion: '1', newVersion: '2' }], installCommand: '' },
      { title: 'E2', isDigest: false, changes: [{ packageName: 'b', tag: 'latest', oldVersion: '1', newVersion: '2' }], installCommand: '' },
    ];

    await dispatchEvents(events, [sink]);
    expect(sendFn).toHaveBeenCalledTimes(2);
  });
});
