# Contributing to shadow-cljs-vite-plugin

Thank you for your interest in contributing! We want to make this plugin the best bridge between Vite and shadow-cljs.

## Development Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <folder-path>
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Build the project:**

    ```bash
    pnpm run build
    ```

4.  **Run in watch mode:**
    ```bash
    pnpm run dev
    ```

## Code Structure

To help you navigate the codebase, here is an overview of the internal architecture. We aim to keep concerns separated and the logic predictable.

### High-Level Architecture

This plugin is actually a collection of smaller, focused Vite plugins that work together. The entry point is `src/index.ts`, which composes these sub-plugins.

### Directory Layout

```text
src/
├── index.ts               # Main entry point. Initializes context and composes sub-plugins.
├── constants.ts           # Shared constants (e.g., logging tags).
├── types.ts               # Shared TypeScript interfaces and types.
├── plugins/               # Core logic split into specific plugin phases.
│   ├── build.ts           # Handles the 'build' command (runs `shadow-cljs release`).
│   ├── serve.ts           # Handles the 'serve' command (runs `shadow-cljs watch`).
│   ├── virtualModule.ts   # Manages the virtual module `virtual:shadow-cljs/...` for HMR entry.
│   └── importsInjector.ts # Fixes dependency issues by injecting explicit ESM imports.
└── utils/                 # specific utility functions.
    ├── shadowCljsConfig.ts    # Parses `shadow-cljs.edn`.
    ├── shadowCljsProcess.ts   # Manages the global shadow-cljs child process.
    ├── googDependencyHandler.ts # Scans and maps Google Closure dependencies.
    └── ...
```

### Key Concepts

1.  **Plugin Context**: We use a `PluginContext` object to share state (like parsed config, project root) between the sub-plugins without polluting the global scope.
2.  **Virtual Module**: The plugin injects a virtual entry point into Vite. This allows us to control exactly when the ClojureScript output is loaded and attach HMR listeners.
3.  **Imports Injection**: A critical part of this plugin is `importsInjector.ts`. It ensures that `goog.require` calls in the generated JS interact correctly with native ESM imports, preventing race conditions in environments like Cloudflare Workers.

## Submitting a Pull Request

1.  Fork the repo and create your branch from `main`.
2.  Make sure your code lints and builds (`npm run build`).
3.  Add tests for new features (if applicable).
4.  Ensure your commit messages follow the [Angular Commit Convention](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-guidelines).
    - `feat(scope): message`
    - `fix(scope): message`
    - `docs(scope): message`
5.  Open a Pull Request!
