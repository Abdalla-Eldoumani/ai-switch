# Testing Guide

Our Vitest suite exercises the configuration loader, tool metadata helpers, installer selection, and shell command formatting. This document explains how to run, extend, and reason about the tests so additions stay consistent.

## Commands
- `npm test` — runs the Vitest suite once.
- `npm run test -- --watch` — re-runs affected tests on file changes (append additional Vitest flags as needed).
- `npm run typecheck` — TypeScript compilation in `--noEmit` mode; run alongside tests to catch typing regressions.

## Writing new tests
- Prefer unit tests in `test/` that import helpers directly from `src/core.ts`. These execute quickly and avoid mock-heavy CLI wiring.
- Use temporary directories (`fs.mkdtempSync`) when testing `loadConfig` to keep fixtures isolated. Always clean them up in an `afterEach` hook.
- When validating warnings, inject a `{ warn: vi.fn() }` logger instead of relying on console output.
- Keep platform-sensitive cases deterministic by passing an explicit `platform` value into `getInstallerChoices`.
- For CLI behaviour that requires prompts or process exits, refactor the entry point into injectable helpers before adding tests so we can stub dependencies cleanly.

## Coverage checklist
- Configuration: valid JSON, malformed JSON, unknown tools, and invalid flag arrays.
- Tool metadata: YOLO flag selection, installer filtering, tool key normalization, `hasTool`, and shell command formatting.
- Passthrough handling: multiple `--` delimiters, empty args, and the absence of passthrough.

## Tips
- Keep assertions focused on behaviour, not implementation details. For example, check the exact installer choices rather than private helper results.
- Add regression tests alongside bug fixes so the suite prevents future slips.
- If you introduce new modules, create a dedicated spec file (e.g. `test/<module>.test.ts`) to keep suites focused and readable.

## Future improvements
- Snapshot tests for CLI command output once the entry point is refactored for dependency injection.
- Code coverage reporting via `vitest --coverage` to spot untested paths.
- Integration tests that exercise the compiled `dist/src/index.js` within a sandboxed temporary workspace.
