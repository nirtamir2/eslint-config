/**
 * How an ESLint config producer is represented by the Oxlint export.
 */
export type OxlintCapabilitySupport =
  "native" | "js-plugin" | "mixed" | "unsupported";

/**
 * The producer's default activation in the ESLint factory.
 */
export type EslintDefaultStatus =
  "always" | "enabled" | "disabled" | "detected";

export type OxlintCapabilityDetection =
  | { readonly kind: "none" }
  | {
      readonly kind: "package";
      readonly match: "all" | "any";
      readonly packages: ReadonlyArray<string>;
    }
  | {
      readonly kind: "file";
      readonly files: ReadonlyArray<string>;
    };

export interface OxlintCapability {
  /**
   * How Oxlint executes the producer's rules.
   */
  readonly support: OxlintCapabilitySupport;
  /**
   * Whether ESLint always, normally, optionally, or automatically enables it.
   */
  readonly eslintDefault: EslintDefaultStatus;
  /**
   * The package or file probes used when `eslintDefault` is `detected`.
   */
  readonly detection: OxlintCapabilityDetection;
  /**
   * Packages that the generated Oxlint config must load at lint time.
   */
  readonly runtimePackages: ReadonlyArray<string>;
  /**
   * Known semantic differences from the corresponding ESLint producer.
   */
  readonly limitations: ReadonlyArray<string>;
}

const none = { kind: "none" } as const;

/**
 * Capability boundary for every config producer composed by `src/factory.ts`.
 *
 * `mixed` means a producer combines native Oxlint rules, JavaScript plugins,
 * or script-only coverage with a portion Oxlint cannot execute. Unsupported
 * parser/processor integrations deliberately have no runtime package entry.
 */
export const oxlintCapabilities = {
  gitignore: {
    support: "native",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: ["eslint-config-flat-gitignore"],
    limitations: [
      "The factory synchronously converts project gitignore files by default; the static recommended preset does not inspect the consumer filesystem.",
      "Setting gitignore to false disables that conversion, but Oxlint's own directory discovery still honors .gitignore and currently has no switch to disable that filtering; an explicitly named file may still be selected.",
    ],
  },
  ignores: {
    support: "native",
    eslintDefault: "always",
    detection: none,
    runtimePackages: [],
    limitations: [
      "ESLint extglobs must be normalized to patterns understood by Oxlint.",
    ],
  },
  javascript: {
    support: "mixed",
    eslintDefault: "always",
    detection: none,
    runtimePackages: [
      "eslint-plugin-antfu",
      "eslint-plugin-unused-imports",
      "eslint-plugin-github",
      "eslint-plugin-array-func",
      "eslint-plugin-optimize-regex",
      "eslint-plugin-workspaces",
      "eslint-plugin-no-use-extend-native",
      "eslint-plugin-sonarjs",
      "eslint-plugin-clsx",
    ],
    limitations: [
      "Core rules are native; non-core rules use Oxlint's alpha JavaScript-plugin runtime and may rely on unsupported ESLint APIs.",
      "Editor-mode severities are preserved, but Oxlint cannot reproduce ESLint's per-rule autofix suppression.",
    ],
  },
  comments: {
    support: "js-plugin",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["@eslint-community/eslint-plugin-eslint-comments"],
    limitations: [
      "Comment rules run through the alpha JavaScript-plugin runtime rather than a native Oxlint implementation.",
    ],
  },
  node: {
    support: "mixed",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["eslint-plugin-n"],
    limitations: [
      "Implemented Node rules run natively; missing native rules use an aliased eslint-plugin-n fallback through the alpha JavaScript-plugin runtime.",
    ],
  },
  imports: {
    support: "mixed",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["eslint-plugin-antfu"],
    limitations: [
      "Import-x rules use Oxlint's native import plugin; unsupported import rules are omitted and Antfu-only rules use a JavaScript plugin.",
    ],
  },
  unicorn: {
    support: "mixed",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["eslint-plugin-unicorn"],
    limitations: [
      "Implemented Unicorn rules run natively; missing native rules use an aliased eslint-plugin-unicorn fallback through the alpha JavaScript-plugin runtime.",
      "The Oxlint factory exposes boolean and allRecommended selection; the current ESLint factory composes its Unicorn producer unconditionally.",
    ],
  },
  command: {
    support: "js-plugin",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["eslint-plugin-command"],
    limitations: [
      "Inline command comments depend on the alpha JavaScript-plugin runtime.",
    ],
  },
  perfectionist: {
    support: "js-plugin",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["eslint-plugin-perfectionist"],
    limitations: [
      "Import-order rules may be omitted by migration because Oxlint delegates import sorting to Oxfmt.",
    ],
  },
  jsx: {
    support: "mixed",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: ["@stylistic/eslint-plugin"],
    limitations: [
      "Accessibility rules are limited to Oxlint's native JSX-a11y coverage; Stylistic rules use a JavaScript plugin.",
    ],
  },
  typescript: {
    support: "mixed",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "any",
      packages: ["typescript"],
    },
    runtimePackages: [
      "oxlint-tsgolint",
      "@typescript-eslint/eslint-plugin",
      "@eslint-community/eslint-plugin-eslint-comments",
      "eslint-plugin-erasable-syntax-only",
      "eslint-plugin-unused-imports",
    ],
    limitations: [
      "Native type-aware rules require oxlint-tsgolint; missing native rules use an aliased TypeScript ESLint plugin but cannot use parser services, so eslint-plugin-expect-type and eslint-plugin-sort-destructure-keys-typescript are omitted.",
    ],
  },
  e18e: {
    support: "js-plugin",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: ["@e18e/eslint-plugin"],
    limitations: [
      "Rules use the alpha JavaScript-plugin runtime and keep the ESLint factory's safety-oriented rule disables.",
    ],
  },
  stylistic: {
    support: "js-plugin",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["@stylistic/eslint-plugin", "eslint-plugin-antfu"],
    limitations: [
      "Formatting-oriented rules may be omitted in favor of Oxfmt, so this is not formatter parity.",
      "Numeric and tab indentation are supported; ESLint's advanced indentation option tuples are not exposed by the Oxlint factory.",
    ],
  },
  regexp: {
    support: "js-plugin",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: ["eslint-plugin-regexp"],
    limitations: [
      "Rules use the alpha JavaScript-plugin runtime rather than native regexp-rule coverage.",
    ],
  },
  test: {
    support: "mixed",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [
      "eslint-plugin-antfu",
      "eslint-plugin-n",
      "eslint-plugin-no-only-tests",
    ],
    limitations: [
      "Vitest rules run natively and the missing no-only-tests rule uses an aliased JavaScript-plugin fallback.",
      "Editor mode preserves the ESLint severity change but cannot suppress autofixes for individual rules.",
    ],
  },
  vue: {
    support: "mixed",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "any",
      packages: ["vue", "nuxt", "vitepress", "@slidev/cli"],
    },
    runtimePackages: [
      "eslint-plugin-antfu",
      "eslint-plugin-n",
      "eslint-plugin-vue",
    ],
    limitations: [
      "Oxlint lints Vue script blocks with native rules and aliased script-rule fallbacks, but does not run Vue template-parser, processor, template, custom-block, or accessibility rules.",
    ],
  },
  react: {
    support: "mixed",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: [
      "@eslint-react/eslint-plugin",
      "@stylistic/eslint-plugin",
      "eslint-plugin-react-you-might-not-need-an-effect",
    ],
    limitations: [
      "React and JSX-a11y coverage combines native rules with JavaScript plugins; type-aware JavaScript-plugin rules, eslint-plugin-classname-components, and eslint-plugin-ssr-friendly are unsupported.",
    ],
  },
  nextjs: {
    support: "mixed",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "any",
      packages: ["next"],
    },
    runtimePackages: ["@next/eslint-plugin-next"],
    limitations: [
      "Implemented Next.js rules run natively; missing rules use an aliased plugin fallback, while React Refresh remains limited to Oxlint's native coverage.",
    ],
  },
  zod: {
    support: "js-plugin",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "all",
      packages: ["zod", "next"],
    },
    runtimePackages: ["eslint-plugin-import-zod"],
    limitations: [
      "The namespace rule runs through the alpha JavaScript-plugin runtime.",
    ],
  },
  solid: {
    support: "js-plugin",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["@eslint-react/eslint-plugin", "eslint-plugin-solid"],
    limitations: [
      "Solid's own rules and Solid-specific TypeScript disables are exported; React-specific disables are added only when React is enabled, while embedded React, JSX-a11y, and SSR presets are excluded and JavaScript-plugin rules cannot use TypeScript parser services.",
      "The @eslint-react package is loaded only for the React-disable fragment when React is also enabled.",
    ],
  },
  svelte: {
    support: "unsupported",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "The Oxlint factory does not expose Svelte because it cannot execute svelte-eslint-parser, the Svelte processor, or template rules.",
    ],
  },
  unocss: {
    support: "js-plugin",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["@unocss/eslint-plugin"],
    limitations: [
      "Rules use the alpha JavaScript-plugin runtime and do not add non-JavaScript template parsing.",
    ],
  },
  i18n: {
    support: "mixed",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["eslint-plugin-i18next"],
    limitations: [
      "The i18next no-literal-string rule runs on JavaScript and JSX through the alpha JavaScript-plugin runtime; locale JSON validation, translation-key path validation, and prefix checks require unsupported parsers or legacy plugin behavior and are omitted.",
    ],
  },
  security: {
    support: "js-plugin",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["eslint-plugin-security"],
    limitations: [
      "Rules use the alpha JavaScript-plugin runtime and are limited to its supported ESLint context APIs.",
    ],
  },
  tailwindcss: {
    support: "js-plugin",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "any",
      packages: ["tailwindcss"],
    },
    runtimePackages: ["eslint-plugin-better-tailwindcss"],
    limitations: [
      "Rules use the alpha JavaScript-plugin runtime; class extraction is limited to JavaScript-compatible syntax and root settings.",
    ],
  },
  query: {
    support: "js-plugin",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "any",
      packages: ["@tanstack/react-query", "@tanstack/solid-query"],
    },
    runtimePackages: ["@tanstack/eslint-plugin-query"],
    limitations: [
      "The ESLint factory currently composes Query only inside the Tailwind branch; JavaScript-plugin rules cannot use TypeScript parser services.",
    ],
  },
  astro: {
    support: "unsupported",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "The Oxlint factory does not expose Astro because it cannot execute astro-eslint-parser, the client-side TypeScript processor, or template rules.",
    ],
  },
  angular: {
    support: "mixed",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["@angular-eslint/eslint-plugin"],
    limitations: [
      "Angular TypeScript rules run through the alpha JavaScript-plugin runtime; external HTML templates, inline-template extraction, the Angular template parser, and template rules are unsupported and omitted.",
    ],
  },
  storybook: {
    support: "js-plugin",
    eslintDefault: "detected",
    detection: {
      kind: "package",
      match: "any",
      packages: [
        "@storybook/addon-a11y",
        "@storybook/addon-essentials",
        "@storybook/addon-interactions",
        "@storybook/addon-links",
        "@storybook/addon-storysource",
        "@storybook/blocks",
        "@storybook/nextjs",
        "@storybook/react",
        "@storybook/test",
      ],
    },
    runtimePackages: ["eslint-plugin-storybook"],
    limitations: [
      "Rules use the alpha JavaScript-plugin runtime; processor-dependent story formats are not supported.",
    ],
  },
  jsonc: {
    support: "unsupported",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Oxlint does not lint JSON, JSONC, or JSON5 files and cannot use jsonc-eslint-parser.",
    ],
  },
  sortPackageJson: {
    support: "unsupported",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Package sorting depends on JSONC parsing, which Oxlint does not support.",
    ],
  },
  sortTsconfig: {
    support: "unsupported",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Tsconfig sorting depends on JSONC parsing, which Oxlint does not support.",
    ],
  },
  pnpm: {
    support: "unsupported",
    eslintDefault: "detected",
    detection: {
      kind: "file",
      files: ["pnpm-workspace.yaml"],
    },
    runtimePackages: [],
    limitations: [
      "Pnpm rules target package JSON and workspace YAML, neither of which Oxlint parses.",
    ],
  },
  defaultImportName: {
    support: "js-plugin",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["eslint-plugin-default-import-name"],
    limitations: ["Rules use the alpha JavaScript-plugin runtime."],
  },
  jsdoc: {
    support: "mixed",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["eslint-plugin-jsdoc"],
    limitations: [
      "Implemented JSDoc rules run natively; missing rules use an aliased eslint-plugin-jsdoc fallback through the alpha JavaScript-plugin runtime.",
    ],
  },
  tsdoc: {
    support: "js-plugin",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: ["eslint-plugin-tsdoc"],
    limitations: ["The syntax rule uses the alpha JavaScript-plugin runtime."],
  },
  yaml: {
    support: "unsupported",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Oxlint does not lint YAML files and cannot use yaml-eslint-parser.",
    ],
  },
  toml: {
    support: "unsupported",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Oxlint does not lint TOML files and cannot use toml-eslint-parser.",
    ],
  },
  markdown: {
    support: "unsupported",
    eslintDefault: "enabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Oxlint cannot execute the Markdown processor, pass-through parser, or virtual fenced-code files.",
    ],
  },
  formatters: {
    support: "unsupported",
    eslintDefault: "disabled",
    detection: none,
    runtimePackages: [],
    limitations: [
      "Oxlint cannot execute eslint-plugin-format processors or format CSS, HTML, Markdown, GraphQL, SVG, or XML through lint rules.",
    ],
  },
  prettier: {
    support: "native",
    eslintDefault: "always",
    detection: none,
    runtimePackages: ["eslint-plugin-unicorn"],
    limitations: [
      "This preserves compatible rule disables only; it does not run Prettier or provide formatting parity.",
    ],
  },
  disables: {
    support: "mixed",
    eslintDefault: "always",
    detection: none,
    runtimePackages: [
      "@eslint-community/eslint-plugin-eslint-comments",
      "eslint-plugin-antfu",
      "eslint-plugin-unused-imports",
    ],
    limitations: [
      "File-scoped disables are retained only for rules present in the native or loaded JavaScript-plugin rule set.",
    ],
  },
} as const satisfies Record<string, OxlintCapability>;

export type EslintConfigProducer = keyof typeof oxlintCapabilities;
