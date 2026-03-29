import * as p from '@clack/prompts';
import { writeFileSync, existsSync } from 'fs';
import { CURATED_PACKAGES, ROLE_PRESETS } from '../data/packages.js';

const ROLE_LABELS: Record<string, string> = {
  'dApp / frontend':    'dApp / frontend   — aztec.js, accounts, wallets, pxe',
  'Smart contract':     'Smart contract    — aztec.js, noir-contracts, simulator',
  'Wallet integration': 'Wallet integration — accounts, wallets, wallet-sdk, pxe',
  'Node / validator':   'Node / validator  — aztec-node, sequencer, validator, p2p',
  'Faucet / tooling':   'Faucet / tooling  — aztec.js, accounts, cli, builder',
};

export async function runSetup(): Promise<void> {
  console.log('');
  p.intro(
    'aztec-watch  ·  npm release monitor for the Aztec Protocol ecosystem\n' +
    '  Polls npm every 15 min and sends you one Slack message the moment\n' +
    '  a new Aztec version lands — before your users notice.'
  );

  // ── Step 1: Role ─────────────────────────────────────────────────────────
  const role = await p.select({
    message: 'What are you building?',
    options: Object.keys(ROLE_PRESETS).map(r => ({
      value: r,
      label: ROLE_LABELS[r] ?? r,
    })),
  });
  if (p.isCancel(role)) { p.cancel('Setup cancelled.'); process.exit(0); }

  const preselected = new Set(ROLE_PRESETS[role as string]);

  // ── Step 2: Review packages ───────────────────────────────────────────────
  const wantsReview = await p.confirm({
    message: `${preselected.size} packages pre-selected for "${role as string}". Review and customize?`,
    initialValue: false,
  });
  if (p.isCancel(wantsReview)) { p.cancel('Setup cancelled.'); process.exit(0); }

  let selectedPackages: string[];

  if (wantsReview) {
    const result = await p.multiselect({
      message: 'Select packages to monitor  (↑↓ move · space toggle · a toggle all · enter confirm)',
      options: CURATED_PACKAGES.map(pkg => ({
        value: pkg.name,
        label: pkg.name,
        hint: `${pkg.category} — ${pkg.purpose}`,
      })),
      initialValues: [...preselected],
      required: true,
    });
    if (p.isCancel(result)) { p.cancel('Setup cancelled.'); process.exit(0); }
    selectedPackages = result as string[];
  } else {
    selectedPackages = [...preselected];
  }

  // ── Step 3: Slack ─────────────────────────────────────────────────────────
  const url = await p.text({
    message: 'Slack incoming webhook URL',
    placeholder: 'https://hooks.slack.com/services/...',
    validate: v => {
      if (!v) return 'Required — paste your webhook URL here';
      if (!v.startsWith('https://hooks.slack.com/')) return 'Must start with https://hooks.slack.com/';
    },
  });
  if (p.isCancel(url)) { p.cancel('Setup cancelled.'); process.exit(0); }

  // ── Write config ──────────────────────────────────────────────────────────
  const yaml = generateConfig(selectedPackages);
  writeFileSync('aztec-watch.config.yaml', yaml, 'utf8');
  p.log.success('Config written → aztec-watch.config.yaml');

  // ── Detect existing workflow ──────────────────────────────────────────────
  const hasWorkflow =
    existsSync('.github/workflows/watch.yml') ||
    existsSync('.github/workflows/aztec-watch.yml');

  if (hasWorkflow) {
    p.log.info('GitHub Actions workflow already exists — skipping scaffold');
  }

  // ── Outro ─────────────────────────────────────────────────────────────────
  if (hasWorkflow) {
    p.outro(
      `You're almost done. Three steps left:\n\n` +
      `  1. Commit and push:\n` +
      `       git add aztec-watch.config.yaml\n` +
      `       git commit -m "configure aztec-watch"\n` +
      `       git push\n\n` +
      `  2. Add your Slack webhook as a GitHub secret:\n` +
      `       Repo → Settings → Secrets and variables → Actions\n` +
      `       New secret  →  SLACK_WEBHOOK_URL  →  (paste your webhook)\n\n` +
      `  3. Enable Actions on your repo (Actions tab → enable workflows)\n\n` +
      `aztec-watch will run every 15 minutes and ping you the moment a new\n` +
      `Aztec version lands. You can also trigger it manually from the Actions tab.`
    );
  } else {
    p.outro(
      `Config ready. To run aztec-watch:\n\n` +
      `  export SLACK_WEBHOOK_URL="${url as string}"\n` +
      `  npm run build\n` +
      `  node dist/cli/index.js run\n\n` +
      `To run on a schedule, add to crontab:\n` +
      `  */15 * * * * cd $(pwd) && SLACK_WEBHOOK_URL=... node dist/cli/index.js run >> ~/.aztec-watch.log 2>&1`
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function generateConfig(packages: string[]): string {
  const pkgLines = packages
    .map(name => {
      const pkg = CURATED_PACKAGES.find(p => p.name === name);
      const tags = pkg?.tags.slice(0, 2) ?? ['latest'];
      const schnorr = name === '@aztec/accounts' ? '\n    check_schnorr_class_id: true' : '';
      return `  - name: "${name}"\n    tags: [${tags.join(', ')}]${schnorr}`;
    })
    .join('\n');

  return [
    '# aztec-watch config — generated by `aztec-watch init`',
    `packages:\n${pkgLines}`,
    'notify:\n  slack:\n    webhook_url: ${SLACK_WEBHOOK_URL}',
    'digest_window_seconds: 300',
    'state_path: data/state.json',
  ].join('\n\n') + '\n';
}
