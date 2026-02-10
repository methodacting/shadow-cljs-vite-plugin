import type { PluginOption, ResolvedConfig } from "vite";
import { resolve } from "path";
import * as fs from "fs/promises";
import { TAG } from "../constants";
import { spawnAsync } from "../utils/spawnAsync";
import type { PluginContext } from "../types";
import { discoverComponents, generateRegistry } from "../utils/discovery";
import { createConfigMergeEntry } from "../utils/configInjector";

export function createBuildPlugin(
  initContext: (config: ResolvedConfig) => Promise<void>,
  getContext: () => PluginContext,
  buildIds: string[]
): PluginOption {
  return {
    name: "shadow-cljs:build",
    configResolved: initContext,
    apply: "build",

    async buildStart() {
      const { projectRoot, sourcePaths, configPath } = getContext();

      console.log(`${TAG} Discovering components for release...`);
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

      console.log(`${TAG} Running shadow-cljs release with auto-registry...`);
      await spawnAsync(
        "shadow-cljs",
        ["release", ...buildIds, "--config-merge", configMerge],
        {
          stdio: "inherit",
          cwd: projectRoot,
        }
      );
    },
  };
}
