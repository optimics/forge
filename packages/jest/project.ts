import type { ProjectConfig, SuiteConfig } from './types'
import type { PackageJson } from '@optimics/npm'

import { getWatchPlugins } from './plugins.js'

export function configureRoot(
  pkg: PackageJson,
  projects: ProjectConfig[],
): SuiteConfig {
  return {
    collectCoverageFrom: [
      '**/*.{cjs,js,jsx,mjs}',
      '**/*.{ts,tsx,cts,mts,ctsx,mtsx}',
      '!*.d.ts',
      '!**/__fixtures__/**',
      '!**/__samples__/**',
      '!**/__jest__/**',
      '!**/dist/**',
      '!**/static/**',
      '!**/coverage/**',
      '!**/scripts/**',
      '!jest.*',
    ],
    coverageProvider: 'v8',
    rootDir: pkg.path,
    projects,
    watchPlugins: getWatchPlugins(pkg),
  }
}
