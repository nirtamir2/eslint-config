import type { Linter } from "eslint";
import type { TypedFlatConfigItem } from "../src";

// Make sure they are compatible
((): Linter.Config => {
  return {};
})();
((): TypedFlatConfigItem => {
  return {};
})();
