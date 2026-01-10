import { describe, it, expect } from "vitest";
import { injectGoogImports } from "../../src/utils/googDependencyHandler";

describe("utils/googDependencyHandler", () => {
  describe("injectGoogImports", () => {
    const mockMap = new Map([
      ["goog.string", "goog/string/string.js"],
      ["goog.array", "goog/array/array.js"],
      ["my.app", "my/app.js"],
    ]);

    it("should inject import for cljs_env.js if missing", () => {
      const code = 'console.log("hello");';
      const result = injectGoogImports(code, "/abs/path/file.js", mockMap);
      expect(result).toContain('import "./cljs_env.js";');
    });

    it("should NOT inject import for cljs_env.js if already present", () => {
      const code = 'import "./cljs_env.js";\nconsole.log("hello");';
      const result = injectGoogImports(code, "/abs/path/file.js", mockMap);
      // Should not appear twice
      const matches = result.match(/import ".\/cljs_env.js";/g);
      expect(matches?.length).toBe(1);
    });

    it("should inject imports for known goog.require calls", () => {
      const code = "\n        goog.provide(\"my.module\");\n        goog.require(\"goog.string\");\n        goog.require(\"goog.array\");\n      ";
      const result = injectGoogImports(code, "/abs/path/my/module.js", mockMap);
      
      expect(result).toContain('import "./goog/string/string.js";');
      expect(result).toContain('import "./goog/array/array.js";');
    });

    it("should ignore goog.require calls for unknown namespaces", () => {
      const code = 'goog.require("unknown.namespace");';
      const result = injectGoogImports(code, "/abs/path/file.js", mockMap);
      
      // Should NOT generate an import line like: import "./...
      // Since we don't know the file path, we can just check that no new imports were added besides cljs_env
      expect(result).not.toMatch(/import "\.\/.*unknown.*"/);
      expect(result).toContain('import "./cljs_env.js";'); // Still adds env
    });

    it("should not inject self-import", () => {
      const code = 'goog.require("my.app");';
      // The file being transformed IS my/app.js (resolved to absolute path)
      const id = `/root/output/cljs-runtime/${mockMap.get("my.app")}`;
      
      const result = injectGoogImports(code, id, mockMap);
      expect(result).not.toContain('import "./my/app.js";');
    });
  });
});
