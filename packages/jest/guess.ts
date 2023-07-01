import type { ProjectConfig, SuiteConfig } from './types'
import type { PackageJson } from '@optimics/npm'

import { configureIntegration } from './integration.js'
import { configureLinter } from './linter.js'
import { setPluginEnvVars } from './plugins.js'
import { configureRoot } from './project.js'
import { getPackages, readPackageJson, urlToCwd } from '@optimics/npm'

function guessPackageProjects(pkg: PackageJson): ProjectConfig[] {
  const integration = configureIntegration(pkg)
  const linter = configureLinter(pkg)
  return [integration, linter].filter(Boolean) as ProjectConfig[]
}

export function guessProjectConfig(rootDir: string): SuiteConfig {
  const pkg = readPackageJson(rootDir)
  return configureRoot(pkg, guessPackageProjects(pkg))
}

export function guessRootConfig(path: string): SuiteConfig {
  const directory = urlToCwd(path)
  const rootPkg = readPackageJson(directory)
  const packages = getPackages(directory)
  const projects = packages.flatMap((pkg) => guessPackageProjects(pkg))
  const rootConfig = configureRoot(rootPkg, projects)
  setPluginEnvVars(rootPkg)
  return rootConfig
}
