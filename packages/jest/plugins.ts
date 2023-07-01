import type { Config } from '@jest/types'
import type { PackageJson } from '@optimics/npm'

import { createRequire } from 'node:module'
import { existsSync } from 'fs'
import { join, resolve } from 'path'

type JestObjectSpec = string | [string, Record<string, unknown>]
type WatchPlugins = Array<string | JestObjectSpec>
type Transforms = Record<string, string | Config.TransformerConfig>

const pluginQueryCache: Record<string, boolean> = {}

function parsePluginName(pluginName: JestObjectSpec): string {
  return Array.isArray(pluginName) ? pluginName[0] : pluginName
}

function verifyPluginExistence(root: string, pluginName: string): boolean {
  const require = createRequire(`${root}/jest.config.js`)
  try {
    return Boolean(require.resolve(pluginName))
  } catch (_e) {
    return false
  }
}

export function testPluginExistence(root: string, pluginName: JestObjectSpec): boolean {
  const name = parsePluginName(pluginName)
  if (!(name in pluginQueryCache)) {
    pluginQueryCache[name] = verifyPluginExistence(root, name)
  }
  return pluginQueryCache[name]
}

export function getTransforms(pkg: PackageJson): Transforms {
  return Object.fromEntries(
    [
      ['\\.([cm]?[jt]sx?)$', ['babel-jest', { rootMode: 'upward' }]],
      ['\\.(svg)$', 'jest-svg-transformer'],
      ['\\.(svg)$', 'jest-transformer-svg'],
      ['\\.(css|styl|less|sass|scss)$', 'jest-css-modules-transform'],
    ].filter(([, transformModule]) => testPluginExistence(pkg.root, transformModule as JestObjectSpec))
  )
}

export function getWatchPlugins(pkg: PackageJson): WatchPlugins {
  return [
    ...[
      'jest-runner-eslint/watch-fix',
      'jest-watch-select-projects',
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname',
    ].filter(item => testPluginExistence(pkg.root, item)),
  ]
}

export function getSetupFiles(pkg: PackageJson): string[] {
  return [
    ...['jest-date-mock'].filter(item => testPluginExistence(pkg.root, item)),
    ...[
      resolve(pkg.path, '..', '..', 'jest.setup.js'),
      resolve(pkg.path, '..', 'jest.setup.js'),
      join(pkg.path, 'jest.setup.js'),
    ].filter(existsSync),
  ]
}

export function getSetupFilesAfterEnv(pkg: PackageJson): string[] {
  return [
    ...['jest-enzyme', 'jest-extended'].filter(item => testPluginExistence(pkg.root, item)),
    ...[
      resolve(pkg.path, '..', '..', 'jest.afterEnv.js'),
      resolve(pkg.path, '..', 'jest.afterEnv.js'),
      join(pkg.path, 'jest.afterEnv.js'),
    ].filter(existsSync),
  ]
}

export function setPluginEnvVars(pkg: PackageJson): void {
  if (testPluginExistence(pkg.root, 'jest-css-modules-transform')) {
    const configPath = join(pkg.root, 'jest.cssModules.cjs')
    if (existsSync(configPath)) {
      process.env.JEST_CSS_MODULES_TRANSFORM_CONFIG = configPath
    }
  }
}
