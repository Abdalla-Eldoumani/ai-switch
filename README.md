# ai-switch

[![npm version](https://img.shields.io/npm/v/ai-switch.svg?color=cb3837)](https://www.npmjs.com/package/ai-switch)

`ai-switch` is a small Node/TypeScript CLI that finds (via `which`), optionally installs, and launches AI coding agents: Codex, Claude Code, Gemini, Aider, Amp, and Qwen. Every tool has a two-letter alias. It can apply project defaults, pass each tool's documented YOLO flag, and always prints the exact command before it runs.

## Features
- `ai use [tool]` launches any supported agent; omit the tool to pick interactively or fall back to the project's configured default.
- Two-letter aliases for every tool: `ai yolo cc` launches Claude Code, `ai use cx` launches Codex.
- If the binary is missing, the CLI offers install commands (npm, pip, or Homebrew on macOS) and streams their output.
- `--dry-run` prints the resolved launch command without running anything.
- `ai yolo <tool>` forwards the first documented skip-approvals flag for that tool and prints a bold warning.
- `ai doctor` reports PATH status for every supported agent.
- Arguments after `--` are passed verbatim to the downstream CLI; defaults from `.ai-switch.json` are prepended first.

## Installation

From npm:

```bash
npm install -g ai-switch
```

From source:

```bash
npm install
npm run build           # emits compiled JS to dist/src
npm link                # exposes the `ai` binary from dist/src/index.js
```

## Usage

```bash
ai                      # interactive picker unless a default tool is configured
ai use codex            # launch OpenAI Codex in the current directory
ai use cc               # same thing using the alias for Claude Code
ai yolo cx              # launch Codex with skip-approvals via alias
ai use claude -- --help # pass flags through with "--"
ai --dry-run use gm     # dry-run Gemini via alias
ai yolo codex           # launch with the tool's YOLO/skip-approvals flag
ai doctor               # show which binaries are currently on PATH
```

When YOLO mode is requested, the wrapper warns in red and only appends the first YOLO flag declared for the tool (e.g. Codex `--yolo`). If a tool has no documented skip-approvals flag (Aider), it simply launches normally after warning you.

## Aliases

Every tool has a short alias for quick invocation:

| Tool    | Alias | Example          |
|---------|-------|------------------|
| codex   | `cx`  | `ai yolo cx`     |
| claude  | `cc`  | `ai use cc`      |
| gemini  | `gm`  | `ai yolo gm`     |
| aider   | `ad`  | `ai use ad`      |
| amp     | `am`  | `ai use am`      |
| qwen    | `qw`  | `ai yolo qw`     |

Aliases work everywhere tool names are accepted: CLI arguments, `defaultTool` in `.ai-switch.json`, and the interactive picker shows them as hints.

## Supported tools

| Tool | Binary | Install | YOLO flag |
|------|--------|---------|-----------|
| OpenAI Codex CLI | `codex` | npm, brew (macOS) | `--yolo` |
| Anthropic Claude Code | `claude` | npm, brew (macOS) | `--dangerously-skip-permissions` |
| Google Gemini CLI | `gemini` | npm, brew (macOS) | `--yolomode` |
| Aider | `aider` | pip, brew (macOS) | -- |
| Sourcegraph Amp | `amp` | npm | `--dangerously-allow-all` |
| Qwen Code | `qwen` | npm | `--yolo` |

## Project configuration

Add an optional `.ai-switch.json` to your project root to establish defaults for `use` and `yolo` commands:

```json
{
  "defaultTool": "codex",
  "defaultFlags": ["--model", "gpt-5-codex"]
}
```

- `defaultTool` accepts full names or aliases (e.g. `"cc"` for Claude Code).
- `defaultFlags` are inserted ahead of any passthrough args (including those provided after `--`).

The loader validates both fields: unknown tools or non-string arrays are ignored with a console warning so the CLI never crashes on malformed config, and parse errors fall back to empty defaults.

## Safety defaults

Every downstream CLI has its own sandboxing and approval controls. Prefer enabling approvals and a workspace-write sandbox in their native configs so that launching through `ai-switch` inherits those safer defaults. For example, Codex users can add this to `~/.codex/config.toml`:

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

## Doctor command

`ai doctor` runs a simple PATH probe for each supported tool. Missing binaries show up with a yellow cross and will trigger the installer prompt the next time you run `ai use` / `ai yolo`.

## Security

- Installer commands are hard-coded and run through a shell with `execaCommand`; tool launches use argv arrays to avoid shell injection (Windows uses `shell: true` only to support `.cmd` shims).
- Treat `.ai-switch.json` as trusted input; untrusted defaults could add flags to downstream CLIs, so review contributions before committing.
- Run `npm audit` and `npm test` before publishing new versions to catch regressions early.

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
```

The sources live in `src/` and compile to `dist/src`. Keep the build output current before publishing or linking locally.

Run `npx vitest` for watch mode while iterating; [docs/testing.md](docs/testing.md) describes the suite.

## Documentation

- [Development guide](docs/development.md) covers architecture, installer safety, and publishing steps.
- [Testing guide](docs/testing.md) outlines the Vitest suite, fixtures, and future coverage goals.

## Roadmap

- Add a VS Code command runner that shells out to `ai use <tool>`
- Offer optional Docker sandbox profiles for YOLO sessions
- Replace the prompt with a richer Ink-powered TUI picker
- Add more agents as they stabilize (Cline, Cursor CLI, Devin)

## License

This project is open source and available under the [MIT License](LICENSE).
