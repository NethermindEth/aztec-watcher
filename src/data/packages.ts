import type { CuratedPackage } from '../types.js';

export const CURATED_PACKAGES: CuratedPackage[] = [
  // ── Core Developer SDK ────────────────────────────────────────────────────
  { name: '@aztec/aztec.js',   category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'Primary client SDK for accounts, contracts, and transactions' },
  { name: '@aztec/accounts',   category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'Schnorr, ECDSA, and SingleKey account contract implementations' },
  { name: '@aztec/wallets',    category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'Embedded wallet for Node and browser' },
  { name: '@aztec/pxe',        category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'Private eXecution Environment' },
  { name: '@aztec/cli',        category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'aztec-cli command-line tool' },
  { name: '@aztec/cli-wallet', category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'CLI wallet backed by PXE' },
  { name: '@aztec/wallet-sdk', category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'dApp wallet integration SDK' },
  { name: '@aztec/builder',    category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'TypeScript contract wrapper generator' },
  { name: '@aztec/aztec',      category: 'Core SDK', tags: ['devnet','rc','latest'], purpose: 'Local dev sandbox meta-package' },

  // ── Standard Library ──────────────────────────────────────────────────────
  { name: '@aztec/stdlib',        category: 'Standard Library', tags: ['devnet','rc','latest'], purpose: 'JS types and helpers for Aztec circuits' },
  { name: '@aztec/foundation',    category: 'Standard Library', tags: ['devnet','rc','latest'], purpose: 'Core utilities: Fr, Fq, JSON-RPC, serialisation' },
  { name: '@aztec/circuit-types', category: 'Standard Library', tags: ['latest'],               purpose: 'Circuit-dependent shared types (pre-v4 stable only)' },
  { name: '@aztec/constants',     category: 'Standard Library', tags: ['devnet','rc','latest'], purpose: 'Protocol constants bridging L1/L2' },

  // ── Contract Artifacts ────────────────────────────────────────────────────
  { name: '@aztec/noir-contracts.js',      category: 'Contract Artifacts', tags: ['devnet','rc','latest'], purpose: 'TypeScript artifacts and ABIs for standard Noir contracts' },
  { name: '@aztec/protocol-contracts',     category: 'Contract Artifacts', tags: ['devnet','rc','latest'], purpose: 'Canonical Aztec network contracts' },
  { name: '@aztec/noir-test-contracts.js', category: 'Contract Artifacts', tags: ['devnet','rc','latest'], purpose: 'Contract artifacts used in internal tests' },
  { name: '@aztec/entrypoints',            category: 'Contract Artifacts', tags: ['devnet','rc','latest'], purpose: 'Sample transaction entrypoint implementations' },

  // ── Cryptography and Proving ──────────────────────────────────────────────
  { name: '@aztec/bb.js',                        category: 'Cryptography', tags: ['devnet','rc','latest'], purpose: 'Barretenberg WASM bindings (UltraPlonk, UltraHonk, MegaHonk)' },
  { name: '@aztec/bb-prover',                    category: 'Cryptography', tags: ['devnet','rc','latest'], purpose: 'Native Barretenberg proving layer' },
  { name: '@aztec/simulator',                    category: 'Cryptography', tags: ['devnet','rc','latest'], purpose: 'ACIR/AVM circuit simulator' },
  { name: '@aztec/noir-protocol-circuits-types', category: 'Cryptography', tags: ['devnet','rc','latest'], purpose: 'Bindings for private/public kernel and rollup circuits' },
  { name: '@aztec/ivc-integration',              category: 'Cryptography', tags: ['devnet','rc','latest'], purpose: 'IVC integration between Noir circuits and Barretenberg' },
  { name: '@aztec/merkle-tree',                  category: 'Cryptography', tags: ['devnet','rc','latest'], purpose: 'Append-only, indexed, and sparse Merkle tree implementations' },

  // ── Infrastructure and Node ───────────────────────────────────────────────
  { name: '@aztec/aztec-node',         category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Full sequencer node (P2P, sequencer, prover, archiver)' },
  { name: '@aztec/node-lib',           category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Shared infrastructure between node and prover node' },
  { name: '@aztec/sequencer-client',   category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Sequencer: orders txs, executes public functions, posts L2 blocks' },
  { name: '@aztec/prover-client',      category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Proving orchestrator: generates cryptographic proofs for L2 blocks' },
  { name: '@aztec/prover-node',        category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Standalone prover node process' },
  { name: '@aztec/archiver',           category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Fetches and stores L1 data (blocks, L1-to-L2 messages)' },
  { name: '@aztec/p2p',                category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Peer-to-peer networking and transaction pool gossip' },
  { name: '@aztec/p2p-bootstrap',      category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Bootstrap P2P node for peer discovery' },
  { name: '@aztec/validator-client',   category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Validator: block attestation, checkpoint validation, slashing' },
  { name: '@aztec/validator-ha-signer',category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'High-availability multi-instance validator signer' },
  { name: '@aztec/slasher',            category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Validator slashing module' },
  { name: '@aztec/world-state',        category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Global Merkle tree state manager' },
  { name: '@aztec/blob-client',        category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Blob data storage and retrieval (EIP-4844)' },
  { name: '@aztec/blob-lib',           category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Low-level blob utilities' },
  { name: '@aztec/blob-sink',          category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'HTTP API server for blob sidecar storage' },
  { name: '@aztec/epoch-cache',        category: 'Infrastructure', tags: ['devnet','rc','latest'], purpose: 'Epoch committee and boundary data cache' },

  // ── Storage and Observability ─────────────────────────────────────────────
  { name: '@aztec/kv-store',         category: 'Storage', tags: ['devnet','rc','latest'], purpose: 'Durable key-value store (LMDB backend)' },
  { name: '@aztec/key-store',        category: 'Storage', tags: ['devnet','rc','latest'], purpose: 'Secure private key management for the PXE' },
  { name: '@aztec/node-keystore',    category: 'Storage', tags: ['devnet','rc','latest'], purpose: 'Key management for node operators' },
  { name: '@aztec/telemetry-client', category: 'Storage', tags: ['devnet','rc','latest'], purpose: 'OpenTelemetry observability (metrics, traces, Prometheus)' },
  { name: '@aztec/native',           category: 'Storage', tags: ['devnet','rc','latest'], purpose: 'Native Node.js bindings required to run Aztec' },

  // ── L1 / Ethereum Integration ─────────────────────────────────────────────
  { name: '@aztec/ethereum',     category: 'L1 Integration', tags: ['devnet','rc','latest'], purpose: 'L1 chain config, contract deployment helpers, provider management' },
  { name: '@aztec/l1-artifacts', category: 'L1 Integration', tags: ['devnet','rc','latest'], purpose: 'TypeScript ABIs and bytecode for Aztec L1 Solidity contracts' },
  { name: '@aztec/l1-contracts', category: 'L1 Integration', tags: ['devnet','rc','latest'], purpose: 'The Aztec Solidity contracts themselves' },
  { name: '@aztec/viem',         category: 'L1 Integration', tags: ['latest'],               purpose: 'Aztec-specific viem extensions for L1 interaction' },

  // ── Testing ───────────────────────────────────────────────────────────────
  { name: '@aztec/txe',         category: 'Testing', tags: ['devnet','rc','latest'], purpose: 'Testing eXecution Environment with cheatcodes' },
  { name: '@aztec/bot',         category: 'Testing', tags: ['devnet','rc','latest'], purpose: 'Transaction bot for liveness testing' },
  { name: '@aztec/test-wallet', category: 'Testing', tags: ['latest'],               purpose: 'Test wallet implementation' },

  // ── Vendored Noir Toolchain ───────────────────────────────────────────────
  { name: '@aztec/noir-noirc_abi',    category: 'Vendored Noir', tags: ['devnet','rc','latest'], purpose: 'ABI encoder for Noir programs (vendored from @noir-lang)' },
  { name: '@aztec/noir-acvm_js',      category: 'Vendored Noir', tags: ['devnet','rc','latest'], purpose: 'ACVM executor for ACIR programs (vendored from @noir-lang)' },
  { name: '@aztec/noir-noir_js',      category: 'Vendored Noir', tags: ['devnet','rc','latest'], purpose: 'Noir JS witness and execution interface (vendored)' },
  { name: '@aztec/noir-noir_codegen', category: 'Vendored Noir', tags: ['devnet','rc','latest'], purpose: 'TypeScript code generator from Noir ABIs (vendored)' },

  // ── Upstream Noir Language ────────────────────────────────────────────────
  { name: '@noir-lang/noir_js',               category: 'Noir Language', tags: ['latest','nightly','aztec'], purpose: 'Noir JS interface for executing programs' },
  { name: '@noir-lang/noir_wasm',             category: 'Noir Language', tags: ['latest','nightly','aztec'], purpose: 'Compiles Noir programs to ACIR in Node and browser' },
  { name: '@noir-lang/acvm_js',               category: 'Noir Language', tags: ['latest','nightly','aztec'], purpose: 'ACVM executor for witness generation' },
  { name: '@noir-lang/noirc_abi',             category: 'Noir Language', tags: ['latest','nightly','aztec'], purpose: 'ABI encoder for Noir program inputs' },
  { name: '@noir-lang/noir_codegen',          category: 'Noir Language', tags: ['latest','nightly','aztec'], purpose: 'TypeScript type generator from Noir ABIs' },
  { name: '@noir-lang/types',                 category: 'Noir Language', tags: ['latest','nightly'],          purpose: 'Shared TypeScript types for the Noir JS ecosystem' },
  { name: '@noir-lang/backend_barretenberg', category: 'Noir Language', tags: ['latest'],                    purpose: 'Barretenberg backend adapter for standalone Noir usage' },
  { name: '@noir-lang/source-resolver',       category: 'Noir Language', tags: ['latest'],                    purpose: 'Noir source file resolution utility' },

  // ── MCP and Tooling ───────────────────────────────────────────────────────
  { name: '@aztec/mcp-server', category: 'Tooling', tags: ['latest'], purpose: 'Model Context Protocol server for AI-assisted Aztec development' },
];

export const CATEGORIES = [...new Set(CURATED_PACKAGES.map(p => p.category))];

export const ROLE_PRESETS: Record<string, string[]> = {
  'dApp / frontend': [
    '@aztec/aztec.js',
    '@aztec/accounts',
    '@aztec/wallets',
    '@aztec/pxe',
    '@aztec/stdlib',
    '@aztec/wallet-sdk',
  ],
  'Smart contract': [
    '@aztec/aztec.js',
    '@aztec/accounts',
    '@aztec/stdlib',
    '@aztec/noir-contracts.js',
    '@aztec/bb.js',
    '@aztec/simulator',
  ],
  'Wallet integration': [
    '@aztec/aztec.js',
    '@aztec/accounts',
    '@aztec/wallets',
    '@aztec/wallet-sdk',
    '@aztec/stdlib',
    '@aztec/key-store',
  ],
  'Node / validator': [
    '@aztec/aztec-node',
    '@aztec/sequencer-client',
    '@aztec/prover-client',
    '@aztec/validator-client',
    '@aztec/world-state',
    '@aztec/archiver',
    '@aztec/p2p',
  ],
  'Faucet / tooling': [
    '@aztec/aztec.js',
    '@aztec/accounts',
    '@aztec/stdlib',
    '@aztec/pxe',
    '@aztec/foundation',
    '@aztec/noir-contracts.js',
  ],
};
