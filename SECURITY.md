# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SentinelAI, **please do not open a public issue.**

Instead, report it privately:

1. Go to the [Security Advisories](https://github.com/Stacksheild/sentinelai/security/advisories) page
2. Click "Report a vulnerability"
3. Provide a detailed description of the issue

We will acknowledge your report within 48 hours and provide an estimated timeline for a fix.

## Scope

The following are in scope for security reports:

- Vulnerabilities in SentinelAI's scanner that could be exploited (e.g., a crafted SKILL.md that bypasses detection)
- Code injection or command injection via CLI inputs
- Path traversal vulnerabilities in file scanning
- Data leakage from the cost tracking database
- Dependencies with known CVEs

The following are out of scope:

- Security issues in third-party skills, MCP servers, or plugins that SentinelAI scans (that's what the scanner is for!)
- Denial of service via extremely large input files

## Disclosure Timeline

- **0 days:** Vulnerability reported
- **2 days:** Acknowledgment sent
- **14 days:** Fix developed and tested
- **30 days:** Fix released, advisory published
- **90 days:** Full disclosure (if not already public)

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security Scanning

This project uses the following automated security tools:

- **GitHub CodeQL** — Static analysis for JavaScript/TypeScript vulnerabilities
- **Dependency Review** — Blocks PRs that introduce known-vulnerable dependencies
- **Scorecard** — OpenSSF supply chain security assessment

Thank you for helping keep SentinelAI secure.
