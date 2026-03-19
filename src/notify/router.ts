import type { VersionChange } from '../types.js';
import type { ReleaseEvent, NotificationSink } from './types.js';

function buildInstallCommand(changes: VersionChange[]): string {
  // Group by tag. If all packages on a tag share the same new version,
  // use the tag name (e.g. @rc). Otherwise pin explicitly.
  const byTag = new Map<string, VersionChange[]>();
  for (const c of changes) {
    const existing = byTag.get(c.tag) ?? [];
    byTag.set(c.tag, [...existing, c]);
  }

  const parts: string[] = [];
  for (const [tag, tagged] of byTag) {
    const versions = new Set(tagged.map(c => c.newVersion));
    if (versions.size === 1) {
      for (const c of tagged) parts.push(`${c.packageName}@${tag}`);
    } else {
      for (const c of tagged) parts.push(`${c.packageName}@${c.newVersion}`);
    }
  }

  return `npm install ${parts.join(' ')}`;
}

function buildTitle(changes: VersionChange[]): string {
  const versions = [...new Set(changes.map(c => c.newVersion))];
  if (versions.length === 1) {
    const v = versions[0];
    return `Aztec ${v}`;
  }
  return `Aztec package updates (${changes.length} packages)`;
}

// Group VersionChange[] into ReleaseEvent[].
// Key insight: all Aztec monorepo packages bump to the same version simultaneously.
// Group by {tag}::{newVersion} so the whole release becomes one digest message.
export function groupIntoEvents(changes: VersionChange[]): ReleaseEvent[] {
  if (changes.length === 0) return [];

  const groups = new Map<string, VersionChange[]>();
  for (const change of changes) {
    const key = `${change.tag}::${change.newVersion}`;
    const existing = groups.get(key) ?? [];
    groups.set(key, [...existing, change]);
  }

  const events: ReleaseEvent[] = [];
  for (const [, grouped] of groups) {
    events.push({
      title: buildTitle(grouped),
      isDigest: grouped.length > 1,
      changes: grouped.map(c => ({
        packageName: c.packageName,
        tag: c.tag,
        oldVersion: c.oldVersion,
        newVersion: c.newVersion,
      })),
      installCommand: buildInstallCommand(grouped),
    });
  }

  return events;
}

// Dispatch events to all sinks. One sink failing does not block others.
export async function dispatchEvents(
  events: ReleaseEvent[],
  sinks: NotificationSink[]
): Promise<void> {
  for (const event of events) {
    for (const sink of sinks) {
      try {
        await sink.send(event);
        console.log(`[router] → ${sink.name}: ${event.title}`);
      } catch (err) {
        console.error(`[router] ${sink.name} failed: ${(err as Error).message}`);
      }
    }
  }
}
