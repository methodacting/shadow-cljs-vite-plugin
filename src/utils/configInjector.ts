import * as fs from "fs/promises";
import { parseEDNString } from "edn-data";

function toEDN(obj: any): string {
  if (obj === null || obj === undefined) return "nil";
  if (typeof obj === "boolean") return obj.toString();
  if (typeof obj === "number") return obj.toString();
  if (typeof obj === "string") {
    if (obj.startsWith(":")) return obj;
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(toEDN).join(" ") + "]";
  }
  if (typeof obj === "object") {
    if (obj.sym) return obj.sym;
    
    const keys = Object.keys(obj);
    return "{" + keys.map(k => {
      // Keys in JS objects are strings. We want keywords to remain keywords
      // and symbols to remain symbols.
      return `${k} ${toEDN(obj[k])}`;
    }).join(" ") + "}";
  }
  return "nil";
}

/**
 * Creates a configuration merge string for shadow-cljs.
 */
export async function createConfigMergeEntry(
  configPath: string,
  buildId: string,
  registryEntry: any,
  registryExport: any
): Promise<string> {
  const content = await fs.readFile(configPath, "utf-8");
  
  const parsed = parseEDNString(content, {
    keywordAs: "string", 
    mapAs: "object",
    setAs: "array",
  }) as any;

  // Navigate to builds -> buildId -> modules -> main (or first module)
  const builds = parsed[":builds"] || parsed["builds"];
  const build = builds[`:${buildId}`] || builds[buildId];
  const modules = build[":modules"] || build["modules"];
  const moduleKeys = Object.keys(modules);
  
  // Force the module key to be a keyword (starting with :)
  const rawKey = moduleKeys[0];
  const mainModuleKey = rawKey.startsWith(":") ? rawKey : ":" + rawKey;
  
  const mainModule = modules[rawKey];
  const existingEntries = mainModule[":entries"] || mainModule["entries"] || [];

  const mergeConfig = {
    ":modules": {
      [mainModuleKey]: {
        ":init-fn": null,
        ":entries": [...existingEntries, registryEntry],
        ":exports": {
            "registry": registryExport // key 'registry' without : -> symbol
        }
      }
    }
  };

  return toEDN(mergeConfig);
}
