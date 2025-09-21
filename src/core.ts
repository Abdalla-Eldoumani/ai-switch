import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const CONFIG_FILENAME = ".ai-switch.json";

export interface Installer {
  label: string;
  cmd: string;
  platforms?: Array<NodeJS.Platform | "wsl">;
}

export interface ToolDefinition {
  bin: string;
  pretty: string;
  installers: Installer[];
  yoloFlags?: string[];
}

export const TOOLS: Record<"codex" | "claude" | "gemini", ToolDefinition> = {
  codex: {
    bin: "codex",
    pretty: "OpenAI Codex CLI",
    installers: [
      { label: "npm", cmd: "npm install -g @openai/codex" },
      { label: "brew", cmd: "brew install codex", platforms: ["darwin"] },
    ],
    yoloFlags: ["--yolo", "--dangerously-bypass-approvals-and-sandbox"],
  },
  claude: {
    bin: "claude",
    pretty: "Anthropic Claude Code",
    installers: [
      { label: "npm", cmd: "npm install -g @anthropic-ai/claude-code" },
      {
        label: "brew",
        cmd: "brew install --cask claude-code",
        platforms: ["darwin"],
      },
    ],
    yoloFlags: ["--dangerously-skip-permissions"],
  },
  gemini: {
    bin: "gemini",
    pretty: "Google Gemini CLI",
    installers: [
      { label: "npm", cmd: "npm install -g @google/gemini-cli" },
      { label: "brew", cmd: "brew install gemini-cli", platforms: ["darwin"] },
    ],
    yoloFlags: ["--yolomode", "--yolo"],
  },
};

export type ToolKey = keyof typeof TOOLS;

export interface AiSwitchConfig {
  defaultTool?: ToolKey;
  defaultFlags?: string[];
}

export interface LoggerLike {
  warn(message: string): void;
}

const CANCEL_CHOICE = { name: "Cancel", value: "" } as const;

export function normalizeToolKey(value?: string | null): ToolKey | undefined {
  if (!value) return undefined;
  const key = value.toLowerCase();
  if (key in TOOLS) {
    return key as ToolKey;
  }
  return undefined;
}

function isWSL(): boolean {
  if (process.platform !== "linux") return false;
  if ("WSL_DISTRO_NAME" in process.env) return true;
  try {
    const release = fs.readFileSync("/proc/version", "utf8");
    return release.toLowerCase().includes("microsoft");
  } catch {
    return false;
  }
}

function isInstallerSupported(
  installer: Installer,
  platform: NodeJS.Platform = os.platform(),
): boolean {
  if (!installer.platforms || installer.platforms.length === 0) return true;
  const wsl = isWSL();
  if (wsl) {
    return (
      installer.platforms.includes("wsl") ||
      installer.platforms.includes("linux")
    );
  }
  return installer.platforms.includes(platform);
}

export function getInstallerChoices(
  tool: ToolDefinition,
  platform: NodeJS.Platform = os.platform(),
): Array<{ name: string; value: string }> {
  const choices = tool.installers
    .filter((installer) => isInstallerSupported(installer, platform))
    .map((installer) => ({
      name: `${installer.label}: ${installer.cmd}`,
      value: installer.cmd,
    }));
  return [...choices, CANCEL_CHOICE];
}

export function selectYoloFlag(tool: ToolDefinition): string | undefined {
  const [first] = tool.yoloFlags ?? [];
  return first;
}

export function passthroughArgs(argv: string[]): string[] {
  const idx = argv.indexOf("--");
  return idx >= 0 ? argv.slice(idx + 1) : [];
}

function ensureStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((item) => typeof item === "string")
    ? [...value]
    : undefined;
}

export function loadConfig(cwd: string, logger?: LoggerLike): AiSwitchConfig {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) return {};

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const result: AiSwitchConfig = {};
    const maybeTool =
      typeof parsed.defaultTool === "string" ? parsed.defaultTool : undefined;
    const normalizedTool = normalizeToolKey(maybeTool ?? undefined);
    if (normalizedTool) {
      result.defaultTool = normalizedTool;
    } else if (maybeTool) {
      logger?.warn(`Ignoring unknown defaultTool: ${maybeTool}`);
    }

    const flags = ensureStringArray(parsed.defaultFlags);
    if (flags) {
      result.defaultFlags = flags;
    } else if (parsed.defaultFlags !== undefined) {
      logger?.warn(
        "Ignoring defaultFlags because it is not an array of strings.",
      );
    }

    return result;
  } catch (error) {
    logger?.warn(
      `Failed to load ${CONFIG_FILENAME}: ${(error as Error).message}`,
    );
    return {};
  }
}

const SAFE_CHARS = /^[A-Za-z0-9._@%+=:,\/-]+$/;

function quoteArg(arg: string): string {
  if (arg === "") return "''";
  if (SAFE_CHARS.test(arg)) return arg;
  return `'${arg.replace(/'/g, "'\''")}'`;
}

export function formatShellCommand(command: string, args: string[]): string {
  return [command, ...args].map(quoteArg).join(" ");
}

export function hasTool(key: string): key is ToolKey {
  return normalizeToolKey(key) !== undefined;
}

export function getToolDefinition(key: ToolKey): ToolDefinition {
  return TOOLS[key];
}
