import { describe, expect, it } from "vitest";
import {
  TOOLS,
  getInstallerChoices,
  passthroughArgs,
  selectYoloFlag,
} from "../src/core.js";

describe("passthroughArgs", () => {
  it("returns everything after --", () => {
    const argv = ["node", "ai", "use", "codex", "--", "--version", "--help"];
    expect(passthroughArgs(argv)).toEqual(["--version", "--help"]);
  });

  it("returns an empty array when -- is missing", () => {
    const argv = ["node", "ai", "use", "codex"];
    expect(passthroughArgs(argv)).toEqual([]);
  });
});

describe("selectYoloFlag", () => {
  it("prefers the first known YOLO flag for each tool", () => {
    expect(selectYoloFlag(TOOLS.codex)).toBe("--yolo");
    expect(selectYoloFlag(TOOLS.claude)).toBe("--dangerously-skip-permissions");
    expect(selectYoloFlag(TOOLS.gemini)).toBe("--yolomode");
  });
});

describe("getInstallerChoices", () => {
  it("always appends a cancel fallback", () => {
    const choices = getInstallerChoices(TOOLS.codex, "darwin");
    const last = choices[choices.length - 1];
    expect(last).toEqual({ name: "Cancel", value: "" });
  });
});
