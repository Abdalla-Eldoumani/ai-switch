import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ALIASES,
  TOOLS,
  ToolDefinition,
  ToolKey,
  formatShellCommand,
  getAliasesForTool,
  getInstallerChoices,
  getToolDefinition,
  hasTool,
  loadConfig,
  normalizeToolKey,
  passthroughArgs,
  selectYoloFlag,
} from "../src/core.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("passthroughArgs", () => {
  it("returns everything after --", () => {
    const argv = ["node", "ai", "use", "codex", "--", "--version", "--help"];
    expect(passthroughArgs(argv)).toEqual(["--version", "--help"]);
  });

  it("returns an empty array when -- is missing", () => {
    const argv = ["node", "ai", "use", "codex"];
    expect(passthroughArgs(argv)).toEqual([]);
  });

  it("retains additional -- tokens in passthrough payload", () => {
    const argv = [
      "node",
      "ai",
      "use",
      "codex",
      "--",
      "--flag",
      "--",
      "literal",
    ];
    expect(passthroughArgs(argv)).toEqual(["--flag", "--", "literal"]);
  });
});

describe("selectYoloFlag", () => {
  it("prefers the first known YOLO flag for each tool", () => {
    expect(selectYoloFlag(TOOLS.codex)).toBe("--yolo");
    expect(selectYoloFlag(TOOLS.claude)).toBe("--dangerously-skip-permissions");
    expect(selectYoloFlag(TOOLS.gemini)).toBe("--yolomode");
    expect(selectYoloFlag(TOOLS.qwen)).toBe("--yolo");
  });

  it("returns undefined for tools without YOLO flags", () => {
    expect(selectYoloFlag(TOOLS.aider)).toBeUndefined();
    expect(selectYoloFlag(TOOLS.amp)).toBeUndefined();
  });

  it("returns undefined when a tool offers no YOLO flag", () => {
    const tool: ToolDefinition = {
      bin: "example",
      pretty: "Example CLI",
      installers: [],
    };
    expect(selectYoloFlag(tool)).toBeUndefined();
  });
});

describe("normalizeToolKey", () => {
  it("normalizes mixed-case keys", () => {
    expect(normalizeToolKey("CoDeX")).toBe("codex");
  });

  it("rejects unknown tools", () => {
    expect(normalizeToolKey("cursor")).toBeUndefined();
    expect(normalizeToolKey(undefined)).toBeUndefined();
    expect(normalizeToolKey(null)).toBeUndefined();
    expect(normalizeToolKey("zz")).toBeUndefined();
  });

  it("resolves short aliases to canonical keys", () => {
    expect(normalizeToolKey("cc")).toBe("claude");
    expect(normalizeToolKey("cx")).toBe("codex");
    expect(normalizeToolKey("gm")).toBe("gemini");
    expect(normalizeToolKey("ad")).toBe("aider");
    expect(normalizeToolKey("am")).toBe("amp");
    expect(normalizeToolKey("qw")).toBe("qwen");
  });

  it("alias resolution is case-insensitive", () => {
    expect(normalizeToolKey("CC")).toBe("claude");
    expect(normalizeToolKey("Gm")).toBe("gemini");
    expect(normalizeToolKey("QW")).toBe("qwen");
  });

  it("canonical name takes priority over alias", () => {
    // "claude" is both a canonical key and could hypothetically be an alias
    // canonical check runs first, so the result is always "claude"
    expect(normalizeToolKey("claude")).toBe("claude");
    expect(normalizeToolKey("gemini")).toBe("gemini");
  });
});

describe("ALIASES", () => {
  it("every alias resolves to a valid ToolKey", () => {
    for (const [alias, target] of Object.entries(ALIASES)) {
      expect(target in TOOLS).toBe(true);
    }
  });

  it("no alias collides with a canonical tool key", () => {
    for (const alias of Object.keys(ALIASES)) {
      expect(alias in TOOLS).toBe(false);
    }
  });

  it("aliases are all lowercase", () => {
    for (const alias of Object.keys(ALIASES)) {
      expect(alias).toBe(alias.toLowerCase());
    }
  });
});

describe("getAliasesForTool", () => {
  it("returns aliases for claude", () => {
    expect(getAliasesForTool("claude")).toEqual(["cc"]);
  });

  it("returns aliases for codex", () => {
    expect(getAliasesForTool("codex")).toEqual(["cx"]);
  });

  it("returns aliases for all tools", () => {
    for (const key of Object.keys(TOOLS) as ToolKey[]) {
      const aliases = getAliasesForTool(key);
      expect(aliases.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("hasTool", () => {
  it("reports known tools", () => {
    expect(hasTool("codex")).toBe(true);
    expect(hasTool("cursor")).toBe(false);
  });

  it("recognizes new tools", () => {
    expect(hasTool("aider")).toBe(true);
    expect(hasTool("amp")).toBe(true);
    expect(hasTool("qwen")).toBe(true);
  });

  it("recognizes aliases", () => {
    expect(hasTool("cc")).toBe(true);
    expect(hasTool("cx")).toBe(true);
    expect(hasTool("gm")).toBe(true);
    expect(hasTool("ad")).toBe(true);
    expect(hasTool("am")).toBe(true);
    expect(hasTool("qw")).toBe(true);
  });
});

describe("getToolDefinition", () => {
  it("returns metadata for the requested tool", () => {
    const tool = getToolDefinition("claude");
    expect(tool.pretty).toBe("Anthropic Claude Code");
    expect(tool.bin).toBe("claude");
  });

  it("returns metadata for new tools", () => {
    expect(getToolDefinition("aider").pretty).toBe("Aider");
    expect(getToolDefinition("aider").bin).toBe("aider");
    expect(getToolDefinition("amp").pretty).toBe("Sourcegraph Amp");
    expect(getToolDefinition("amp").bin).toBe("amp");
    expect(getToolDefinition("qwen").pretty).toBe("Qwen Code");
    expect(getToolDefinition("qwen").bin).toBe("qwen");
  });
});

describe("getInstallerChoices", () => {
  it("includes brew installer on darwin", () => {
    const choices = getInstallerChoices(TOOLS.codex, "darwin");
    expect(choices).toEqual([
      {
        name: "npm: npm install -g @openai/codex",
        value: "npm install -g @openai/codex",
      },
      {
        name: "brew: brew install codex",
        value: "brew install codex",
      },
      { name: "Cancel", value: "" },
    ]);
  });

  it("filters platform-specific installers", () => {
    const choices = getInstallerChoices(TOOLS.codex, "linux");
    expect(choices).toEqual([
      {
        name: "npm: npm install -g @openai/codex",
        value: "npm install -g @openai/codex",
      },
      { name: "Cancel", value: "" },
    ]);
  });

  it("shows pip and brew for aider on darwin", () => {
    const choices = getInstallerChoices(TOOLS.aider, "darwin");
    expect(choices).toEqual([
      {
        name: "pip: pip install aider-chat",
        value: "pip install aider-chat",
      },
      {
        name: "brew: brew install aider",
        value: "brew install aider",
      },
      { name: "Cancel", value: "" },
    ]);
  });

  it("shows only pip for aider on linux", () => {
    const choices = getInstallerChoices(TOOLS.aider, "linux");
    expect(choices).toEqual([
      {
        name: "pip: pip install aider-chat",
        value: "pip install aider-chat",
      },
      { name: "Cancel", value: "" },
    ]);
  });
});

describe("formatShellCommand", () => {
  it("keeps already safe arguments untouched", () => {
    expect(formatShellCommand("codex", ["--version"])).toBe("codex --version");
  });

  it("quotes arguments with spaces or quotes", () => {
    const command = formatShellCommand("codex", ["--model", "space value", "mix'ed"]);
    expect(command).toBe("codex --model 'space value' 'mix'\''ed'");
  });

  it("quotes empty arguments", () => {
    expect(formatShellCommand("codex", [""])).toBe("codex ''");
  });
});

describe("loadConfig", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-switch-test-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns an empty object when config is missing", () => {
    expect(loadConfig(tmpDir)).toEqual({});
  });

  it("loads and normalizes valid defaults", () => {
    const configPath = path.join(tmpDir, ".ai-switch.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        defaultTool: "CLAUDE",
        defaultFlags: ["--model", "claude-3"],
      }),
    );

    const config = loadConfig(tmpDir);
    expect(config).toEqual({
      defaultTool: "claude",
      defaultFlags: ["--model", "claude-3"],
    });
  });

  it("warns and ignores unknown tools", () => {
    const warn = vi.fn();
    fs.writeFileSync(
      path.join(tmpDir, ".ai-switch.json"),
      JSON.stringify({ defaultTool: "cursor" }),
    );

    const config = loadConfig(tmpDir, { warn });
    expect(config).toEqual({});
    expect(warn).toHaveBeenCalledWith("Ignoring unknown defaultTool: cursor");
  });

  it("warns and ignores non-string defaultFlags entries", () => {
    const warn = vi.fn();
    fs.writeFileSync(
      path.join(tmpDir, ".ai-switch.json"),
      JSON.stringify({ defaultFlags: ["--model", 123] }),
    );

    const config = loadConfig(tmpDir, { warn });
    expect(config).toEqual({});
    expect(warn).toHaveBeenCalledWith(
      "Ignoring defaultFlags because it is not an array of strings.",
    );
  });

  it("warns and falls back to empty config on invalid JSON", () => {
    const warn = vi.fn();
    fs.writeFileSync(path.join(tmpDir, ".ai-switch.json"), "{invalid json");

    const config = loadConfig(tmpDir, { warn });
    expect(config).toEqual({});
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load .ai-switch.json"),
    );
  });

  it("resolves aliases in defaultTool", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".ai-switch.json"),
      JSON.stringify({ defaultTool: "cc" }),
    );

    const config = loadConfig(tmpDir);
    expect(config).toEqual({ defaultTool: "claude" });
  });

  it("resolves new tool names in defaultTool", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".ai-switch.json"),
      JSON.stringify({ defaultTool: "aider" }),
    );

    const config = loadConfig(tmpDir);
    expect(config).toEqual({ defaultTool: "aider" });
  });
});
