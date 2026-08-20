import type {
  OptionsAntiSlop,
  OptionsOverrides,
  TypedFlatConfigItem,
} from "../types";
import { GLOB_SRC } from "../globs";
import { antiSlopRuleNames } from "../oxlint-plugins/anti-slop-rule-names";
import { interopDefault } from "../utils";

/**
 * Dillon Mulroy's anti-slop rules, vendored from https://github.com/dmmulroy/anti-slop.
 *
 * The rules are authored against Oxlint's `createOnce` API and made ESLint-compatible by
 * the plugin's own `eslintCompatPlugin` wrapper, so the same implementations back both
 * `nirtamir2()` and the Oxlint config's `antiSlop` option.
 */
export async function antiSlop(
  options: OptionsAntiSlop & OptionsOverrides = {},
): Promise<Array<TypedFlatConfigItem>> {
  const { level = "error", files = [GLOB_SRC], overrides = {} } = options;

  // Imported lazily so the rule implementations stay out of the main entry's eager graph.
  const pluginAntiSlop = await interopDefault(
    import("../oxlint-plugins/anti-slop/index.ts"),
  );

  const rules: TypedFlatConfigItem["rules"] = Object.fromEntries(
    antiSlopRuleNames.map((ruleName) => [`anti-slop/${ruleName}`, level]),
  );

  return [
    {
      name: "nirtamir2/anti-slop/setup",
      plugins: {
        "anti-slop": pluginAntiSlop,
      },
    },
    {
      name: "nirtamir2/anti-slop/rules",
      files,
      rules: {
        ...rules,
        ...overrides,
      },
    },
  ];
}
