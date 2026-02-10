import type { PluginOption, ResolvedConfig } from "vite";
import { createBuildPlugin } from "./plugins/build";
import { createCljsEnvPatchPlugin } from "./plugins/cljsEnvPatch";
import { createServePlugin } from "./plugins/serve";
import { createVirtualModulePlugin } from "./plugins/virtualModule";
import type { PluginContext, ShadowCljsOptions } from "./types";
import { loadBuildConfigs, resolveConfigPath } from "./utils/shadowCljsConfig";

export type { ShadowCljsOptions } from "./types";

export function shadowCljs(options: ShadowCljsOptions): PluginOption[] {
  console.log(`[shadow-cljs] Plugin initialized with options:`, options);
  const { buildIds } = options;
  const ctx: Partial<PluginContext> = {};

  async function initContext(config: ResolvedConfig): Promise<void> {
    ctx.projectRoot = config.root;
    ctx.configPath = resolveConfigPath(ctx.projectRoot, options.configPath);
    const { configs, sourcePaths } = await loadBuildConfigs(
      ctx.configPath,
      buildIds
    );
    ctx.buildConfigs = configs;
    ctx.sourcePaths = sourcePaths;
  }

  function getContext(): PluginContext {
    return ctx as PluginContext;
  }

  const buildPlugin = createBuildPlugin(initContext, getContext, buildIds);
  const servePlugin = createServePlugin(initContext, getContext, buildIds);
  const virtualModulePlugin = createVirtualModulePlugin(
    initContext,
    getContext,
    options
  );
  const cljsEnvPatchPlugin = createCljsEnvPatchPlugin(
    initContext,
    getContext,
    options
  );

  return [virtualModulePlugin, cljsEnvPatchPlugin, buildPlugin, servePlugin];
}
