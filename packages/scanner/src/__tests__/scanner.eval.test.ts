/**
 * End-to-end eval tests for the full scan pipeline.
 * These use fixture files under __tests__/fixtures/ and assert that
 * the scanner produces the expected trust score range and required findings.
 */
import { describe, it, expect } from "vitest";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { scanPath } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

describe("eval: malicious skill", () => {
  const results = scanPath(resolve(FIXTURES, "malicious-skill"));

  it("produces exactly one scan result", () => {
    expect(results).toHaveLength(1);
  });

  it("identifies the artifact as a skill", () => {
    expect(results[0]?.artifactType).toBe("skill");
  });

  it("trust score is RED (below 40)", () => {
    expect(results[0]?.trustScore).toBeLessThan(40);
    expect(results[0]?.trustBand).toBe("red");
  });

  it("detects at least one critical finding", () => {
    expect(results[0]?.summary.critical).toBeGreaterThan(0);
  });

  it("detects curl-to-shell exfiltration (EXFIL-001)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "EXFIL-001")).toBe(true);
  });

  it("detects eval obfuscation (OBFSC-001)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "OBFSC-001")).toBe(true);
  });

  it("detects base64 decode (OBFSC-002)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "OBFSC-002")).toBe(true);
  });

  it("detects privilege escalation via sudo (PRIV-002)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "PRIV-002")).toBe(true);
  });

  it("detects prompt injection (INJECT-001)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "INJECT-001")).toBe(true);
  });

  it("all findings have a line number", () => {
    const missing = results[0]?.findings.filter((f) => f.line === undefined);
    expect(missing).toHaveLength(0);
  });
});

describe("eval: clean skill", () => {
  const results = scanPath(resolve(FIXTURES, "clean-skill"));

  it("produces exactly one scan result", () => {
    expect(results).toHaveLength(1);
  });

  it("trust score is GREEN (90+)", () => {
    expect(results[0]?.trustScore).toBeGreaterThanOrEqual(90);
    expect(results[0]?.trustBand).toBe("green");
  });

  it("has zero findings", () => {
    expect(results[0]?.findings).toHaveLength(0);
  });
});

describe("eval: malicious hooks", () => {
  const results = scanPath(resolve(FIXTURES, "malicious-hooks"));

  it("identifies the artifact as a hook", () => {
    expect(results[0]?.artifactType).toBe("hook");
  });

  it("trust score is RED or ORANGE", () => {
    expect(results[0]?.trustScore).toBeLessThan(70);
  });

  it("detects network exfiltration in hook (EXFIL-005)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "EXFIL-005")).toBe(true);
  });

  it("emits HOOK-002 exactly once for the suspicious SessionStart", () => {
    const hook002 = results[0]?.findings.filter((f) => f.ruleId === "HOOK-002");
    expect(hook002).toHaveLength(1);
  });
});

describe("eval: clean hooks", () => {
  const results = scanPath(resolve(FIXTURES, "clean-hooks"));

  it("trust score is GREEN", () => {
    expect(results[0]?.trustBand).toBe("green");
  });

  it("has zero findings", () => {
    expect(results[0]?.findings).toHaveLength(0);
  });
});

describe("eval: malicious MCP config", () => {
  const results = scanPath(resolve(FIXTURES, "malicious-mcp"));

  it("identifies the artifact as an mcp-server", () => {
    expect(results[0]?.artifactType).toBe("mcp-server");
  });

  it("trust score is RED or ORANGE (MCP findings have no line numbers so dedup groups them)", () => {
    expect(results[0]?.trustScore).toBeLessThan(70);
  });

  it("detects curl|sh payload hidden in args (EXFIL-001)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "EXFIL-001")).toBe(true);
  });

  it("detects non-HTTPS remote server URL (MCP-002)", () => {
    expect(results[0]?.findings.some((f) => f.ruleId === "MCP-002")).toBe(true);
  });
});

describe("eval: clean MCP config", () => {
  const results = scanPath(resolve(FIXTURES, "clean-mcp"));

  it("trust score is GREEN", () => {
    expect(results[0]?.trustBand).toBe("green");
  });

  it("has zero findings", () => {
    expect(results[0]?.findings).toHaveLength(0);
  });
});

describe("eval: scanPath on non-existent path", () => {
  it("throws an error", () => {
    expect(() => scanPath("/does/not/exist/anywhere")).toThrow();
  });
});

describe("eval: scanPath on directory with no scannable artifacts", () => {
  it("returns an empty array for a directory containing only non-scannable files", () => {
    const dir = mkdtempSync(join(tmpdir(), "sentinel-empty-"));
    writeFileSync(join(dir, "readme.txt"), "not scannable");
    try {
      expect(scanPath(dir)).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
