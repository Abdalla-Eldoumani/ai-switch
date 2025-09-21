import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  TOOLS,
  ToolDefinition,
  formatShellCommand,
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
  });
});

describe("hasTool", () => {
  it("reports known tools", () => {
    expect(hasTool("codex")).toBe(true);
    expect(hasTool("cursor")).toBe(false);
  });
});

describe("getToolDefinition", () => {
  it("returns metadata for the requested tool", () => {
    const tool = getToolDefinition("claude");
    expect(tool.pretty).toBe("Anthropic Claude Code");
    expect(tool.bin).toBe("claude");
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
});
