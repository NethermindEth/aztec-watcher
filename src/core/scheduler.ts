import type { AppConfig } from '../types.js';
import { VersionStore } from './store.js';
import { pollAll } from './poller.js';
import { groupIntoEvents, dispatchEvents } from '../notify/router.js';
import { SlackSink } from '../notify/slack.js';
import { TelegramSink } from '../notify/telegram.js';
import type { NotificationSink } from '../notify/types.js';

export async function runOnce(config: AppConfig): Promise<void> {
  const store = new VersionStore(config.db_path);

  try {
    // On first run the store is empty — every package would appear as a change.
    // Seed the store silently instead of sending a notification flood.
    const firstRun = isStoreEmpty(store, config);

    console.log(`[scheduler] Polling ${config.packages.length} packages...`);
    const changes = await pollAll(config.packages, store);
    console.log(`[scheduler] ${changes.length} change(s) detected`);

    if (firstRun) {
      store.applyChanges(changes);
      store.logPollRun(config.packages.length, 0);
      console.log(`[scheduler] First run — seeded ${changes.length} versions. No notifications sent.`);
      return;
    }

    if (changes.length === 0) {
      store.logPollRun(config.packages.length, 0);
      console.log('[scheduler] Nothing changed.');
      return;
    }

    const sinks = buildSinks(config);
    if (sinks.length === 0) {
      console.warn('[scheduler] No notification sinks configured. Changes:');
      for (const c of changes) {
        console.warn(`  ${c.packageName}@${c.tag}: ${c.oldVersion ?? 'new'} → ${c.newVersion}`);
      }
    }

    const events = groupIntoEvents(changes);
    console.log(`[scheduler] Grouped into ${events.length} event(s)`);

    await dispatchEvents(events, sinks);

    // Persist state only after successful dispatch (at-least-once delivery).
    // If dispatch fails, next run will re-detect the same changes and retry.
    store.applyChanges(changes);
    store.logPollRun(config.packages.length, changes.length);
    console.log('[scheduler] State updated.');

  } finally {
    store.close();
  }
}

function isStoreEmpty(store: VersionStore, config: AppConfig): boolean {
  for (const pkg of config.packages) {
    for (const tag of pkg.tags) {
      if (store.getVersion(pkg.name, tag) !== null) return false;
    }
  }
  return true;
}

function buildSinks(config: AppConfig): NotificationSink[] {
  const sinks: NotificationSink[] = [];

  if (config.notify.slack?.webhook_url) {
    sinks.push(new SlackSink(config.notify.slack.webhook_url));
  }

  if (config.notify.telegram?.bot_token && config.notify.telegram?.chat_id) {
    sinks.push(new TelegramSink(
      config.notify.telegram.bot_token,
      config.notify.telegram.chat_id,
    ));
  }

  return sinks;
}
