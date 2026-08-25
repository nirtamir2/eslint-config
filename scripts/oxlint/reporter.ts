export const skippedRuleCategories = [
  "js-plugins",
  "not-implemented",
  "nursery",
  "type-aware",
  "unsupported",
] as const;

export type SkippedRuleCategory = (typeof skippedRuleCategories)[number];

export type SkippedRulesByCategory = Record<SkippedRuleCategory, Array<string>>;

export class MigrationReporter {
  private readonly skippedRules = Object.fromEntries(
    skippedRuleCategories.map((category) => [category, new Set<string>()]),
  ) as Record<SkippedRuleCategory, Set<string>>;

  private readonly warnings = new Set<string>();

  addWarning(message: string): void {
    this.warnings.add(message);
  }

  getSkippedRulesByCategory(): SkippedRulesByCategory {
    return Object.fromEntries(
      skippedRuleCategories.map((category) => [
        category,
        [...this.skippedRules[category]].toSorted((left, right) =>
          left.localeCompare(right),
        ),
      ]),
    ) as SkippedRulesByCategory;
  }

  getWarnings(): Array<string> {
    return [...this.warnings].toSorted((left, right) =>
      left.localeCompare(right),
    );
  }

  markSkipped(rule: string, category: SkippedRuleCategory): void {
    this.skippedRules[category].add(rule);
  }

  removeSkipped(rule: string, category: SkippedRuleCategory): void {
    this.skippedRules[category].delete(rule);
  }
}
