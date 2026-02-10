import type { ChildProcess } from "child_process";

export interface ShadowCljsOptions {
  configPath?: string;
  buildIds: string[];
  autoGenerateRegistry?: boolean;
}

export interface BuildConfig {
  id: string;
  outputDir: string;
  modules: string[];
  runtime?: string;
  initFn?: string;
}
export type BuildConfigMap = Map</* buildId */ string, BuildConfig>;

export interface PluginContext {
  projectRoot: string;
  configPath: string;
  buildConfigs: BuildConfigMap;
  sourcePaths: string[];
}

export interface ShadowGlobalState {
  process: ChildProcess | undefined;
  buildCompleteIds: Set<string>;
  notifyBuildComplete(buildId: string): void;
  onBuildComplete(listener: (buildId: string) => void): () => void;
}
