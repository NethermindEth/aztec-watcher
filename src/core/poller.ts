import type { NpmRegistryResponse, VersionChange } from '../types.js';
import type { VersionStore } from './store.js';

const REGISTRY_BASE = 'https://registry.npmjs.org';

async function fetchDistTags(packageName: string): Promise<Record<string, string>> {
  const url = `${REGISTRY_BASE}/${encodeURIComponent(packageName)}`;

  const res = await fetch(url, {
    headers: {
      // Abbreviated response: only dist-tags, name, and versions — 10-100x smaller
      'Accept': 'application/vnd.npm.install-v1+json',
      'User-Agent': 'aztec-watch/0.1.0 (github.com/your-org/aztec-watch)',
    },
  });

  if (res.status === 404) {
    throw new Error(`Package not found on npm: ${packageName}`);
  }
  if (!res.ok) {
    throw new Error(`npm registry returned ${res.status} for ${packageName}`);
  }

  const data = (await res.json()) as NpmRegistryResponse;
  return data['dist-tags'] ?? {};
}

export interface PollResult {
  packageName: string;
  changes: VersionChange[];
  error?: string;
}

export async function pollPackage(
  packageName: string,
  tags: string[],
  store: VersionStore
): Promise<PollResult> {
  let distTags: Record<string, string>;

  try {
    distTags = await fetchDistTags(packageName);
  } catch (err) {
    return { packageName, changes: [], error: (err as Error).message };
  }

  const changes: VersionChange[] = [];
  const now = Date.now();

  for (const tag of tags) {
    const newVersion = distTags[tag];
    if (!newVersion) continue; // tag doesn't exist for this package — skip silently

    const oldVersion = store.getVersion(packageName, tag);
    if (oldVersion !== newVersion) {
      changes.push({ packageName, tag, oldVersion, newVersion, detectedAt: now });
    }
  }

  return { packageName, changes };
}

export async function pollAll(
  packages: Array<{ name: string; tags: string[] }>,
  store: VersionStore,
  concurrency = 5
): Promise<VersionChange[]> {
  const allChanges: VersionChange[] = [];

  for (let i = 0; i < packages.length; i += concurrency) {
    const batch = packages.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(pkg => pollPackage(pkg.name, pkg.tags, store))
    );

    for (const result of results) {
      if (result.error) {
        console.error(`[poller] ${result.packageName}: ${result.error}`);
      }
      allChanges.push(...result.changes);
    }
  }

  return allChanges;
}
