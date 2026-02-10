import { spawn } from "child_process";
import type { PluginOption, ResolvedConfig, ViteDevServer } from "vite";
import { resolve } from "path";
import { TAG } from "../constants";
import type { PluginContext } from "../types";
import { resolveConfigPath } from "../utils/shadowCljsConfig";
import * as fs from "fs/promises";
import {
  getGlobalState,
  handleShadowProcessOutputs,
  setGlobalShadowProcess,
  stopGlobalShadowProcess,
} from "../utils/shadowCljsProcess";
import { waitForProcessSpawn } from "../utils/waitForProcessSpawn";
import { discoverComponents, generateRegistry } from "../utils/discovery";
import { createConfigMergeEntry } from "../utils/configInjector";

export function createServePlugin(
  initContext: (config: ResolvedConfig) => Promise<void>,
  getContext: () => PluginContext,
  buildIds: string[]
): PluginOption {
  return {
    name: "shadow-cljs:serve",
    configResolved: initContext,
    apply: "serve",

    async configureServer(server) {
      const { projectRoot, configPath, sourcePaths } = getContext();

      autoRestartViteWhenShadowCljsFileChanged(server, configPath);

      const shadowProcess = getGlobalState()?.process;
      if (shadowProcess) {
        console.log(`${TAG} Using existing shadow-cljs process...`);
        // HMR is handled by file watcher in virtualModule.ts
        return;
      }

      console.log(`${TAG} Discovering components...`);
      const components = await discoverComponents(projectRoot, sourcePaths);

      const buildId = buildIds[0];
      const buildConfig = getContext().buildConfigs?.get(buildId);
      const initFn = buildConfig?.initFn;

      await generateRegistry(projectRoot, sourcePaths, components, initFn);

      const registryEntry = { sym: "astro-cljs.entry" };
      const registryExport = { sym: "astro-cljs.entry/registry" };

      const configMerge = await createConfigMergeEntry(
        configPath,
        buildId,
        registryEntry,
        registryExport
      );

      console.log(`${TAG} Starting shadow-cljs watch with auto-registry...`);
      const newShadowProcess = spawn(
        "shadow-cljs",
        ["watch", ...buildIds, "--config-merge", configMerge],
        {
          stdio: ["ignore", "pipe", "pipe"],
          detached: true,
          cwd: projectRoot,
        }
      );


      try {
        await waitForProcessSpawn(newShadowProcess);
      } catch (error) {
        console.error(`${TAG} Failed to start shadow-cljs`, error);
        throw error;
      }

      setGlobalShadowProcess(newShadowProcess);
      const unlistenShadowProcessOutputs =
        handleShadowProcessOutputs(newShadowProcess);

      const cleanup = () => {
        stopGlobalShadowProcess();
        unlistenShadowProcessOutputs();
      };

      server.httpServer?.once("close", cleanup);
      process.once("exit", cleanup);
    },
  };
}

function autoRestartViteWhenShadowCljsFileChanged(
  server: ViteDevServer,
  configPathOption: string
) {
  const configPath = resolveConfigPath(
    server.config.root ?? process.cwd(),
    configPathOption
  );

  // Watch shadow-cljs config file for changes - restart Vite on config change
  let restartPromise: Promise<void> | null = null;
  const handleConfigChange = (file: string) => {
    if (file !== configPath) return;
    if (restartPromise) return;
    restartPromise = server
      .restart(true)
      .catch((error) => {
        console.warn(`${TAG} Failed to restart Vite server:`, error);
      })
      .finally(() => {
        restartPromise = null;
      });
  };

  server.watcher.add(configPath);
  server.watcher.on("change", handleConfigChange);

  server.httpServer?.once("close", () => {
    server.watcher.off("change", handleConfigChange);
  });
}
