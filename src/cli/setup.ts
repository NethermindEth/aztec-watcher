import * as p from '@clack/prompts';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { CURATED_PACKAGES, ROLE_PRESETS } from '../data/packages.js';
import { loadConfig } from '../config.js';
import { buildSinks } from '../core/scheduler.js';
import { dispatchEvents } from '../notify/router.js';
import type { ReleaseEvent } from '../notify/types.js';

export async function runSetup(): Promise<void> {
  console.log('');

  p.intro('aztec-watcher');

  // ── Step 1: Role ─────────────────────────────────────────────────────────

  const role = await p.select({
    message: 'What are you building?',
    options: [
      { value: 'dApp / frontend',    label: 'dApp / frontend',    hint: 'aztec.js, accounts, wallets, pxe' },
      { value: 'Smart contract',     label: 'Smart contract',     hint: 'aztec.js, noir-contracts, simulator' },
      { value: 'Wallet integration', label: 'Wallet integration', hint: 'accounts, wallets, wallet-sdk, pxe' },
      { value: 'Node / validator',   label: 'Node / validator',   hint: 'aztec-node, sequencer, validator, p2p' },
      { value: 'Faucet / tooling',   label: 'Faucet / tooling',   hint: 'aztec.js, accounts, cli, builder' },
    ],
  });
  if (p.isCancel(role)) { p.cancel('Cancelled.'); process.exit(0); }

  const preselected = new Set(ROLE_PRESETS[role as string]);

  // ── Step 2: Review packages ───────────────────────────────────────────────

  const preselectedList = [...preselected];

  const wantsReview = await p.confirm({
    message: `${preselectedList.length} packages pre-selected. Want to see them?`,
    initialValue: true,
  });
  if (p.isCancel(wantsReview)) { p.cancel('Cancelled.'); process.exit(0); }

  if (wantsReview) {
    const listing = preselectedList.map(name => {
      const pkg = CURATED_PACKAGES.find(p => p.name === name);
      return `  ${name}  ${pkg ? `(${pkg.purpose})` : ''}`;
    }).join('\n');
    p.log.info(listing);
  }

  const configPath = resolve('aztec-watcher.config.yaml');
  p.log.message(`  You can add or remove packages later in ${configPath}`);

  const selectedPackages = preselectedList;

  // ── Step 3: Which releases to track ──────────────────────────────────────

  const tagChoice = await p.select({
    message: 'Which releases do you want to track?',
    options: [
      { value: 'stable',  label: 'Stable only',          hint: 'latest tag, fewer notifications' },
      { value: 'rc',      label: 'Release candidates',   hint: 'rc tag, know before stable lands' },
      { value: 'both',    label: 'Both stable and RC',    hint: 'latest + rc tags' },
      { value: 'all',     label: 'Everything',            hint: 'latest, rc, devnet, nightly' },
    ],
  });
  if (p.isCancel(tagChoice)) { p.cancel('Cancelled.'); process.exit(0); }

  // ── Write config ──────────────────────────────────────────────────────────

  const yaml = generateConfig(selectedPackages, tagChoice as string);
  writeFileSync('aztec-watcher.config.yaml', yaml, 'utf8');

  // Reset state so this fork starts fresh on first run
  const statePath = resolve('data/state.json');
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, '{}\n', 'utf8');

  // ── Done ──────────────────────────────────────────────────────────────────

  p.log.success(`Config saved. Watching ${selectedPackages.length} packages.`);

  // ── Optional: test Slack ────────────────────────────────────────────────

  const wantsTest = await p.confirm({
    message: 'Want to test your Slack webhook now?',
    initialValue: false,
  });
  if (p.isCancel(wantsTest)) { p.cancel('Cancelled.'); process.exit(0); }

  if (wantsTest) {
    const webhookUrl = await p.text({
      message: 'Paste your Slack webhook URL (only used for this test, not saved anywhere)',
      placeholder: 'https://hooks.slack.com/services/...',
      validate: v => {
        if (!v) return 'Paste your Slack webhook URL';
        if (!v.startsWith('https://hooks.slack.com/')) return 'Must start with https://hooks.slack.com/';
      },
    });
    if (p.isCancel(webhookUrl)) { p.cancel('Cancelled.'); process.exit(0); }

    // Temporarily set env so config can load
    process.env['SLACK_WEBHOOK_URL'] = webhookUrl as string;

    try {
      const config = loadConfig('aztec-watcher.config.yaml');
      const sinks = buildSinks(config);
      const testPkgs = config.packages.slice(0, 4);
      const tag = testPkgs[0]?.tags[0] ?? 'latest';

      const fakeEvent: ReleaseEvent = {
        title: 'Aztec 4.1.0-rc.5 [TEST]',
        isDigest: testPkgs.length > 1,
        changes: testPkgs.map(pkg => ({
          packageName: pkg.name,
          tag,
          oldVersion: '4.1.0-rc.4',
          newVersion: '4.1.0-rc.5',
        })),
        installCommand: `npm install ${testPkgs.map(pkg => `${pkg.name}@${tag}`).join(' ')}`,
      };

      const s = p.spinner();
      s.start('Sending test notification...');
      const ok = await dispatchEvents([fakeEvent], sinks);
      if (ok) {
        s.stop('Test notification sent. Check your Slack channel.');
      } else {
        s.stop('Failed to send. Check your webhook URL and try again.');
      }
    } catch (err) {
      p.log.error(`Test failed: ${(err as Error).message}`);
    }

    delete process.env['SLACK_WEBHOOK_URL'];
  }

  // ── Next steps ──────────────────────────────────────────────────────────

  p.log.step('Next: commit and push your config');
  p.log.message('  git add aztec-watcher.config.yaml data/state.json && git commit -m "configure aztec-watcher" && git push');
  p.log.step('Add your Slack webhook as a GitHub secret');
  p.log.message('  Repo > Settings > Secrets > Actions > SLACK_WEBHOOK_URL');
  p.outro('You only get notified when a version actually changes.');
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pickTags(_pkg: string, allTags: string[], choice: string): string[] {
  switch (choice) {
    case 'stable': return allTags.filter(t => t === 'latest');
    case 'rc':     return allTags.filter(t => t === 'rc');
    case 'both':   return allTags.filter(t => t === 'latest' || t === 'rc');
    case 'all':    return allTags;
    default:       return ['latest'];
  }
}

function generateConfig(packages: string[], tagChoice: string): string {
  const pkgLines = packages
    .map(name => {
      const pkg = CURATED_PACKAGES.find(p => p.name === name);
      const allTags = pkg?.tags ?? ['latest'];
      const tags = pickTags(name, allTags, tagChoice);
      if (tags.length === 0) return null; // package doesn't have this tag
      const schnorr = name === '@aztec/accounts' ? '\n    check_schnorr_class_id: true' : '';
      return `  - name: "${name}"\n    tags: [${tags.join(', ')}]${schnorr}`;
    })
    .filter(Boolean)
    .join('\n');

  return [
    '# aztec-watcher config — generated by `aztec-watcher init`',
    `packages:\n${pkgLines}`,
    'notify:\n  slack:\n    webhook_url: ${SLACK_WEBHOOK_URL}',
    'state_path: data/state.json',
  ].join('\n\n') + '\n';
}
