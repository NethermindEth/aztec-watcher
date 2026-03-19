#!/usr/bin/env node

import { loadConfig } from '../config.js';
import { runOnce } from '../core/scheduler.js';
import { runSetup } from './setup.js';

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

    default: {
      console.log(`
aztec-watch — npm package monitor for the Aztec Protocol ecosystem

Commands:
  aztec-watch run     Poll packages and send notifications
  aztec-watch setup   Interactive setup wizard

Environment:
  AZTEC_WATCH_CONFIG     Path to config file (default: aztec-watch.config.yaml)
  SLACK_WEBHOOK_URL      Slack incoming webhook URL
  TELEGRAM_BOT_TOKEN     Telegram bot token
  TELEGRAM_CHAT_ID       Telegram chat ID
      `.trim());
      process.exit(command ? 1 : 0);
    }
  }
}

main().catch(err => {
  console.error('[aztec-watch] Fatal:', err);
  process.exit(1);
});
