#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import which from "which";
import { execa, execaCommand } from "execa";
import ora from "ora";
import chalk from "chalk";
import os from "node:os";
import {
  TOOLS,
  ToolKey,
  AiSwitchConfig,
  getInstallerChoices,
  getToolDefinition,
  loadConfig,
  normalizeToolKey,
  passthroughArgs,
  formatShellCommand,
  selectYoloFlag,
} from "./core.js";

async function isInstalled(bin: string): Promise<boolean> {
  try {
    await which(bin);
    return true;
  } catch {
    return false;
  }
}

async function ensureInstalled(
  toolKey: ToolKey,
  dryRun: boolean,
): Promise<boolean> {
  const tool = getToolDefinition(toolKey);
  if (await isInstalled(tool.bin)) {
    return true;
  }

  if (dryRun) {
    console.log(
      chalk.yellow(
        `[dry-run] ${tool.pretty} is not installed. Would prompt to install.`,
      ),
    );
    return true;
  }

  const choices = getInstallerChoices(tool);
  const { install } = await inquirer.prompt([
    {
      type: "list",
      name: "install",
      message: `${tool.pretty} is not installed. Install now?`,
      choices,
    },
  ]);

  if (!install) {
    console.log(
      chalk.yellow(
        "Cancelled. Install the tool manually and rerun the command.",
      ),
    );
    return false;
  }

  console.log(chalk.cyanBright(`> ${install}`));
  const spinner = ora(`Installing ${tool.pretty}…`).start();
  try {
    await execaCommand(install, { stdio: "inherit", shell: true });
    spinner.succeed(`${tool.pretty} installed.`);
    return true;
  } catch (error) {
    spinner.fail(`Install failed. Run manually: ${install}`);
    console.error(chalk.red((error as Error).message));
    return false;
  }
}

interface LaunchOptions {
  dryRun: boolean;
  yolo: boolean;
  config: AiSwitchConfig;
  argv: string[];
}

async function launch(toolKey: ToolKey, options: LaunchOptions) {
  const tool = getToolDefinition(toolKey);
  const passthrough = passthroughArgs(options.argv);
  const defaultFlags = options.config.defaultFlags ?? [];
  const yoloFlag = options.yolo ? selectYoloFlag(tool) : undefined;

  if (options.yolo) {
    console.log(
      chalk.bold.red(
        "YOLO mode bypasses approvals and sandboxing. Proceed with caution.",
      ),
    );
    if (!yoloFlag) {
      console.log(
        chalk.yellow(
          `${tool.pretty} does not expose a documented YOLO/skip-permissions flag. Launching without extras.`,
        ),
      );
    }
  }

  const args = [
    ...(yoloFlag ? [yoloFlag] : []),
    ...defaultFlags,
    ...passthrough,
  ];

  const commandString = formatShellCommand(tool.bin, args);
  console.log(chalk.cyanBright(`> ${commandString}`));

  if (options.dryRun) {
    return;
  }

  try {
    const result = await execa(tool.bin, args, {
      stdio: "inherit",
      shell: os.platform() === "win32",
      reject: false,
    });
    process.exit(result.exitCode ?? 0);
  } catch (error) {
    console.error(
      chalk.red(`Failed to launch ${tool.pretty}: ${(error as Error).message}`),
    );
    process.exit(1);
  }
}

function resolveToolFromInput(
  toolArg: string | undefined,
  config: AiSwitchConfig,
): ToolKey | undefined {
  if (toolArg) {
    const normalized = normalizeToolKey(toolArg);
    if (!normalized) {
      console.error(chalk.red(`Unknown tool: ${toolArg}`));
      process.exit(1);
    }
    return normalized;
  }
  if (config.defaultTool) {
    return config.defaultTool;
  }
  return undefined;
}

function requireToolKey(tool?: ToolKey): ToolKey {
  if (!tool) {
    throw new Error("Tool key is required");
  }
  return tool;
}

async function runUseCommand(toolInput: string | undefined, dryRun: boolean) {
  const config = loadConfig(process.cwd(), console);
  let toolKey = resolveToolFromInput(toolInput, config);

  if (!toolKey) {
    const { picked } = await inquirer.prompt([
      {
        type: "list",
        name: "picked",
        message: "Pick a tool to launch:",
        choices: Object.keys(TOOLS),
      },
    ]);
    toolKey = requireToolKey(normalizeToolKey(picked));
  }

  const ready = await ensureInstalled(toolKey, dryRun);
  if (!ready) {
    if (!dryRun) process.exit(1);
    return;
  }

  await launch(toolKey, { dryRun, yolo: false, config, argv: process.argv });
}

async function runYoloCommand(toolInput: string, dryRun: boolean) {
  const config = loadConfig(process.cwd(), console);
  const toolKey = requireToolKey(normalizeToolKey(toolInput));

  const ready = await ensureInstalled(toolKey, dryRun);
  if (!ready) {
    if (!dryRun) process.exit(1);
    return;
  }

  await launch(toolKey, { dryRun, yolo: true, config, argv: process.argv });
}
const program = new Command();
program
  .name("ai")
  .description(
    "One CLI to run Codex, Claude Code, or Gemini (and install if missing).",
  )
  .version("0.1.0")
  .option("--dry-run", "Print commands without executing them");

const useCommand = new Command("use")
  .argument("[tool]", "codex | claude | gemini")
  .allowExcessArguments(true)
  .description("Launch a coding agent in the current directory")
  .action(async (toolInput?: string) => {
    const dryRun = Boolean(program.opts<{ dryRun?: boolean }>().dryRun);
    await runUseCommand(toolInput, dryRun);
  });

const yoloCommand = new Command("yolo")
  .argument("<tool>", "codex | claude | gemini")
  .allowExcessArguments(true)
  .description("Launch with the tool's documented skip-approvals flag")
  .action(async (toolInput: string) => {
    const dryRun = Boolean(program.opts<{ dryRun?: boolean }>().dryRun);
    await runYoloCommand(toolInput, dryRun);
  });

program.addCommand(useCommand, { isDefault: true });
program.addCommand(yoloCommand);

program
  .command("doctor")
  .description("Show install status for supported tools")
  .action(async () => {
    for (const key of Object.keys(TOOLS) as ToolKey[]) {
      const tool = getToolDefinition(key);
      const ok = await isInstalled(tool.bin);
      const mark = ok ? chalk.green("✔") : chalk.yellow("✖");
      console.log(
        `${mark} ${key.padEnd(7)} → ${tool.bin}${ok ? "" : " (not found)"}`,
      );
    }
  });

program.parseAsync(process.argv);
