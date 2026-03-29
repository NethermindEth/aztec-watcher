import * as p from '@clack/prompts';
import { writeFileSync, existsSync } from 'fs';
import { CURATED_PACKAGES, ROLE_PRESETS } from '../data/packages.js';

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

  p.log.message('  You can add or remove packages later in aztec-watch.config.yaml');

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

  // ── Step 4: Slack webhook ─────────────────────────────────────────────────

  const url = await p.text({
    message: 'Slack incoming webhook URL',
    placeholder: 'https://hooks.slack.com/services/...',
    validate: v => {
      if (!v) return 'Paste your Slack webhook URL';
      if (!v.startsWith('https://hooks.slack.com/')) return 'Must start with https://hooks.slack.com/';
    },
  });
  if (p.isCancel(url)) { p.cancel('Cancelled.'); process.exit(0); }

  // ── Write config ──────────────────────────────────────────────────────────

  const yaml = generateConfig(selectedPackages, tagChoice as string);
  writeFileSync('aztec-watch.config.yaml', yaml, 'utf8');

  // ── Done ──────────────────────────────────────────────────────────────────

  const hasWorkflow =
    existsSync('.github/workflows/watch.yml') ||
    existsSync('.github/workflows/aztec-watch.yml');

  p.log.success(`Config saved. Watching ${selectedPackages.length} packages.`);

  if (hasWorkflow) {
    p.log.step('Next: commit and push your config');
    p.log.message('  git add aztec-watch.config.yaml && git commit -m "configure aztec-watch" && git push');
    p.log.step('Then add your Slack webhook as a GitHub secret');
    p.log.message('  Repo > Settings > Secrets > Actions > SLACK_WEBHOOK_URL');
    p.outro('You only get notified when a version actually changes.');
  } else {
    p.log.step('Next: run aztec-watch');
    p.log.message(`  export SLACK_WEBHOOK_URL="${url as string}"`);
    p.log.message('  npm run build && node dist/cli/index.js run');
    p.outro('You only get notified when a version actually changes.');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pickTags(pkg: string, allTags: string[], choice: string): string[] {
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
    '# aztec-watch config — generated by `aztec-watch init`',
    `packages:\n${pkgLines}`,
    'notify:\n  slack:\n    webhook_url: ${SLACK_WEBHOOK_URL}',
    'digest_window_seconds: 300',
    'state_path: data/state.json',
  ].join('\n\n') + '\n';
}
