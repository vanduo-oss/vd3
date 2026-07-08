import { describe, expect, it } from "vitest";
import pkg from "../package.json";
import { VD3_VERSION } from "../src/index";

describe("@vanduo-oss/vd3 scaffold", () => {
  it("exports VD3_VERSION matching the package.json version", () => {
    expect(VD3_VERSION).toBe(pkg.version);
  });
});
