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

## Quickstart

```bash
npx aztec-watch init
```

The interactive wizard asks what you're building, which packages to watch, your Slack webhook, and how you want to run it. It writes `aztec-watch.config.yaml` and (if you choose GitHub Actions) scaffolds the workflow file too.

If you chose **GitHub Actions**, three steps remain:

1. **Commit and push** the generated files
2. **Add `SLACK_WEBHOOK_URL`** as a GitHub repository secret (Settings → Secrets → Actions)
3. **Enable Actions** on your repo

That's it — aztec-watch will run every 15 minutes and ping you the moment a new Aztec version lands.

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

## Running locally

```bash
npm install
npm run build

export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# First run: seeds the state file, no notifications sent
node dist/cli/index.js run

# Subsequent runs: sends notifications for any changes since last run
node dist/cli/index.js run
```

---

## Testing your setup

### Send a test notification

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Send a fake but realistic notification
npx aztec-watch test
# or after building:
node dist/cli/index.js test
```

This sends a fake `Aztec 4.1.0-rc.5 [TEST]` message. If you see it in Slack, your webhook is working.

### Test real detection

```bash
# First run: seeds state with current npm versions, no notifications
node dist/cli/index.js run

# Delete state to simulate "never seen these versions before"
rm data/state.json

# Run again: every package looks "new" and triggers a real notification
node dist/cli/index.js run
```

### Trigger manually in GitHub Actions

1. Go to your repo → **Actions** tab
2. Click **aztec-watch** in the left sidebar
3. Click **Run workflow** → **Run workflow**

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

---

## How state is persisted

aztec-watch stores a simple JSON file (`data/state.json`) that maps each package+tag to its last-seen version. No database needed.

In GitHub Actions, the workflow commits this file back to the repo after each run. The commit includes `[skip ci]` so it doesn't trigger another workflow run.

---

## Security

- **No secrets in the repo.** The config file uses `${ENV_VAR}` placeholders. Actual values live in GitHub Actions secrets only.
- **No outbound connections except** npm registry (`registry.npmjs.org`) and Slack (`hooks.slack.com`).
- **No server, no SaaS dependency.** Runs entirely on GitHub's infrastructure in your own repo.

---

## License

MIT — see [LICENSE](LICENSE)
