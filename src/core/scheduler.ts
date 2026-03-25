import type { AppConfig } from '../types.js';
import { VersionStore } from './store.js';
import { pollAll } from './poller.js';
import { groupIntoEvents, dispatchEvents } from '../notify/router.js';
import { SlackSink } from '../notify/slack.js';
import type { NotificationSink } from '../notify/types.js';

export async function runOnce(config: AppConfig): Promise<void> {
  const store = new VersionStore(config.state_path);

  // On first run the store is empty — every package would appear as a change.
  // Seed the store silently instead of sending a notification flood.
  const firstRun = store.isEmpty();

  console.log(`[scheduler] Polling ${config.packages.length} packages...`);
  const changes = await pollAll(config.packages, store);
  console.log(`[scheduler] ${changes.length} change(s) detected`);

  if (firstRun) {
    store.applyChanges(changes);
    store.save();
    console.log(`[scheduler] First run — seeded ${changes.length} versions. No notifications sent.`);
    return;
  }

  if (changes.length === 0) {
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
  store.applyChanges(changes);
  store.save();
  console.log('[scheduler] State updated.');
}

export function buildSinks(config: AppConfig): NotificationSink[] {
  const sinks: NotificationSink[] = [];

  if (config.notify.slack?.webhook_url) {
    sinks.push(new SlackSink(config.notify.slack.webhook_url));
  }

  return sinks;
}
