# aztec-watcher

An open-source npm package monitor for the [Aztec Protocol](https://aztec.network) ecosystem.

Aztec releases SDK updates frequently and without a fixed schedule. `aztec-watcher` polls the npm registry and sends you **one grouped notification** the moment a new version is published — so you find out before your users do.

---

## What it does

- Monitors any `@aztec/*` and `@noir-lang/*` package across all dist-tags (`rc`, `devnet`, `latest`, `nightly`, etc.)
- Collapses monorepo releases into **one message** instead of 60 individual pings
- Notifies via **Slack**
- Includes a ready-to-paste `npm install` command in every notification
- Detects **Schnorr account class ID changes** — the silent breaking change that affects wallets and faucets on every RC bump
- Runs on **GitHub Actions** for free — no server, no database to manage

---

## Quickstart (GitHub Actions — recommended)

### 1. Fork this repo

Click **Fork** on GitHub. That's your personal instance.

### 2. Configure your packages

Edit `aztec-watch.config.yaml` in your fork. The file uses `${ENV_VAR}` placeholders for credentials — **it is safe to commit**, no secrets are stored in it.

```yaml
packages:
  - name: "@aztec/aztec.js"
    tags: [rc, latest]
  - name: "@aztec/accounts"
    tags: [rc, latest]
    check_schnorr_class_id: true   # alerts when the Schnorr class ID changes
  - name: "@aztec/wallets"
    tags: [rc, latest]
  - name: "@aztec/pxe"
    tags: [rc, latest]

notify:
  slack:
    webhook_url: ${SLACK_WEBHOOK_URL}
```

Not sure which packages to watch? See [Monitored Packages](#monitored-packages) below.

### 3. Add your secrets

Go to your fork → **Settings → Secrets and variables → Actions → New repository secret**.

Add the following secret:

| Secret name | Where to get it |
|---|---|
| `SLACK_WEBHOOK_URL` | [Create an incoming webhook](https://api.slack.com/messaging/webhooks) in your Slack workspace |

> **Your secrets never leave GitHub.** The config file only contains `${ENV_VAR}` placeholder names. The actual values live exclusively in your repository secrets and are injected at workflow runtime — they are never written to any file or committed to the repo.

### 4. Enable GitHub Actions

Go to your fork → **Actions** tab → click **"I understand my workflows, go ahead and enable them"**.

The workflow runs every 15 minutes automatically. You can also trigger it manually from the Actions tab at any time.

That's it. You will receive a notification the next time an Aztec package you're watching gets a new version.

---

## What a notification looks like

**Slack:**

```
Aztec 4.1.0-rc.5

@aztec/aztec.js   4.1.0-rc.4 → 4.1.0-rc.5
@aztec/accounts   4.1.0-rc.4 → 4.1.0-rc.5
@aztec/wallets    4.1.0-rc.4 → 4.1.0-rc.5
@aztec/pxe        4.1.0-rc.4 → 4.1.0-rc.5

⚠ Schnorr class ID changed — update before deploying accounts
  old: 0x1939ef95...c2f
  new: 0x010319cf...02

npm install @aztec/aztec.js@rc @aztec/accounts@rc @aztec/wallets@rc @aztec/pxe@rc
```

When all your watched packages update together (which is the norm — Aztec is a monorepo), you get **one message** with all of them listed and a single install command to copy.

---

## Interactive setup (optional)

If you prefer a guided setup instead of editing YAML directly:

```bash
git clone https://github.com/YOUR-FORK/aztec-watcher
cd aztec-watcher
npm install
npx tsx src/cli/index.ts setup
```

The wizard asks three questions (what you're building, which packages to watch, where to send notifications) and writes the config file for you.

```
? What are you building?
  ❯ dApp / frontend
    Smart contract
    Wallet integration
    Node / validator
    Faucet / tooling

? Review and customize the package list? › No

? Where should we send notifications?
  ❯ Slack (incoming webhook)
    Telegram (bot)
    Both Slack and Telegram
    No notifications (dry run)

✓ Config saved to aztec-watch.config.yaml
```

---

## Running locally

```bash
npm install
npm run build

# First run: seeds the state database, no notifications sent
node dist/cli/index.js run

# Subsequent runs: sends notifications for any changes since last run
node dist/cli/index.js run
```

Set credentials in your shell before running:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
node dist/cli/index.js run
```

---

## Running via Docker

```bash
docker build -t aztec-watcher .
docker run -d \
  -e SLACK_WEBHOOK_URL="https://hooks.slack.com/..." \
  -v $(pwd)/aztec-watch.config.yaml:/app/aztec-watch.config.yaml \
  -v aztec-watcher-data:/app/data \
  aztec-watcher
```

> Docker support coming soon — Dockerfile not yet included.

---

## Testing your setup

### Step 1 — send a test notification

Before waiting for a real Aztec release, verify your credentials work:

```bash
# Set your credentials in the shell
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Send a fake but realistic notification to all configured sinks
npx tsx src/cli/index.ts test
# or after building:
node dist/cli/index.js test
```

This sends a fake `Aztec 4.1.0-rc.5 [TEST]` message using your first few configured packages. If you see it arrive in Slack, credentials are correct and the format is exactly what real notifications will look like.

### Step 2 — test real detection locally

```bash
# First run: seeds the state database with current npm versions, no notifications
npx tsx src/cli/index.ts run

# Delete the state database to simulate "never seen these versions before"
rm data/state.db

# Run again: now every package looks "new" and triggers a notification
npx tsx src/cli/index.ts run
```

You'll receive a real notification with real current package versions. After this, subsequent runs will only notify when something actually changes.

### Step 3 — trigger manually in GitHub Actions

After pushing your config to your fork:

1. Go to your fork → **Actions** tab
2. Click **aztec-watch** in the left sidebar
3. Click **Run workflow** → **Run workflow**

You'll see the run in real time. If it passes and you got a notification, everything is working end to end.

---

## Running via cron

```bash
npm install -g aztec-watcher  # coming soon — not yet published to npm
# or: clone the repo and use the local path

# Add to crontab:
*/15 * * * * cd /path/to/aztec-watcher && SLACK_WEBHOOK_URL=... node dist/cli/index.js run >> /var/log/aztec-watcher.log 2>&1
```

---

## Monitored packages

65 official packages across 9 categories. Add any of them to your config with the tags you care about.

### Core SDK
| Package | Tags | Purpose |
|---|---|---|
| `@aztec/aztec.js` | `devnet`, `rc`, `latest` | Primary client SDK |
| `@aztec/accounts` | `devnet`, `rc`, `latest` | Schnorr/ECDSA account contracts |
| `@aztec/wallets` | `devnet`, `rc`, `latest` | Embedded wallet |
| `@aztec/pxe` | `devnet`, `rc`, `latest` | Private execution environment |
| `@aztec/cli` | `devnet`, `rc`, `latest` | aztec-cli tool |
| `@aztec/cli-wallet` | `devnet`, `rc`, `latest` | CLI wallet backed by PXE |
| `@aztec/wallet-sdk` | `devnet`, `rc`, `latest` | dApp wallet integration SDK |
| `@aztec/builder` | `devnet`, `rc`, `latest` | TypeScript contract wrapper generator |
| `@aztec/aztec` | `devnet`, `rc`, `latest` | Local dev sandbox meta-package |

### Standard Library
| Package | Tags | Purpose |
|---|---|---|
| `@aztec/stdlib` | `devnet`, `rc`, `latest` | JS types and helpers |
| `@aztec/foundation` | `devnet`, `rc`, `latest` | Core utilities (Fr, Fq, JSON-RPC) |
| `@aztec/constants` | `devnet`, `rc`, `latest` | Protocol constants |

### Contract Artifacts
| Package | Tags | Purpose |
|---|---|---|
| `@aztec/noir-contracts.js` | `devnet`, `rc`, `latest` | Standard contract ABIs |
| `@aztec/protocol-contracts` | `devnet`, `rc`, `latest` | Canonical network contracts |
| `@aztec/entrypoints` | `devnet`, `rc`, `latest` | Transaction entrypoints |

### Cryptography
| Package | Tags | Purpose |
|---|---|---|
| `@aztec/bb.js` | `devnet`, `rc`, `latest` | Barretenberg WASM bindings |
| `@aztec/simulator` | `devnet`, `rc`, `latest` | ACIR/AVM circuit simulator |
| `@aztec/merkle-tree` | `devnet`, `rc`, `latest` | Merkle tree implementations |

### Infrastructure
| Package | Tags | Purpose |
|---|---|---|
| `@aztec/aztec-node` | `devnet`, `rc`, `latest` | Full sequencer node |
| `@aztec/sequencer-client` | `devnet`, `rc`, `latest` | Sequencer module |
| `@aztec/prover-client` | `devnet`, `rc`, `latest` | Proving orchestrator |
| `@aztec/validator-client` | `devnet`, `rc`, `latest` | Block attestation validator |
| `@aztec/world-state` | `devnet`, `rc`, `latest` | Global Merkle tree manager |
| `@aztec/archiver` | `devnet`, `rc`, `latest` | L1 data fetcher |
| `@aztec/p2p` | `devnet`, `rc`, `latest` | P2P networking |

### Noir Language
| Package | Tags | Purpose |
|---|---|---|
| `@noir-lang/noir_js` | `latest`, `nightly`, `aztec` | Noir JS interface |
| `@noir-lang/noir_wasm` | `latest`, `nightly`, `aztec` | Noir to ACIR compiler |
| `@noir-lang/acvm_js` | `latest`, `nightly`, `aztec` | ACVM executor |

Full package list with all 65 entries: [`src/data/packages.ts`](src/data/packages.ts)

---

## Adding a custom package

Any npm package can be tracked — not just Aztec ones. Add it directly to the config:

```yaml
packages:
  - name: "viem"
    tags: [latest]
  - name: "@openzeppelin/contracts"
    tags: [latest]
```

Or via the CLI after setup:

```bash
# Coming soon
aztec-watcher add https://www.npmjs.com/package/viem
```

---

## How state is persisted in GitHub Actions

After each run, the workflow commits `data/state.db` back to your fork. This file contains only package names and version numbers — no secrets. It's how the bot remembers what it already notified you about between runs.

The commit message includes `[skip ci]` so the commit doesn't trigger another workflow run.

---

## Security

- **No secrets in the repo.** The config file uses `${ENV_VAR}` placeholders. Actual values live in GitHub Actions secrets only.
- **No outbound connections except** npm registry (`registry.npmjs.org`), Slack (`hooks.slack.com`), and Telegram (`api.telegram.org`).
- **No server, no SaaS dependency.** Runs entirely on GitHub's infrastructure in your own fork.

---

## License

MIT — see [LICENSE](LICENSE)
