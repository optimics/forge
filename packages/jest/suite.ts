import type { ProjectConfig } from './types'
import type { PackageJson } from '@optimics/npm'

export function configureSuite(
  pkg: PackageJson,
  ident: string,
  config: ProjectConfig,
): ProjectConfig {
  return {
    displayName: getId(pkg, ident),
    id: getId(pkg, ident),
    rootDir: pkg.path,
    roots: ['<rootDir>'],
    moduleFileExtensions: [
      'cjs',
      'cjsx',
      'cts',
      'ctsx',
      'js',
      'json',
      'jsx',
      'mjs',
      'mjsx',
      'mts',
      'mtsx',
      'node',
      'ts',
      'tsx',
    ],
    testPathIgnorePatterns: [
      '/__fixtures__/',
      '/__samples__/',
      '/coverage/',
      '/node_modules/',
      '/<rootDir>\\/static/',
      '/<rootDir>\\/build/',
      '/dist/',
      '/.terraform/',
    ],
    ...config,
  }
}

function getId(pkg: PackageJson, specifier: string): string {
  return `${pkg.name}-${specifier}`
}
