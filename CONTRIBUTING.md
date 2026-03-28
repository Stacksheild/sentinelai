# Contributing to SentinelAI

Thank you for your interest in contributing to SentinelAI! This guide will help you get started.

## Contributor License Agreement (CLA)

**Before your first PR can be merged, you must sign our [CLA](CLA.md).**

We use a CLA to ensure that Stacksheild retains the right to offer SentinelAI under multiple licenses, including commercial licenses. This is standard practice for dual-licensed projects (used by MongoDB, Elastic, HashiCorp, and many others).

**What the CLA means for you:**
- You retain copyright to your contributions
- You grant Stacksheild a license to use your contribution under any license terms
- Your contributions will always be available under the PolyForm Noncommercial License
- You are credited as a contributor

**How to sign:** Add the following line to your first PR description:

```
I have read the CLA and I agree to its terms.
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Git

### Setup

```bash
git clone https://github.com/Stacksheild/sentinelai.git
cd sentinelai
pnpm install
pnpm build
```

### Verify everything works

```bash
# Run the scanner on our test fixtures
node packages/cli/dist/index.js scan packages/

# Test the model router
node packages/cli/dist/index.js route code-generation

# Type check all packages
pnpm typecheck
```

## How to Contribute

### Reporting Bugs

Open an issue with:
- A clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, pnpm version)

### Suggesting Features

Open an issue with the `enhancement` label. Describe:
- What problem this solves
- Proposed solution
- Alternatives you considered

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feature/my-feature`
3. **Make your changes** (see guidelines below)
4. **Build and verify**: `pnpm build && pnpm typecheck`
5. **Commit** with a clear message (see commit format below)
6. **Push** to your fork and **open a PR**
7. **Sign the CLA** in your PR description

### Commit Message Format

```
<type>: <short description>

<optional longer description>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
```
feat: add connector analyzer for OpenClaw manifests
fix: false positive in CRED-002 for test fixture files
docs: add examples for CI/CD integration
```

## Contribution Areas

### Adding Detection Rules

Detection rules live in `packages/scanner/src/analyzers/`. Each analyzer handles a specific artifact type.

To add a new pattern to an existing analyzer:

1. Add your regex pattern to the appropriate analyzer file
2. Assign a rule ID following the convention: `CATEGORY-NNN`
   - `EXFIL-*` — Data exfiltration
   - `INJECT-*` — Prompt injection
   - `CRED-*` — Credential access
   - `PRIV-*` — Privilege escalation
   - `OBFSC-*` — Obfuscation
   - `SUPPLY-*` — Supply chain
   - `MCP-*` — MCP-specific
   - `HOOK-*` — Hook-specific
3. Set the appropriate severity level
4. Include a test case showing a true positive and a true negative

### Updating Pricing Data

Pricing data is in `packages/cost-tracker/src/providers/pricing.yaml`.

When a provider changes their pricing:

1. Update the relevant model entry
2. Add a comment with the date and source URL
3. Open a PR with the title: `chore: update pricing for <provider>`

### Adding Model Profiles

Model profiles are in `packages/model-router/src/profiles/models.yaml`.

When adding a new model:

1. Include capability scores for all 8 task types (1.0 to 5.0)
2. Include pricing, context window, latency, and speed data
3. Cite your sources (benchmarks, official docs) in the PR description

### Adding a New Analyzer

To add a new artifact type (e.g., connector analyzer):

1. Create `packages/scanner/src/analyzers/<type>-analyzer.ts`
2. Export a function: `analyze<Type>(filePath: string): ScanFinding[]`
3. Register it in `packages/scanner/src/index.ts`
4. Add artifact detection in `detectArtifactType()`

## Code Guidelines

### Do

- Write TypeScript with strict mode
- Keep functions small and focused
- Use descriptive variable names
- Add JSDoc for public APIs
- Handle edge cases (empty files, invalid JSON, missing fields)

### Don't

- Don't add dependencies unless absolutely necessary
- Don't break the CLI interface (flags, output format)
- Don't change the trust scoring algorithm without discussion
- Don't add features that require API keys or network access for basic operation
- Don't commit `.env` files, API keys, or secrets

### Project Structure

Each package is independent and follows this pattern:

```
packages/<name>/
├── src/           Source code
├── dist/          Build output (gitignored)
├── package.json   Package-specific deps and scripts
└── tsconfig.json  Extends root tsconfig.base.json
```

All cross-package dependencies use `workspace:*` protocol.

## Code of Conduct

- Be respectful and constructive
- Focus on the technical merits of contributions
- Welcome newcomers — everyone starts somewhere
- No harassment, discrimination, or personal attacks

Violations can be reported to the maintainers via GitHub issues.

## Questions?

- Open a [Discussion](https://github.com/Stacksheild/sentinelai/discussions) for questions
- Open an [Issue](https://github.com/Stacksheild/sentinelai/issues) for bugs and features
- Tag your issue with appropriate labels (`bug`, `enhancement`, `documentation`, `question`)

Thank you for helping make the AI ecosystem safer!
