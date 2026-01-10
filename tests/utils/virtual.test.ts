import { describe, it, expect } from "vitest";
import {
  isShadowCljsVirtualModule,
  parseBuildIdFromVirtualId,
  toResolvedVirtualId,
} from "../../src/utils/virtual";

describe("utils/virtual", () => {
  const BUILD_ID = "app";
  const VIRTUAL_ID = "virtual:shadow-cljs/app";
  const RESOLVED_ID = "\0virtual:shadow-cljs/app";

  describe("isShadowCljsVirtualModule", () => {
    it("should return true for valid virtual module IDs", () => {
      expect(isShadowCljsVirtualModule(VIRTUAL_ID)).toBe(true);
    });

    it("should return false for other IDs", () => {
      expect(isShadowCljsVirtualModule("some-other-module")).toBe(false);
      expect(isShadowCljsVirtualModule("./local-file.js")).toBe(false);
    });
  });

  describe("toResolvedVirtualId", () => {
    it("should prepend the null byte and prefix", () => {
      expect(toResolvedVirtualId(BUILD_ID)).toBe(RESOLVED_ID);
    });
  });

  describe("parseBuildIdFromVirtualId", () => {
    it("should extract build ID from resolved virtual ID", () => {
      expect(parseBuildIdFromVirtualId(RESOLVED_ID)).toBe(BUILD_ID);
    });

    it("should return null for non-matching IDs", () => {
      expect(parseBuildIdFromVirtualId(VIRTUAL_ID)).toBe(null); // Missing \0
      expect(parseBuildIdFromVirtualId("some-other-id")).toBe(null);
    });
  });
});
