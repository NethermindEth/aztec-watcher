#!/usr/bin/env node

import { loadConfig } from '../config.js';
import { runOnce, buildSinks } from '../core/scheduler.js';
import { dispatchEvents } from '../notify/router.js';
import { runSetup } from './setup.js';
import type { ReleaseEvent } from '../notify/types.js';

const command = process.argv[2];
const configPath = process.env['AZTEC_WATCH_CONFIG'] ?? 'aztec-watch.config.yaml';

async function main(): Promise<void> {
  switch (command) {
    case 'run': {
      let config;
      try {
        config = loadConfig(configPath);
      } catch (err) {
        console.error(`[aztec-watch] Config error: ${(err as Error).message}`);
        process.exit(1);
      }
      await runOnce(config);
      break;
    }

    case 'setup': {
      await runSetup();
      break;
    }

    case 'test': {
      let config;
      try {
        config = loadConfig(configPath);
      } catch (err) {
        console.error(`[aztec-watch] Config error: ${(err as Error).message}`);
        process.exit(1);
      }

      const sinks = buildSinks(config);
      if (sinks.length === 0) {
        console.error('[aztec-watch] No notification sinks configured. Add slack or telegram to your config.');
        process.exit(1);
      }

      // Fake a realistic Aztec RC release using the first 4 packages in config
      // (or however many are configured, up to 4)
      const watchedPackages = config.packages.slice(0, 4);
      const fakeOld = '4.1.0-rc.4';
      const fakeNew = '4.1.0-rc.5';
      const tag = watchedPackages[0]?.tags.find(t => t === 'rc') ?? watchedPackages[0]?.tags[0] ?? 'rc';

      const fakeEvent: ReleaseEvent = {
        title: `Aztec ${fakeNew} [TEST]`,
        isDigest: watchedPackages.length > 1,
        changes: watchedPackages.map(pkg => ({
          packageName: pkg.name,
          tag,
          oldVersion: fakeOld,
          newVersion: fakeNew,
        })),
        installCommand: `npm install ${watchedPackages.map(p => `${p.name}@${tag}`).join(' ')}`,
        schnorrWarning: watchedPackages.some(p => p.check_schnorr_class_id)
          ? { oldClassId: '0x1939ef95d5a71a549f8be896d9ce748fc2f', newClassId: '0x010319cf23a4cfd2c9e98b9f9cc2bf7302' }
          : undefined,
      };

      console.log(`[test] Sending test notification to: ${sinks.map(s => s.name).join(', ')}`);
      console.log(`[test] Fake event: "${fakeEvent.title}" (${fakeEvent.changes.length} package(s))`);

      await dispatchEvents([fakeEvent], sinks);

      console.log('[test] Done. Check your Slack/Telegram for the test message.');
      break;
    }

    default: {
      console.log(`
aztec-watch — npm package monitor for the Aztec Protocol ecosystem

Commands:
  aztec-watch run     Poll npm and send notifications for any new versions
  aztec-watch test    Send a fake notification to verify your Slack setup
  aztec-watch setup   Interactive setup wizard

Environment:
  AZTEC_WATCH_CONFIG     Path to config file (default: aztec-watch.config.yaml)
  SLACK_WEBHOOK_URL      Slack incoming webhook URL
      `.trim());
      process.exit(command ? 1 : 0);
    }
  }
}

main().catch(err => {
  console.error('[aztec-watch] Fatal:', err);
  process.exit(1);
});
