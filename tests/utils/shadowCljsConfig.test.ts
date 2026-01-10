import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import { loadBuildConfigs } from "../../src/utils/shadowCljsConfig";

// Mock fs/promises
vi.mock("fs/promises");

describe("utils/shadowCljsConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const MOCK_CONFIG_PATH = "/path/to/shadow-cljs.edn";

  it("should successfully load a valid configuration", async () => {
    const ednContent = `
      {:builds
       {:app
        {:target :browser
         :output-dir "public/js"
         :modules {:main {:init-fn my.app/init}}
         :devtools {:http-root "public"}}}}
    `;

    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    const configs = await loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]);

    expect(configs.size).toBe(1);
    const appConfig = configs.get("app");
    expect(appConfig).toBeDefined();
    expect(appConfig?.id).toBe("app");
    expect(appConfig?.outputDir).toBe("public/js");
    expect(appConfig?.modules).toEqual(["main"]);
    expect(appConfig?.runtime).toBe("browser");
  });

  it("should handle implicit browser runtime", async () => {
    const ednContent = `
      {:builds {:app {:output-dir "out" :modules {:main {}}}}}
    `;
    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    const configs = await loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]);
    expect(configs.get("app")?.runtime).toBe("browser");
  });

  it("should read explicit runtime", async () => {
    const ednContent = `
      {:builds {:worker {:target :node-script :runtime "node" :output-dir "out" :modules {:main {}}}}}
    `;
    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    const configs = await loadBuildConfigs(MOCK_CONFIG_PATH, ["worker"]);
    expect(configs.get("worker")?.runtime).toBe("node");
  });

  it("should throw if :builds is missing", async () => {
    vi.mocked(fs.readFile).mockResolvedValue("{}");

    await expect(loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]))
      .rejects.toThrow(/No :builds found/);
  });

  it("should throw if the requested build ID is missing", async () => {
    const ednContent = `{:builds {:other {:output-dir "x" :modules {:x {}}}}}`;
    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    await expect(loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]))
      .rejects.toThrow(/Build "app" not found/);
  });

  it("should throw if :output-dir is missing", async () => {
    const ednContent = `{:builds {:app {:modules {:main {}}}}}`;
    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    await expect(loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]))
      .rejects.toThrow(/No :output-dir found/);
  });

  it("should throw if :modules is missing", async () => {
    const ednContent = `{:builds {:app {:output-dir "out"}}}`;
    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    await expect(loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]))
      .rejects.toThrow(/No :modules found/);
  });

  it("should handle complex EDN structures (sets, vectors, nested maps)", async () => {
    // shadow-cljs config often contains sets `#{...}` or vectors `[...]`
    const ednContent = `
      {:source-paths ["src" "test"]
       :dependencies [["reagent" "1.0"]]
       :builds
       {:app
        {:target :browser
         :output-dir "public/js"
         :modules {:main {:entries [my.app]}}
         :some-set #{:a :b}}}}
    `;

    vi.mocked(fs.readFile).mockResolvedValue(ednContent);

    const configs = await loadBuildConfigs(MOCK_CONFIG_PATH, ["app"]);
    expect(configs.get("app")).toBeDefined();
  });
});
