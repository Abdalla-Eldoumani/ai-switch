# Development Guide

This guide captures the architecture and key responsibilities of each module so contributors can navigate the project quickly.

## High-level flow
1. The CLI entry point (`src/index.ts`) wires up Commander commands (`use`, `yolo`, `doctor`) and delegates to helper functions in `src/core.ts`.
2. Before launching a tool we:
   - Load project defaults from `.ai-switch.json` (if present).
   - Resolve the desired tool either from CLI args, project defaults, or an interactive Inquirer list.
   - Offer to install the tool if `which` cannot find it, using the curated installer commands from `core`.
3. Once ready, we call `execa` with argv arrays to launch the downstream CLI. Shell mode is only used on Windows to support `.cmd` shims.
4. YOLO mode adds the first documented skip-approvals flag from the tool metadata and prints a bold warning so users remember it bypasses safety rails.

## Source layout
- `src/index.ts` — CLI surface area, prompt handling, install orchestration, and launch execution.
- `src/core.ts` — tool metadata, configuration loading/validation, installer selection, and shell-safe formatting.
- `test/` — Vitest suites covering core helpers, configuration loader edge cases, and argument serialization.
- `dist/` — generated JavaScript emitted by `npm run build`; keep this in sync when publishing.

## Configuration handling
- `.ai-switch.json` is optional. We normalize tool keys, drop non-string default flags, and warn without throwing on malformed JSON so the CLI stays resilient.
- Treat the config file as trusted input owned by repository maintainers—malicious flags could otherwise piggyback onto downstream CLI invocations.

## Installer safety
- Installer commands are hard-coded strings stored in `src/core.ts`. Do not accept arbitrary input here; if we add new installers, ensure the command is reviewed and safe for shell execution.
- `getInstallerChoices` filters installers by the current platform (with WSL support) and always appends a "Cancel" option so users can opt out.

## Publishing checklist
1. `npm install`
2. `npm run typecheck && npm test`
3. `npm audit`
4. `npm run build`
5. `npm publish --access public`

Increment the version with `npm version <patch|minor|major>` before publishing. We currently ship `0.1.2` as an npm-verified package maintained by **@zpicy**.

## Future enhancements
- Automate linting/static analysis for faster feedback.
- Expand `docs/` with per-tool behaviour notes as new integrations land.
- Consider snapshot tests for CLI output when we refactor the entry point for easier injection.
