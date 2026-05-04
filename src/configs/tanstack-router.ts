import { interopDefault } from '../utils'
import type { OptionsOverrides, TypedFlatConfigItem } from '../types'

export async function tanstackRouter(
  options: OptionsOverrides = {},
): Promise<TypedFlatConfigItem[]> {
  const {
    overrides = {},
  } = options

  const pluginRouter = await interopDefault(import('@tanstack/eslint-plugin-router'))
  const recommended = pluginRouter.configs['flat/recommended'] as TypedFlatConfigItem[]

  return recommended.map((config, index) => ({
    ...config,
    name: config.name ?? `nirtamir2/tanstack-router/${index === 0 ? 'rules' : `rules-${index}`}`,
    rules: {
      ...config.rules,
      ...overrides,
    },
  }))
}
