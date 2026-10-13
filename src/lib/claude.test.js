import { describe, it, expect } from "vitest";
import { resolveModel, MODELS, DEFAULT_MODEL } from "./claude.js";

describe("resolveModel", () => {
  it("keeps a current pick", () => {
    for (const id of Object.keys(MODELS)) expect(resolveModel(id)).toBe(id);
  });

  it("moves a retired pick saved on the phone to its successor", () => {
    expect(resolveModel("claude-opus-4-8")).toBe("claude-opus-5-5");
    expect(resolveModel("claude-haiku-4-5")).toBe("claude-haiku-5-5");
  });

  it("falls back to the default for nothing saved or an unknown id", () => {
    expect(resolveModel("")).toBe(DEFAULT_MODEL);
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL);
    expect(resolveModel("claude-something-else")).toBe(DEFAULT_MODEL);
  });

  it("only offers models the default is one of", () => {
    expect(MODELS[DEFAULT_MODEL]).toBeTruthy();
  });
});
