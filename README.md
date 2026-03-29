# aztec-watcher

An open-source npm package monitor for the [Aztec Protocol](https://aztec.network) ecosystem.

Aztec releases SDK updates frequently and without a fixed schedule. `aztec-watcher` polls the npm registry and sends you **one grouped Slack notification** the moment a new version is published — so you find out before your users do.

---

## Get started in 5 minutes

### 1. Clone the repo

```bash
git clone https://github.com/NethermindEth/aztec-watcher.git
cd aztec-watcher
npm install
```

### 2. Create a Slack webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it (e.g. `aztec-watch`) → pick your workspace → **Create App**
3. Left sidebar → **Incoming Webhooks** → toggle ON
4. **Add New Webhook to Workspace** → pick a channel → **Allow**
5. Copy the webhook URL

### 3. Run the setup wizard

```bash
npx aztec-watch init
```

Three questions — that's it:

```
┌  aztec-watch
│
◆  What are you building?
│  ● dApp / frontend       aztec.js, accounts, wallets, pxe
│  ○ Smart contract        aztec.js, noir-contracts, simulator
│  ○ Wallet integration    accounts, wallets, wallet-sdk, pxe
│  ○ Node / validator      aztec-node, sequencer, validator, p2p
│  ○ Faucet / tooling      aztec.js, accounts, cli, builder
│
◆  6 packages pre-selected. Customize?
│  No
│
◆  Slack incoming webhook URL
│  https://hooks.slack.com/services/...
│
✓  Config written → aztec-watch.config.yaml
│
├──────────────────────────────────────────╮
│  Commit your config                      │
│                                          │
│  git add aztec-watch.config.yaml         │
│  git commit -m "configure aztec-watch"   │
│  git push                                │
├──────────────────────────────────────────╯
│
├──────────────────────────────────────────╮
│  Add the GitHub secret                   │
│                                          │
│  Repo → Settings → Secrets → Actions     │
│  Name:  SLACK_WEBHOOK_URL                │
│  Value: (your webhook URL)               │
├──────────────────────────────────────────╯
│
└  Watching 6 packages. Notifications go to Slack every 15 min.
```

If you choose **Customize** you get a grouped package selector:

```
◆  Select packages to monitor
│
│  Core SDK
│  ◼ @aztec/aztec.js          Primary client SDK
│  ◼ @aztec/accounts          Schnorr/ECDSA account contracts
│  ◻ @aztec/wallets           Embedded wallet
│  ◻ @aztec/pxe               Private eXecution Environment
│  ...
│
│  Infrastructure
│  ◻ @aztec/aztec-node        Full sequencer node
│  ◻ @aztec/sequencer-client  Sequencer module
│  ...
│
│  Noir Language
│  ◻ @noir-lang/noir_js       Noir JS interface
│  ...
```

65 packages across 9 categories. Pick exactly the ones you need.

### 4. Push to GitHub

```bash
git add aztec-watch.config.yaml
git commit -m "configure aztec-watch"
git push
```

### 5. Add the Slack secret

Go to your repo on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | The webhook URL you copied in step 2 |

### 6. Enable GitHub Actions

Go to the **Actions** tab → click **"I understand my workflows, go ahead and enable them"**.

**Done.** The workflow runs every 15 minutes. The moment Aztec publishes a new version, you get a Slack message:

```
Aztec 4.1.2-rc.1

@aztec/aztec.js   4.1.1-rc.1  →  4.1.2-rc.1
@aztec/accounts   4.1.1-rc.1  →  4.1.2-rc.1
@aztec/wallets    4.1.1-rc.1  →  4.1.2-rc.1
@aztec/pxe        4.1.1-rc.1  →  4.1.2-rc.1

npm install @aztec/aztec.js@rc @aztec/accounts@rc @aztec/wallets@rc @aztec/pxe@rc
```

---

## Test before you deploy

### Send a test notification

Make sure your webhook works before waiting for a real release:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
npm run build
node dist/cli/index.js test
```

You'll see a test message land in your Slack channel immediately.

### Trigger manually from GitHub Actions

After pushing, go to **Actions** → **aztec-watch** → **Run workflow** → **Run workflow** to trigger it on demand.

---

## How it works

1. Every 15 minutes, the GitHub Actions workflow runs `aztec-watch run`
2. It polls the npm registry for every package in your config
3. Compares the current versions against `data/state.json` (a simple JSON file that tracks what you've already been notified about)
4. If anything changed, groups the updates into **one Slack message** per release (Aztec is a monorepo — 60+ packages bump at once, you get one message, not 60)
5. After notifying, commits the updated `state.json` back to your repo so the next run knows where it left off
6. If Slack is down, state is **not** saved — the next run retries the same notification (at-least-once delivery)

---

## Customize your packages

The wizard pre-selects packages based on your role, but you can always edit `aztec-watch.config.yaml` directly:

```yaml
packages:
  - name: "@aztec/aztec.js"
    tags: [rc, latest]
  - name: "@aztec/accounts"
    tags: [rc, latest]
    check_schnorr_class_id: true   # alerts when the Schnorr class ID changes
  - name: "@aztec/pxe"
    tags: [rc, latest]
```

### Track any npm package

Not limited to Aztec — add any npm package:

```yaml
packages:
  - name: "viem"
    tags: [latest]
  - name: "@openzeppelin/contracts"
    tags: [latest]
```

### Available packages

65 curated Aztec and Noir packages across 9 categories: Core SDK, Standard Library, Contract Artifacts, Cryptography, Infrastructure, Storage, L1 Integration, Testing, and Noir Language.

Full list: [`src/data/packages.ts`](src/data/packages.ts)

---

## Running locally (without GitHub Actions)

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
npm run build
node dist/cli/index.js run
```

Add to crontab to run every 15 minutes:

```bash
*/15 * * * * cd /path/to/aztec-watcher && SLACK_WEBHOOK_URL=... node dist/cli/index.js run >> ~/.aztec-watch.log 2>&1
```

---

## Security

- **No secrets in the repo.** Config uses `${ENV_VAR}` placeholders — actual values live in GitHub Actions secrets only.
- **No outbound connections except** `registry.npmjs.org` and `hooks.slack.com`.
- **No server, no database, no SaaS dependency.** Just a JSON file and a cron job.

---

## License

MIT
