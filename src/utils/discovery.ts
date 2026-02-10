import * as fs from "fs/promises";
import { join, resolve } from "path";
import { glob } from "glob";

export interface DiscoveredComponent {
  namespace: string;
  varName: string;
  componentName: string;
  filePath?: string;
}

/**
 * Convert kebab-case to PascalCase
 */
function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export async function discoverComponents(
  projectRoot: string,
  sourcePaths: string[]
): Promise<DiscoveredComponent[]> {
  const components: DiscoveredComponent[] = [];

  for (const sourcePath of sourcePaths) {
    const fullSourcePath = resolve(projectRoot, sourcePath);
    const files = await glob("**/*.cljs", { cwd: fullSourcePath });

    for (const file of files) {
      const content = await fs.readFile(join(fullSourcePath, file), "utf-8");
      const nsMatch = content.match(/\(ns\s+([a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)/);

      if (nsMatch) {
        const namespace = nsMatch[1];

        // Skip internal astro-cljs.* namespaces
        if (namespace.startsWith("astro-cljs.")) {
          continue;
        }

        // Find ALL defui declarations (use matchAll to find multiple)
        const defuiMatches = content.matchAll(/\(defui\s+([\w-]+)/g);

        for (const match of defuiMatches) {
          const varName = match[1];
          const componentName = kebabToPascalCase(varName);

          components.push({
            namespace,
            varName,
            componentName,
            filePath: file,
          });
        }
      }
    }
  }

  return components;
}

export async function generateRegistry(
  projectRoot: string,
  sourcePaths: string[],
  components: DiscoveredComponent[],
  initFn?: string
): Promise<void> {
  // Use the first source path to store the registry
  const targetSourcePath = resolve(projectRoot, sourcePaths[0]);
  const generatedDir = join(targetSourcePath, "astro_cljs");
  await fs.mkdir(generatedDir, { recursive: true });

  const requires = components
    .map((c) => `    [${c.namespace}]`)
    .join("\n");
  
  const registryMap = components
    .map((c) => `       "${c.namespace}" ${c.namespace}/${c.varName}`)
    .join("\n");

  const registryContent = `(ns astro-cljs.registry
  (:require
${requires}))

(def components
  #js {
${registryMap}})
`;

  await fs.writeFile(join(generatedDir, "registry.cljs"), registryContent, "utf-8");

  // Generate entry.cljs wrapper
  const entryNs = "astro-cljs.entry";
  const entryContent = `(ns ${entryNs}
  (:require ${initFn ? `[${initFn.split("/")[0]}]` : ""}
            [astro-cljs.registry]))

(def registry astro-cljs.registry/components)

(defn init []
  ${initFn ? `(${initFn})` : `(println "[astro-cljs] initialized")`})

;; Auto-initialize
(init)
`;

  await fs.writeFile(join(generatedDir, "entry.cljs"), entryContent, "utf-8");
}
