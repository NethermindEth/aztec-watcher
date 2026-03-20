import type { NotificationSink, ReleaseEvent } from './types.js';

function buildBlocks(event: ReleaseEvent): object[] {
  const blocks: object[] = [];

  // Title
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*${event.title}*` },
  });

  // Package diff list
  const maxLen = Math.max(...event.changes.map(c => c.packageName.length));
  const lines = event.changes.map(c => {
    const pad = ' '.repeat(maxLen - c.packageName.length + 2);
    const from = c.oldVersion ?? 'new';
    return `\`${c.packageName}\`${pad}${from}  →  ${c.newVersion}`;
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: lines.join('\n') },
  });

  // Schnorr warning — compact single line
  if (event.schnorrWarning) {
    const short = (id: string) => id.slice(0, 12) + '…';
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `:warning:  Schnorr class ID changed — redeploy accounts before going live\n\`${short(event.schnorrWarning.oldClassId)}\`  →  \`${short(event.schnorrWarning.newClassId)}\``,
      }],
    });
  }

  // Install command
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `\`\`\`\n${event.installCommand}\n\`\`\`` },
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
