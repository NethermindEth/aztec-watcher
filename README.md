# aztec-watcher

npm package monitor for the [Aztec Protocol](https://aztec.network) ecosystem.

Aztec SDK releases happen frequently with no fixed schedule. aztec-watcher polls the npm registry and sends a single grouped Slack notification when a new version drops.

---

## Setup

### 1. Clone

```bash
git clone https://github.com/NethermindEth/aztec-watcher.git
cd aztec-watcher
npm install
```

### 2. Create a Slack webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps) > **Create New App** > **From scratch**
2. Name it (e.g. `aztec-watcher`), pick your workspace, click **Create App**
3. Left sidebar > **Incoming Webhooks** > toggle ON
4. **Add New Webhook to Workspace** > pick a channel > **Allow**
5. Copy the webhook URL

### 3. Run the setup wizard

```bash
npx aztec-watch init
```

```
┌  aztec-watcher
│
◆  What are you building?
│  ● dApp / frontend       aztec.js, accounts, wallets, pxe
│  ○ Smart contract        aztec.js, noir-contracts, simulator
│  ○ Wallet integration    accounts, wallets, wallet-sdk, pxe
│  ○ Node / validator      aztec-node, sequencer, validator, p2p
│  ○ Faucet / tooling      aztec.js, accounts, cli, builder
│
◆  6 packages pre-selected. Want to see them?
│  Yes
│
●  @aztec/aztec.js   (Primary client SDK)
│  @aztec/accounts   (Schnorr/ECDSA account contracts)
│  @aztec/wallets    (Embedded wallet)
│  @aztec/pxe        (Private eXecution Environment)
│  @aztec/stdlib     (JS types and helpers)
│  @aztec/wallet-sdk (dApp wallet integration SDK)
│
│  You can add or remove packages later in ./aztec-watch.config.yaml
│
◆  Which releases do you want to track?
│  ○ Stable only             latest tag, fewer notifications
│  ● Release candidates      rc tag, know before stable lands
│  ○ Both stable and RC      latest + rc tags
│  ○ Everything              latest, rc, devnet, nightly
│
✓  Config saved. Watching 6 packages.
│
◆  Want to test your Slack webhook now?
│  Yes
│
◆  Paste your Slack webhook URL (only used for this test, not saved anywhere)
│  https://hooks.slack.com/services/...
│
◐  Sending test notification...
✓  Test notification sent. Check your Slack channel.
│
◇  Next: commit and push your config
│    git add aztec-watch.config.yaml && git commit -m "configure aztec-watcher" && git push
│
◇  Add your Slack webhook as a GitHub secret
│    Repo > Settings > Secrets > Actions > SLACK_WEBHOOK_URL
│
└  You only get notified when a version actually changes.
```

The webhook URL you paste during the test is used once and discarded. It is never saved to any file.

### 4. Push

```bash
git add aztec-watch.config.yaml
git commit -m "configure aztec-watcher"
git push
```

### 5. Add the Slack secret

On your repo: **Settings > Secrets and variables > Actions > New repository secret**

| Name | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | The webhook URL from step 2 |

### 6. Enable GitHub Actions

**Actions** tab > click **"I understand my workflows, go ahead and enable them"**.

That's it. The workflow checks every 15 minutes. When a version changes, you get a Slack message:

```
Aztec 4.1.2-rc.1

@aztec/aztec.js   4.1.1-rc.1 -> 4.1.2-rc.1
@aztec/accounts   4.1.1-rc.1 -> 4.1.2-rc.1
@aztec/wallets    4.1.1-rc.1 -> 4.1.2-rc.1
@aztec/pxe        4.1.1-rc.1 -> 4.1.2-rc.1

npm install @aztec/aztec.js@rc @aztec/accounts@rc @aztec/wallets@rc @aztec/pxe@rc
```

---

## How it works

1. Every 15 minutes, GitHub Actions runs `aztec-watcher run`
2. Polls the npm registry for every package in your config
3. Compares versions against `data/state.json`
4. If anything changed, groups updates into one Slack message per release (Aztec is a monorepo, 60+ packages bump at once, you get one message not 60)
5. Commits updated `state.json` back to the repo
6. If Slack is unreachable, state is not saved. Next run retries the same notification.

---

## Custom packages

Edit `aztec-watch.config.yaml` directly:

```yaml
packages:
  - name: "@aztec/aztec.js"
    tags: [rc, latest]
  - name: "@aztec/accounts"
    tags: [rc, latest]
    check_schnorr_class_id: true
  - name: "@aztec/pxe"
    tags: [rc, latest]
```

Any npm package works, not just Aztec:

```yaml
packages:
  - name: "viem"
    tags: [latest]
  - name: "@openzeppelin/contracts"
    tags: [latest]
```

Full package list: [`src/data/packages.ts`](src/data/packages.ts)

---

## Running locally

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
npm run build
node dist/cli/index.js run
```

Crontab (every 15 min):

```bash
*/15 * * * * cd /path/to/aztec-watcher && SLACK_WEBHOOK_URL=... node dist/cli/index.js run >> ~/.aztec-watch.log 2>&1
```

---

## Security

- Config uses `${ENV_VAR}` placeholders. No secrets in the repo.
- The webhook URL pasted during setup test is used once and discarded.
- Only connects to `registry.npmjs.org` and `hooks.slack.com`.
- No server, no database, no third-party service.

---

## License

MIT
