import type { NotificationSink, ReleaseEvent } from './types.js';

function buildBlocks(event: ReleaseEvent): object[] {
  const blocks: object[] = [];

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: event.title, emoji: true },
  });

  blocks.push({ type: 'divider' });

  const lines = event.changes.map(c => {
    const from = c.oldVersion ? `\`${c.oldVersion}\`` : '_first detected_';
    return `*${c.packageName}*  ${from} → \`${c.newVersion}\``;
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: lines.join('\n') },
  });

  if (event.schnorrWarning) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          '*:warning: Schnorr class ID changed — update before deploying accounts*',
          `old: \`${event.schnorrWarning.oldClassId}\``,
          `new: \`${event.schnorrWarning.newClassId}\``,
        ].join('\n'),
      },
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Install:*\n\`\`\`\n${event.installCommand}\n\`\`\``,
    },
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
