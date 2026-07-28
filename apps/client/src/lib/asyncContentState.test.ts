import { describe, expect, it } from "vitest";
import { resolveAsyncContentState } from "./asyncContentState";

describe("resolveAsyncContentState", () => {
  it("returns loading before considering data or error", () => {
    expect(resolveAsyncContentState({ loading: true, error: "Gagal", data: null })).toBe("loading");
  });

  it("returns error when loading is finished and an error exists", () => {
    expect(resolveAsyncContentState({ loading: false, error: "Gagal memuat", data: null })).toBe("error");
  });

  it("returns empty when loading is finished without error and data is missing", () => {
    expect(resolveAsyncContentState({ loading: false, error: null, data: null })).toBe("empty");
  });

  it("returns ready when loading is finished and data exists", () => {
    expect(resolveAsyncContentState({ loading: false, error: null, data: { ok: true } })).toBe("ready");
  });
});
