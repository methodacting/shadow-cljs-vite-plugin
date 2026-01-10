# shadow-cljs-vite-plugin

A robust Vite plugin for seamless integration with [shadow-cljs](https://github.com/thheller/shadow-cljs).

This plugin bridges the gap between the shadow-cljs build tool and the Vite dev server, allowing you to use Vite's lightning-fast HMR and rich ecosystem while developing ClojureScript applications.

## Features

- **Seamless Integration**: Automatically starts and manages the `shadow-cljs` process.
- **Hot Module Replacement (HMR)**: Correctly delegates HMR to shadow-cljs (for the browser runtime) for a smooth REPL-driven workflow.
- **Dependency Injection**: specialized logic to handle Google Closure Library namespaces in ESM environments (fixes issues in strict runtimes like Cloudflare Workers).
- **Zero Configuration**: Works out of the box for most standard shadow-cljs setups.

## Installation

```bash
npm install -D shadow-cljs-vite-plugin
# or
pnpm add -D shadow-cljs-vite-plugin
```

## Usage

Add the plugin to your `vite.config.ts` (or `vite.config.js`).

```typescript
import { defineConfig } from "vite";
import { shadowCljs } from "shadow-cljs-vite-plugin";

export default defineConfig({
  plugins: [
    shadowCljs({
      buildIds: ["app"], // The build ID(s) from your shadow-cljs.edn
      configPath: "./shadow-cljs.edn", // Optional: Path to config
    }),
  ],
});
```

Then, import the virtual module in your entry HTML or JavaScript file (e.g., `main.tsx` or `index.html`):

```html
<!-- index.html -->
<script type="module">
  import "virtual:shadow-cljs/app"; // Matches the build ID provided in config
</script>
```

## Shadow-CLJS Configuration Requirements

To ensure correct integration with Vite's ES module system and avoid runtime errors, your `shadow-cljs.edn` build configuration **MUST** use the following settings:

```edn
{:target :esm
 :js-options {:js-provider :import}}
```

- `:target :esm`: Tells shadow-cljs to output standard ES modules.
- `:js-options {:js-provider :import}`: Ensures that dependencies are imported using native ESM syntax.

## Configuration

### `buildIds` (Required)

- **Type**: `string[]`
- **Description**: The list of build IDs defined in your `shadow-cljs.edn` that you want Vite to handle.

### `configPath` (Optional)

- **Type**: `string`
- **Default**: `shadow-cljs.edn` in the project root.
- **Description**: The path to your shadow-cljs configuration file.

## How it Works

1.  **Dev Server**: When you run `vite`, this plugin spawns `shadow-cljs watch <build-id>`. It watches for output changes and triggers HMR updates in the browser.
2.  **Production Build**: When you run `vite build`, it spawns `shadow-cljs release <build-id>` to generate the optimized assets, which Vite then bundles.

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on the code structure and how to submit changes.

## License

MIT
