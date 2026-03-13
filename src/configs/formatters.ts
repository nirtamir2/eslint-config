import type {
  OptionsFormatters,
  StylisticConfig,
  TypedFlatConfigItem,
} from "../types";
import type { VendoredPrettierOptions } from "../vender/prettier-types";
import { isPackageExists } from "local-pkg";
import {
  GLOB_ASTRO,
  GLOB_ASTRO_TS,
  GLOB_CSS,
  GLOB_GRAPHQL,
  GLOB_HTML,
  GLOB_LESS,
  GLOB_MARKDOWN,
  GLOB_POSTCSS,
  GLOB_SCSS,
  GLOB_SVG,
  GLOB_XML,
} from "../globs";
import {
  ensurePackages,
  interopDefault,
  isPackageInScope,
  parserPlain,
} from "../utils";
import { StylisticConfigDefaults } from "./stylistic";

function mergePrettierOptions<
  T extends Record<string, any> & { parser: string },
>(options: VendoredPrettierOptions, overrides: T): VendoredPrettierOptions & T {
  return {
    ...options,
    ...overrides,
    plugins: [
      ...(overrides.plugins || []),
      ...((options.plugins as Array<string>) || []),
    ],
  } as VendoredPrettierOptions & T;
}

export async function formatters(
  options: OptionsFormatters | true = {},
  stylistic: StylisticConfig = {},
): Promise<Array<TypedFlatConfigItem>> {
  if (options === true) {
    const isPrettierPluginXmlInScope = isPackageInScope("@prettier/plugin-xml");
    options = {
      astro: isPackageInScope("prettier-plugin-astro"),
      css: true,
      graphql: true,
      html: true,
      markdown: true,
      slidev: isPackageExists("@slidev/cli"),
      svg: isPrettierPluginXmlInScope,
      tailwindcss: isPackageExists("tailwindcss"),
      xml: isPrettierPluginXmlInScope,
    };
  }

  await ensurePackages([
    "eslint-plugin-format",
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-packagejson",
    options.tailwindcss ? "prettier-plugin-tailwindcss" : undefined,
    options.markdown && options.slidev ? "prettier-plugin-slidev" : undefined,
    options.astro ? "prettier-plugin-astro" : undefined,
    options.xml ? "@prettier/plugin-xml" : undefined,
  ]);

  if (
    options.slidev &&
    options.markdown !== true &&
    options.markdown !== "prettier"
  )
    throw new Error(
      "`slidev` option only works when `markdown` is enabled with `prettier`",
    );

  const { semi, indent, quotes } = {
    ...StylisticConfigDefaults,
    ...stylistic,
  };

  const prettierOptions: VendoredPrettierOptions = {
    printWidth: 120,
    tabWidth: typeof indent === "number" ? indent : 2,
    useTabs: indent === "tab",
    semi,
    singleQuote: quotes === "single",
    trailingComma: "all",
    endOfLine: "auto",
    ...options.prettierOptions,
  };

  const prettierXmlOptions: Partial<VendoredPrettierOptions> = {
    xmlQuoteAttributes: "double",
    xmlSelfClosingSpace: true,
    xmlSortAttributesByKey: false,
    xmlWhitespaceSensitivity: "ignore",
  };

  const dprintOptions = {
    indentWidth: typeof indent === "number" ? indent : 2,
    quoteStyle: quotes === "single" ? "preferSingle" : "preferDouble",
    useTabs: indent === "tab",
    ...(typeof options.dprintOptions === "object" ? options.dprintOptions : {}),
  };

  const pluginFormat = await interopDefault(import("eslint-plugin-format"));

  const configs: Array<TypedFlatConfigItem> = [
    {
      name: "antfu/formatter/setup",
      plugins: {
        format: pluginFormat,
      },
    },
  ];

  if (options.css) {
    configs.push(
      {
        files: [GLOB_CSS, GLOB_POSTCSS],
        languageOptions: {
          parser: parserPlain,
        },
        name: "antfu/formatter/css",
        rules: {
          "format/prettier": [
            "error",
            mergePrettierOptions(prettierOptions, {
              parser: "css",
            }),
          ],
        },
      },
      {
        files: [GLOB_SCSS],
        languageOptions: {
          parser: parserPlain,
        },
        name: "antfu/formatter/scss",
        rules: {
          "format/prettier": [
            "error",
            mergePrettierOptions(prettierOptions, {
              parser: "scss",
            }),
          ],
        },
      },
      {
        files: [GLOB_LESS],
        languageOptions: {
          parser: parserPlain,
        },
        name: "antfu/formatter/less",
        rules: {
          "format/prettier": [
            "error",
            mergePrettierOptions(prettierOptions, {
              parser: "less",
            }),
          ],
        },
      },
    );
  }

  if (options.html) {
    configs.push({
      files: [GLOB_HTML],
      languageOptions: {
        parser: parserPlain,
      },
      name: "antfu/formatter/html",
      rules: {
        "format/prettier": [
          "error",
          mergePrettierOptions(prettierOptions, {
            parser: "html",
          }),
        ],
      },
    });
  }

  if (options.xml) {
    configs.push({
      files: [GLOB_XML],
      languageOptions: {
        parser: parserPlain,
      },
      name: "antfu/formatter/xml",
      rules: {
        "format/prettier": [
          "error",
          mergePrettierOptions(
            { ...prettierXmlOptions, ...prettierOptions },
            {
              parser: "xml",
              plugins: ["@prettier/plugin-xml"],
            },
          ),
        ],
      },
    });
  }

  if (options.svg) {
    configs.push({
      files: [GLOB_SVG],
      languageOptions: {
        parser: parserPlain,
      },
      name: "antfu/formatter/svg",
      rules: {
        "format/prettier": [
          "error",
          mergePrettierOptions(
            { ...prettierXmlOptions, ...prettierOptions },
            {
              parser: "xml",
              plugins: ["@prettier/plugin-xml"],
            },
          ),
        ],
      },
    });
  }

  if (options.markdown) {
    const formater = options.markdown === true ? "prettier" : options.markdown;

    const GLOB_SLIDEV = options.slidev
      ? options.slidev === true
        ? ["**/slides.md"]
        : options.slidev.files
      : [];

    configs.push({
      files: [GLOB_MARKDOWN],
      ignores: GLOB_SLIDEV,
      languageOptions: {
        parser: parserPlain,
      },
      name: "antfu/formatter/markdown",
      rules: {
        [`format/${formater}`]: [
          "error",
          formater === "prettier"
            ? mergePrettierOptions(prettierOptions, {
                embeddedLanguageFormatting: "off",
                parser: "markdown",
              })
            : {
                ...dprintOptions,
                language: "markdown",
              },
        ],
      },
    });

    if (options.slidev) {
      configs.push({
        files: GLOB_SLIDEV,
        languageOptions: {
          parser: parserPlain,
        },
        name: "antfu/formatter/slidev",
        rules: {
          "format/prettier": [
            "error",
            mergePrettierOptions(prettierOptions, {
              embeddedLanguageFormatting: "off",
              parser: "slidev",
              plugins: ["prettier-plugin-slidev"],
            }),
          ],
        },
      });
    }
  }

  if (options.astro) {
    configs.push(
      {
        files: [GLOB_ASTRO],
        languageOptions: {
          parser: parserPlain,
        },
        name: "antfu/formatter/astro",
        rules: {
          "format/prettier": [
            "error",
            mergePrettierOptions(prettierOptions, {
              parser: "astro",
              plugins: ["prettier-plugin-astro"],
            }),
          ],
        },
      },
      {
        files: [GLOB_ASTRO, GLOB_ASTRO_TS],
        name: "antfu/formatter/astro/disables",
        rules: {
          "@stylistic/arrow-parens": "off",
          "@stylistic/block-spacing": "off",
          "@stylistic/comma-dangle": "off",
          "@stylistic/indent": "off",
          "@stylistic/no-multi-spaces": "off",
          "@stylistic/quotes": "off",
          "@stylistic/semi": "off",
        },
      },
    );
  }

  if (options.graphql) {
    configs.push({
      files: [GLOB_GRAPHQL],
      languageOptions: {
        parser: parserPlain,
      },
      name: "antfu/formatter/graphql",
      rules: {
        "format/prettier": [
          "error",
          mergePrettierOptions(prettierOptions, {
            parser: "graphql",
          }),
        ],
      },
    });
  }

  return configs;
}
