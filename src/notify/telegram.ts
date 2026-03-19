import type { NotificationSink, ReleaseEvent } from './types.js';

// MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
function esc(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function buildMessage(event: ReleaseEvent): string {
  const lines: string[] = [];

  lines.push(`*${esc(event.title)}*`);
  lines.push('');

  for (const c of event.changes) {
    const pkg = esc(c.packageName);
    const from = c.oldVersion ? `\`${esc(c.oldVersion)}\`` : '_first detected_';
    const to = `\`${esc(c.newVersion)}\``;
    lines.push(`${pkg}  ${from} → ${to}`);
  }

  if (event.schnorrWarning) {
    lines.push('');
    lines.push(`*⚠ Schnorr class ID changed — update before deploying accounts*`);
    lines.push(`old: \`${esc(event.schnorrWarning.oldClassId)}\``);
    lines.push(`new: \`${esc(event.schnorrWarning.newClassId)}\``);
  }

  lines.push('');
  lines.push(`*Install:*`);
  lines.push(`\`\`\`\n${event.installCommand}\n\`\`\``);

  return lines.join('\n');
}

export class TelegramSink implements NotificationSink {
  name = 'telegram';

  constructor(
    private botToken: string,
    private chatId: string,
  ) {}

  async send(event: ReleaseEvent): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: buildMessage(event),
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { description?: string };
      throw new Error(`Telegram API returned ${res.status}: ${data.description ?? 'unknown error'}`);
    }
  }
}
