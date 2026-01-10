import { exec } from "child_process";
import * as fs from "fs/promises";
import { join, resolve } from "path";
import { promisify } from "util";
import { createBuilder } from "vite";
import { beforeAll, describe, expect, it } from "vitest";
import { existsAsync } from "../../src/utils/existsAsync";

const execAsync = promisify(exec);

// --- Constants ---
const FIXTURE_ROOT = resolve(__dirname, "./fixtures/simple-project");
const SHADOW_OUT_DIR = join(FIXTURE_ROOT, ".shadow-cljs-out");
const BUILD_OUT_DIR = join(FIXTURE_ROOT, "dist");
const BUILD_TIMEOUT = 1000 * 60 * 5;

describe("E2E: Real Build with Cloudflare", () => {
  let allDistFiles: string[] = [];

  beforeAll(async () => {
    await setupBuildEnvironment();
    await runViteBuild();
    allDistFiles = await fs.readdir(BUILD_OUT_DIR, { recursive: true });
    console.log("Dist files generated:", allDistFiles);
  }, BUILD_TIMEOUT);

  it("should generate shadow-cljs intermediate artifacts", async () => {
    const artifacts = [
      join(SHADOW_OUT_DIR, "browser/main.js"),
      join(SHADOW_OUT_DIR, "worker/main.js"),
    ];

    for (const path of artifacts) {
      expect(await existsAsync(path)).toBe(true);
    }
  });

  it("should successfully execute the Worker bundle", async () => {
    const workerFile = allDistFiles.find(
      (f) =>
        (f.includes("ssr/") || f.endsWith("_worker.js")) && f.endsWith(".js")
    );
    if (!workerFile) throw new Error("Worker bundle not found in dist");

    const workerRelPath = `./dist/${workerFile}`;
    console.log(`Testing Worker Bundle: ${workerRelPath}`);

    const code = generateWorkerVerifierCode(workerRelPath);
    const { stdout } = await runScriptInFixture("verify-worker.mjs", code);

    expect(stdout).toMatch(/Worker Output: Hello .* from node/);
  });

  it("should successfully execute the Browser bundle", async () => {
    const indexHtmlFile = allDistFiles.find((f) => f.endsWith("index.html"));
    if (!indexHtmlFile) throw new Error("index.html not found in dist");

    const browserJsPath = await extractScriptPathFromHtml(indexHtmlFile);
    // Construct path relative to FIXTURE_ROOT for the dynamic import
    // Note: browserJsPath is already relative to the assets folder structure
    const browserRelPath = `./${join("dist", indexHtmlFile, "..", "assets", browserJsPath)}`;
    
    console.log(`Testing Browser Bundle: ${browserRelPath}`);

    const code = generateBrowserVerifierCode(browserRelPath);
    const { stdout } = await runScriptInFixture("verify-browser.mjs", code);

    expect(stdout).toContain("Browser Output: Hello world from browser");
  });
});

// --- Helper Functions ---

async function setupBuildEnvironment() {
  const binPath = resolve(__dirname, "../../node_modules/.bin");
  const pathSep = process.platform === "win32" ? ";" : ":";
  process.env.PATH = `${binPath}${pathSep}${process.env.PATH}`;

  await fs.rm(BUILD_OUT_DIR, { recursive: true, force: true });
  await fs.rm(SHADOW_OUT_DIR, { recursive: true, force: true });
}

async function runViteBuild() {
  console.log("Starting Vite Build...");
  const builder = await createBuilder({
    root: FIXTURE_ROOT,
    configFile: join(FIXTURE_ROOT, "vite.config.ts"),
    logLevel: "info" as const,
  });
  await builder.buildApp();
}

async function runScriptInFixture(fileName: string, content: string) {
  const filePath = join(FIXTURE_ROOT, fileName);
  await fs.writeFile(filePath, content);
  try {
    return await execAsync(`node ${fileName}`, { cwd: FIXTURE_ROOT });
  } finally {
    await fs.rm(filePath, { force: true });
  }
}

async function extractScriptPathFromHtml(htmlFileName: string): Promise<string> {
  const indexHtmlPath = join(BUILD_OUT_DIR, htmlFileName);
  const htmlContent = await fs.readFile(indexHtmlPath, "utf-8");
  const match = htmlContent.match(/src="\/assets\/(.*?\.js)"/);
  
  if (!match) {
    throw new Error(`Could not find browser JS link in ${htmlFileName}`);
  }
  return match[1];
}

// --- Script Generators ---

function generateWorkerVerifierCode(importPath: string) {
  return `
    import * as mod from "${importPath}";
    async function run() {
      try {
        const handler = mod.default || mod;
        if (typeof handler.fetch !== 'function') {
            throw new Error("No fetch handler found in worker bundle");
        }
        const response = await handler.fetch({}, {}, {});
        const text = await response.text();
        console.log("Worker Output:", text);
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    }
    run();
  `;
}

function generateBrowserVerifierCode(importPath: string) {
  return `
    import { JSDOM } from "jsdom";
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost/",
      runScripts: "dangerously",
      resources: "usable"
    });
    
    // Polyfill global environment
    global.window = dom.window;
    global.document = dom.window.document;
    global.MutationObserver = dom.window.MutationObserver;
    global.Node = dom.window.Node;
    global.Element = dom.window.Element;
    global.Event = dom.window.Event;
    global.CustomEvent = dom.window.CustomEvent;
    
    const output = [];
    document.write = (text) => { output.push(text); };

    import("${importPath}").then(() => {
       console.log("Browser Output:", output.join(""));
    }).catch(err => {
       console.error(err);
       process.exit(1);
    });
  `;
}