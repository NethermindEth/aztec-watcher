import type { NotificationSink, ReleaseEvent } from './types.js';

// Escape for MarkdownV2 regular text (bold, plain, etc.)
// Must escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
function esc(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Escape for content INSIDE backtick code spans.
// Telegram MarkdownV2 rule: inside `code`, only backtick and backslash need escaping.
// Everything else (. - etc.) is treated literally — do NOT over-escape or backslashes
// will appear visibly in the rendered message.
function escCode(text: string): string {
  return text.replace(/([`\\])/g, '\\$1');
}

function buildMessage(event: ReleaseEvent): string {
  const lines: string[] = [];

  lines.push(`*${esc(event.title)}*`);
  lines.push('');

  for (const c of event.changes) {
    const pkg = esc(c.packageName);
    const from = c.oldVersion ? `\`${escCode(c.oldVersion)}\`` : '_first detected_';
    const to = `\`${escCode(c.newVersion)}\``;
    lines.push(`${pkg}  ${from} → ${to}`);
  }

  if (event.schnorrWarning) {
    lines.push('');
    lines.push(`*⚠ Schnorr class ID changed — update before deploying accounts*`);
    lines.push(`old: \`${escCode(event.schnorrWarning.oldClassId)}\``);
    lines.push(`new: \`${escCode(event.schnorrWarning.newClassId)}\``);
  }

  lines.push('');
  lines.push(`*Install:*`);
  // Inside triple-backtick pre blocks: same rule as code spans, only ` and \ need escaping.
  // npm install commands don't contain backticks so no escaping needed here.
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
