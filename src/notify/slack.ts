import type { NotificationSink, ReleaseEvent } from './types.js';

function buildBlocks(event: ReleaseEvent): object[] {
  const blocks: object[] = [];

  // Title
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: event.title, emoji: true },
  });

  // Package diff list
  const lines = event.changes.map(c => {
    const from = c.oldVersion ?? '-';
    return `*${c.packageName}*  ${from} -> ${c.newVersion}`;
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: lines.join('\n') },
  });

  // Schnorr warning
  if (event.schnorrWarning) {
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: ':warning: Schnorr class ID changed. Redeploy accounts before going live.',
      }],
    });
  }

  // Install command
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `\`${event.installCommand}\``,
    }],
  });

  return blocks;
}

export class SlackSink implements NotificationSink {
  name = 'slack';

  constructor(private webhookUrl: string) {}

  async send(event: ReleaseEvent): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: event.title,
        blocks: buildBlocks(event),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Slack webhook returned ${res.status}: ${body}`);
    }
  }
}
