# ai-switch

[![npm version](https://img.shields.io/npm/v/ai-switch.svg?color=cb3837)](https://www.npmjs.com/package/ai-switch)
Link to the NPM Package: (https://www.npmjs.com/package/ai-switch)

`ai-switch` is a lightweight Node/TypeScript CLI that locates (via `which`), optionally installs, and launches popular AI coding agents (Codex, Claude Code, Gemini, Aider, Amp, Qwen). Every tool has a two-letter alias for fast invocation. It can layer project defaults, surface each tool's documented YOLO flag, and always shows the exact command before it runs. It is published as a verified package on npm.

## Features
- `ai use [tool]` launches any supported agent; omit the tool to pick interactively or fall back to the project's configured default.
- Two-letter aliases for every tool: `ai yolo cc` launches Claude Code, `ai use cx` launches Codex.
- If the binary is missing, the CLI offers curated install commands (npm / pip / Homebrew) and streams output so you can see what runs.
- `--dry-run` prints the resolved launch/install command without executing anything, helping you sanity-check automation.
- `ai yolo <tool>` forwards the first documented skip-approvals flag for that tool and prints a bold warning.
- `ai doctor` reports PATH status for every supported agent in a quick checklist.
- Arguments after `--` are passed verbatim to the downstream CLI; defaults from `.ai-switch.json` are prepended first.

## Installation

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

When YOLO mode is requested, the wrapper warns in red and only appends the first YOLO flag declared for the tool (e.g. Codex `--yolo`). If a tool has no documented skip-approvals flag (Aider, Amp), it simply launches normally after warning you.

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
| OpenAI Codex CLI | `codex` | npm, brew | `--yolo` |
| Anthropic Claude Code | `claude` | npm, brew | `--dangerously-skip-permissions` |
| Google Gemini CLI | `gemini` | npm, brew | `--yolomode` |
| Aider | `aider` | pip, brew | -- |
| Sourcegraph Amp | `amp` | npm | -- |
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
[session]
approval_policy = "auto"
sandbox_mode = "workspace-write"
```

## Doctor command

`ai doctor` runs a simple PATH probe for each supported tool. Missing binaries show up with a yellow cross and will trigger the installer prompt the next time you run `ai use` / `ai yolo`.

## Security

- `npm audit` (last run 2025-09-20) reports zero known vulnerabilities after upgrading dev tooling to `vitest@^3.2.4`.
- Installer commands are hard-coded and executed with `execaCommand`; tool launches use argv arrays to avoid shell injection (Windows uses `shell: true` only to support `.cmd` shims).
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

Run `npm test -- --watch` while iterating; the expanded suite details live in [docs/testing.md](docs/testing.md).

## Documentation

- [Development guide](docs/development.md) covers architecture, installer safety, and publishing steps.
- [Testing guide](docs/testing.md) outlines the Vitest suite, fixtures, and future coverage goals.

## Roadmap

- Add a VS Code command runner that shells out to `ai use <tool>`
- Offer optional Docker sandbox profiles for YOLO sessions
- Replace the prompt with a richer Ink-powered TUI picker
- Add more agents as they stabilize (Cline, Cursor CLI, Devin)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---
