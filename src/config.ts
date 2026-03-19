import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import type { AppConfig, PackageConfig } from './types.js';

// Replace ${ENV_VAR} patterns with values from process.env.
// Throws early if a referenced variable is not set.
function interpolateEnvVars(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
      const envVal = process.env[varName];
      if (envVal === undefined) {
        throw new Error(`Environment variable "${varName}" is referenced in config but not set`);
      }
      return envVal;
    });
  }
  if (Array.isArray(value)) {
    return value.map(interpolateEnvVars);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([k, v]) => [k, interpolateEnvVars(v)]
      )
    );
  }
  return value;
}

export function loadConfig(configPath?: string): AppConfig {
  const resolvedPath = resolve(configPath ?? 'aztec-watch.config.yaml');

  let raw: string;
  try {
    raw = readFileSync(resolvedPath, 'utf8');
  } catch {
    throw new Error(
      `Config file not found at ${resolvedPath}.\nRun: aztec-watch setup`
    );
  }

  const parsed = yaml.load(raw) as Record<string, unknown>;
  const interpolated = interpolateEnvVars(parsed) as Record<string, unknown>;

  if (!Array.isArray(interpolated.packages) || interpolated.packages.length === 0) {
    throw new Error('Config must have at least one entry under "packages:"');
  }

  return {
    packages: interpolated.packages as PackageConfig[],
    notify: (interpolated.notify ?? {}) as AppConfig['notify'],
    digest_window_seconds: (interpolated.digest_window_seconds as number) ?? 300,
    db_path: (interpolated.db_path as string) ?? 'data/state.db',
  };
}
