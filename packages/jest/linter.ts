import type { PackageJson } from '@optimics/npm'
import type { ProjectConfig } from './types'

import { testPluginExistence } from './plugins.js'
import { configureSuite } from './suite.js'

const testMatch = ['<rootDir>/**/*.{cjs,js,jsx,mjs}']

export function configureLinter(pkg: PackageJson): ProjectConfig | null {
  if (testPluginExistence(pkg.root, 'jest-runner-standard')) {
    return configureSuite(pkg, 'linter', {
      runner: 'jest-runner-standard',
      testMatch,
    })
  }
  if (testPluginExistence(pkg.root, 'jest-runner-eslint')) {
    return configureSuite(pkg, 'linter', {
      runner: 'jest-runner-eslint',
      testMatch,
    })
  }
  return null
}
