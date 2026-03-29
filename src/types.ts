// Config types loaded from aztec-watch.config.yaml

export interface PackageConfig {
  name: string;
  tags: string[];
  check_schnorr_class_id?: boolean;
}

export interface SlackConfig {
  webhook_url: string;
}

export interface NotifyConfig {
  slack?: SlackConfig;
}

export interface AppConfig {
  packages: PackageConfig[];
  notify: NotifyConfig;
  state_path: string;
}

// npm registry response (only fields we use)
export interface NpmRegistryResponse {
  name: string;
  'dist-tags': Record<string, string>;
}

// A single detected version change from polling
export interface VersionChange {
  packageName: string;
  tag: string;
  oldVersion: string | null; // null on first detection after seeding
  newVersion: string;
  detectedAt: number; // Unix ms timestamp
}

// A curated package entry in the master list
export interface CuratedPackage {
  name: string;
  category: string;
  tags: string[];
  purpose: string;
}
